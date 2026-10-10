import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { autoInstallSkills } from '../core/skill-installer.js';
import { logInfo, logSuccess, logWarn } from '../utils.js';

export const DEFAULT_FABLE_SKILLS_REPO = 'imMamdouhaboammar/get-fable';

export interface PostinstallCheckOptions {
  packageRoot?: string;
  targetDir?: string;
  env?: NodeJS.ProcessEnv;
  force?: boolean;
}

export interface PostinstallCheckDecision {
  shouldRun: boolean;
  reason: 'forced' | 'skipped_by_env' | 'source_repo_checkout' | 'npm_install';
}

export interface BuildNpxSkillsAddArgsOptions {
  ownerRepo: string;
  global?: boolean;
  yes?: boolean;
  copy?: boolean;
  agents?: string[];
  skills?: string[];
}

export interface SpawnRunnerResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

export type SpawnRunner = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
) => SpawnRunnerResult;

export interface RunNpxSkillsAddOptions {
  packageRoot?: string;
  targetDir?: string;
  ownerRepo?: string;
  global?: boolean;
  copy?: boolean;
  agents?: string[];
  skills?: string[];
  force?: boolean;
  silent?: boolean;
  fallbackToLocalSkills?: boolean;
  env?: NodeJS.ProcessEnv;
  spawnRunner?: SpawnRunner;
}

export interface RunNpxSkillsAddResult {
  status: 'installed' | 'fallback-local' | 'skipped' | 'failed';
  method: 'npx-skills-add' | 'local-fallback' | 'none';
  ownerRepo: string;
  command: string;
  args: string[];
  targetDir: string;
  exitCode: number;
  reason?: string;
  stdout?: string;
  stderr?: string;
}

function getDefaultPackageRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..', '..');
}

function safeRealpath(targetPath: string): string {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return path.resolve(targetPath);
  }
}

/**
 * Validates that an `<owner/repo>` or `<owner/repo/subpath>` identifier is safe
 * and free of CLI flags, shell metacharacters, or path traversal segments.
 */
export function isValidOwnerRepoSpec(spec: string): boolean {
  const trimmed = spec.trim();
  if (!trimmed || trimmed.startsWith('-') || trimmed.includes('..')) {
    return false;
  }
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(trimmed);
}

/**
 * Extracts `<owner>/<repo>` from a GitHub repository URL or shorthand string.
 */
export function extractOwnerRepoFromRepositoryUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (isValidOwnerRepoSpec(trimmed)) {
    return trimmed;
  }

  const githubMatch = trimmed.match(
    /github\.com[:/]([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git|\/.*)?$/i
  );
  if (githubMatch && githubMatch[1] && isValidOwnerRepoSpec(githubMatch[1])) {
    return githubMatch[1];
  }

  return null;
}

/**
 * Resolves the canonical `<owner/repo>` for `npx skills add <owner/repo>`.
 * Priority:
 * 1. `FABLE_SKILLS_REPO` environment variable (if valid)
 * 2. `package.json` (`skills[0]` or `repository.url`)
 * 3. `skills.sh.json` (`repository`)
 * 4. `DEFAULT_FABLE_SKILLS_REPO` (`imMamdouhaboammar/get-fable`)
 */
export function resolveFableOwnerRepo(
  packageRoot: string = getDefaultPackageRoot(),
  env: NodeJS.ProcessEnv = process.env
): string {
  const envOverride = env.FABLE_SKILLS_REPO?.trim();
  if (envOverride) {
    if (isValidOwnerRepoSpec(envOverride)) {
      return envOverride;
    }
    const extractedEnv = extractOwnerRepoFromRepositoryUrl(envOverride);
    if (extractedEnv) return extractedEnv;
    return DEFAULT_FABLE_SKILLS_REPO;
  }

  try {
    const pkgPath = path.join(packageRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
        skills?: unknown[];
        repository?: string | { url?: string };
      };
      if (Array.isArray(pkg.skills) && typeof pkg.skills[0] === 'string') {
        const fromSkillsField = extractOwnerRepoFromRepositoryUrl(pkg.skills[0]);
        if (fromSkillsField) return fromSkillsField;
      }
      const repoUrl =
        typeof pkg.repository === 'string'
          ? pkg.repository
          : typeof pkg.repository?.url === 'string'
            ? pkg.repository.url
            : '';
      const extracted = extractOwnerRepoFromRepositoryUrl(repoUrl);
      if (extracted) return extracted;
    }
  } catch {
    // Fall through to skills.sh.json / default
  }

  try {
    const skillsShPath = path.join(packageRoot, 'skills.sh.json');
    if (fs.existsSync(skillsShPath)) {
      const skillsSh = JSON.parse(fs.readFileSync(skillsShPath, 'utf-8')) as {
        repository?: string;
      };
      if (typeof skillsSh.repository === 'string') {
        const extracted = extractOwnerRepoFromRepositoryUrl(skillsSh.repository);
        if (extracted) return extracted;
      }
    }
  } catch {
    // Fall through to default
  }

  return DEFAULT_FABLE_SKILLS_REPO;
}

/**
 * Resolves the consumer project directory during `npm i get-fable` postinstall.
 * Prefers `INIT_CWD` set by npm/bun, or walks out of `<project>/node_modules/get-fable`.
 */
export function resolvePostinstallWorkingDir(
  packageRoot: string = getDefaultPackageRoot(),
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd()
): string {
  const initCwd = env.INIT_CWD?.trim();
  if (initCwd && fs.existsSync(initCwd)) {
    return safeRealpath(initCwd);
  }

  for (const candidate of [cwd, packageRoot]) {
    const resolved = safeRealpath(candidate);
    const parts = resolved.split(path.sep);
    const nodeModulesIdx = parts.lastIndexOf('node_modules');
    if (nodeModulesIdx > 0) {
      const consumerRoot = parts.slice(0, nodeModulesIdx).join(path.sep) || path.sep;
      if (fs.existsSync(consumerRoot)) {
        return safeRealpath(consumerRoot);
      }
    }
  }

  return safeRealpath(cwd);
}

/**
 * Determines whether automatic `npx skills add <owner/repo>` should execute during `postinstall`.
 */
export function shouldRunNpmPostinstallSkills(
  options: PostinstallCheckOptions = {}
): PostinstallCheckDecision {
  const env = options.env ?? process.env;
  const packageRoot = safeRealpath(options.packageRoot ?? getDefaultPackageRoot());
  const targetDir = safeRealpath(
    options.targetDir ?? resolvePostinstallWorkingDir(packageRoot, env)
  );

  if (
    env.FABLE_SKIP_POSTINSTALL === '1' ||
    env.FABLE_SKIP_POSTINSTALL === 'true' ||
    env.FABLE_SKIP_SKILLS_INSTALL === '1' ||
    env.FABLE_SKIP_SKILLS_INSTALL === 'true'
  ) {
    return { shouldRun: false, reason: 'skipped_by_env' };
  }

  if (
    options.force ||
    env.FABLE_FORCE_POSTINSTALL_SKILLS === '1' ||
    env.FABLE_FORCE_POSTINSTALL_SKILLS === 'true'
  ) {
    return { shouldRun: true, reason: 'forced' };
  }

  const isGlobalInstall = env.npm_config_global === 'true' || env.npm_config_global === '1';
  const insideNodeModules = packageRoot.split(path.sep).includes('node_modules');
  const isSourceCheckout =
    !insideNodeModules &&
    !isGlobalInstall &&
    packageRoot === targetDir &&
    fs.existsSync(path.join(packageRoot, '.git')) &&
    fs.existsSync(path.join(packageRoot, 'src', 'cli.ts'));

  if (isSourceCheckout) {
    return { shouldRun: false, reason: 'source_repo_checkout' };
  }

  return { shouldRun: true, reason: 'npm_install' };
}

/**
 * Builds the non-interactive CLI argument list for `npx skills add <owner/repo>`.
 */
export function buildNpxSkillsAddArgs(options: BuildNpxSkillsAddArgsOptions): string[] {
  const ownerRepo = isValidOwnerRepoSpec(options.ownerRepo)
    ? options.ownerRepo.trim()
    : DEFAULT_FABLE_SKILLS_REPO;
  const args: string[] = ['--yes', 'skills', 'add', ownerRepo];

  if (options.yes !== false) {
    args.push('-y');
  }
  if (options.global) {
    args.push('-g');
  }
  if (options.copy) {
    args.push('--copy');
  }
  if (options.agents && options.agents.length > 0) {
    args.push('-a', ...options.agents);
  }
  if (options.skills && options.skills.length > 0) {
    args.push('-s', ...options.skills);
  }

  return args;
}

const defaultSpawnRunner: SpawnRunner = (command, args, options) => {
  const res = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000,
  });
  return {
    status: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    error: res.error,
  };
};

/**
 * Automatically installs get-fable skills via `npx skills add <owner/repo>`
 * with a resilient local fallback to the bundled `skills/` directory.
 */
export function runNpxSkillsAdd(options: RunNpxSkillsAddOptions = {}): RunNpxSkillsAddResult {
  const env = options.env ?? process.env;
  const packageRoot = safeRealpath(options.packageRoot ?? getDefaultPackageRoot());
  const targetDir = safeRealpath(
    options.targetDir ?? resolvePostinstallWorkingDir(packageRoot, env)
  );
  const ownerRepo = options.ownerRepo
    ? isValidOwnerRepoSpec(options.ownerRepo)
      ? options.ownerRepo.trim()
      : DEFAULT_FABLE_SKILLS_REPO
    : resolveFableOwnerRepo(packageRoot, env);
  const isGlobal =
    options.global ?? (env.npm_config_global === 'true' || env.npm_config_global === '1');
  const args = buildNpxSkillsAddArgs({
    ownerRepo,
    global: isGlobal,
    yes: true,
    copy: options.copy,
    agents: options.agents,
    skills: options.skills,
  });
  const commandStr = `npx ${args.join(' ')}`;

  const decision = shouldRunNpmPostinstallSkills({
    packageRoot,
    targetDir,
    env,
    force: options.force,
  });

  if (!decision.shouldRun) {
    return {
      status: 'skipped',
      method: 'none',
      ownerRepo,
      command: commandStr,
      args,
      targetDir,
      exitCode: 0,
      reason: decision.reason,
    };
  }

  if (!options.silent) {
    logInfo(`[get-fable] Installing skills via: ${commandStr}`);
  }

  const runner = options.spawnRunner ?? defaultSpawnRunner;
  const spawnResult = runner('npx', args, {
    cwd: targetDir,
    env: {
      ...env,
      CI: env.CI || '1',
    },
  });

  const fallbackEnabled = options.fallbackToLocalSkills !== false;

  if (spawnResult.status === 0 && !spawnResult.error) {
    // Also ensure all canonical bundled skills are present locally if fallback is enabled
    if (fallbackEnabled) {
      try {
        autoInstallSkills({
          packOrSkill: 'all',
          platforms: isGlobal ? ['all'] : ['project'],
          global: isGlobal,
          repoRoot: packageRoot,
          projectDir: targetDir,
          overwrite: false,
        });
      } catch {
        // Ignore supplementary local sync errors when npx succeeded
      }
    }
    if (!options.silent) {
      logSuccess(`[get-fable] Successfully installed skills from ${ownerRepo}`);
    }
    return {
      status: 'installed',
      method: 'npx-skills-add',
      ownerRepo,
      command: commandStr,
      args,
      targetDir,
      exitCode: 0,
      stdout: spawnResult.stdout,
      stderr: spawnResult.stderr,
    };
  }

  if (fallbackEnabled) {
    try {
      const localResult = autoInstallSkills({
        packOrSkill: 'all',
        platforms: isGlobal ? ['all'] : ['project'],
        global: isGlobal,
        repoRoot: packageRoot,
        projectDir: targetDir,
        overwrite: true,
      });
      if (localResult.success) {
        if (!options.silent) {
          logWarn(
            `[get-fable] npx skills add ${ownerRepo} was unavailable; installed ${localResult.totalInstalled} bundled skills locally.`
          );
        }
        return {
          status: 'fallback-local',
          method: 'local-fallback',
          ownerRepo,
          command: commandStr,
          args,
          targetDir,
          exitCode: 0,
          stdout: spawnResult.stdout,
          stderr: spawnResult.stderr,
        };
      }
    } catch {
      // Fall through to failed status
    }
  }

  if (!options.silent) {
    logWarn(
      `[get-fable] Could not run "${commandStr}". You can run "npx skills add ${ownerRepo}" manually.`
    );
  }

  return {
    status: 'failed',
    method: 'none',
    ownerRepo,
    command: commandStr,
    args,
    targetDir,
    exitCode: spawnResult.status ?? 1,
    stdout: spawnResult.stdout,
    stderr: spawnResult.stderr,
  };
}
