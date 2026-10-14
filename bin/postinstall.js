#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_FABLE_SKILLS_REPO = 'imMamdouhaboammar/get-fable';

const currentFile = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(currentFile), '..');

function safeRealpath(targetPath) {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return path.resolve(targetPath);
  }
}

function isValidOwnerRepoSpec(spec) {
  if (typeof spec !== 'string') return false;
  const trimmed = spec.trim();
  if (!trimmed || trimmed.startsWith('-') || trimmed.includes('..')) {
    return false;
  }
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(trimmed);
}

function extractOwnerRepoFromRepositoryUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (isValidOwnerRepoSpec(trimmed)) return trimmed;
  const match = trimmed.match(
    /github\.com[:/]([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git|\/.*)?$/i
  );
  if (match && match[1] && isValidOwnerRepoSpec(match[1])) {
    return match[1];
  }
  return null;
}

function resolveFableOwnerRepo(rootDir, env = process.env) {
  const envOverride = env.FABLE_SKILLS_REPO?.trim();
  if (envOverride) {
    if (isValidOwnerRepoSpec(envOverride)) return envOverride;
    const extracted = extractOwnerRepoFromRepositoryUrl(envOverride);
    if (extracted) return extracted;
    return DEFAULT_FABLE_SKILLS_REPO;
  }

  try {
    const pkgPath = path.join(rootDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (Array.isArray(pkg.skills) && typeof pkg.skills[0] === 'string') {
        const fromSkills = extractOwnerRepoFromRepositoryUrl(pkg.skills[0]);
        if (fromSkills) return fromSkills;
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
    // ignore
  }

  return DEFAULT_FABLE_SKILLS_REPO;
}

function resolvePostinstallWorkingDir(rootDir, env = process.env, cwd = process.cwd()) {
  const initCwd = env.INIT_CWD?.trim();
  if (initCwd && fs.existsSync(initCwd)) {
    return safeRealpath(initCwd);
  }

  for (const candidate of [cwd, rootDir]) {
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

function copyBundledSkillsFallback(rootDir, targetProjectDir) {
  const srcSkillsRoot = path.join(rootDir, 'skills');
  if (!fs.existsSync(srcSkillsRoot)) return 0;
  const destSkillsRoot = path.join(targetProjectDir, '.agents', 'skills');
  fs.mkdirSync(destSkillsRoot, { recursive: true });

  let installed = 0;
  const entries = fs.readdirSync(srcSkillsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const srcSkillDir = path.join(srcSkillsRoot, entry.name);
    const srcSkillMd = path.join(srcSkillDir, 'SKILL.md');
    if (!fs.existsSync(srcSkillMd)) continue;
    const destSkillDir = path.join(destSkillsRoot, entry.name);
    if (!fs.existsSync(path.join(destSkillDir, 'SKILL.md'))) {
      fs.cpSync(srcSkillDir, destSkillDir, { recursive: true, force: true });
      installed++;
    }
  }
  return installed;
}

const argv = process.argv.slice(2);
const force = argv.includes('--force');
const jsonMode = argv.includes('--json');
const noLocalFallback = argv.includes('--no-local-fallback');
const explicitGlobal = argv.includes('--global') || argv.includes('-g');
const repoFlagIdx = argv.indexOf('--repo');
const repoOverride =
  repoFlagIdx !== -1 && argv[repoFlagIdx + 1] ? argv[repoFlagIdx + 1] : undefined;

const env = process.env;
const targetDir = resolvePostinstallWorkingDir(packageRoot, env);
const realPackageRoot = safeRealpath(packageRoot);

const skippedByEnv =
  env.FABLE_SKIP_POSTINSTALL === '1' ||
  env.FABLE_SKIP_POSTINSTALL === 'true' ||
  env.FABLE_SKIP_SKILLS_INSTALL === '1' ||
  env.FABLE_SKIP_SKILLS_INSTALL === 'true';

const isGlobalInstall =
  explicitGlobal || env.npm_config_global === 'true' || env.npm_config_global === '1';
const insideNodeModules = realPackageRoot.split(path.sep).includes('node_modules');
const isSourceCheckout =
  !insideNodeModules &&
  !isGlobalInstall &&
  realPackageRoot === targetDir &&
  fs.existsSync(path.join(realPackageRoot, '.git')) &&
  fs.existsSync(path.join(realPackageRoot, 'src', 'cli.ts'));

const shouldForce =
  force ||
  env.FABLE_FORCE_POSTINSTALL_SKILLS === '1' ||
  env.FABLE_FORCE_POSTINSTALL_SKILLS === 'true';

const ownerRepo =
  repoOverride && isValidOwnerRepoSpec(repoOverride)
    ? repoOverride.trim()
    : resolveFableOwnerRepo(realPackageRoot, env);

const npxArgs = ['--yes', 'skills', 'add', ownerRepo, '-y'];
if (isGlobalInstall) {
  npxArgs.push('-g');
}
const commandStr = `npx ${npxArgs.join(' ')}`;

if (skippedByEnv || (isSourceCheckout && !shouldForce)) {
  const reason = skippedByEnv ? 'skipped_by_env' : 'source_repo_checkout';
  if (jsonMode) {
    console.log(
      JSON.stringify({
        status: 'skipped',
        reason,
        ownerRepo,
        command: commandStr,
        targetDir,
      })
    );
  }
  process.exit(0);
}

if (!jsonMode) {
  console.log(`[get-fable] Auto-installing skills via: ${commandStr}`);
}

const result = spawnSync('npx', npxArgs, {
  cwd: targetDir,
  env: {
    ...env,
    CI: env.CI || '1',
  },
  encoding: 'utf-8',
  stdio: jsonMode ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  timeout: 60_000,
});

if (result.status === 0 && !result.error) {
  if (!noLocalFallback && !isGlobalInstall) {
    try {
      copyBundledSkillsFallback(realPackageRoot, targetDir);
    } catch {
      // ignore supplementary local sync failure
    }
  }
  if (jsonMode) {
    console.log(
      JSON.stringify({
        status: 'installed',
        method: 'npx-skills-add',
        ownerRepo,
        command: commandStr,
        targetDir,
        exitCode: 0,
      })
    );
  }
  process.exit(0);
}

if (!noLocalFallback && !isGlobalInstall) {
  try {
    const count = copyBundledSkillsFallback(realPackageRoot, targetDir);
    if (count > 0) {
      if (jsonMode) {
        console.log(
          JSON.stringify({
            status: 'fallback-local',
            method: 'local-fallback',
            ownerRepo,
            command: commandStr,
            targetDir,
            installedCount: count,
            exitCode: 0,
          })
        );
      } else {
        console.warn(
          `[get-fable] npx skills add ${ownerRepo} was unavailable; installed ${count} bundled skills locally.`
        );
      }
      process.exit(0);
    }
  } catch {
    // ignore fallback error in postinstall
  }
}

if (jsonMode) {
  console.log(
    JSON.stringify({
      status: 'failed',
      method: 'none',
      ownerRepo,
      command: commandStr,
      targetDir,
      exitCode: result.status ?? 1,
    })
  );
} else {
  console.warn(
    `[get-fable] Automatic skill install skipped or failed. Run "npx skills add ${ownerRepo}" manually.`
  );
}
// Never fail npm install if npx network call fails in restricted/offline environments
process.exit(0);
