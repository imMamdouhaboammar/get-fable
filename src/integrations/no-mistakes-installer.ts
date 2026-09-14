import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  getClaudeDir,
  getCodexDir,
  getCursorDir,
  getGeminiConfigDir,
  getAgentKernelDir,
  logInfo,
  logSuccess,
  logWarn,
  logError,
} from '../utils.js';

export interface NoMistakesStatus {
  installed: boolean;
  version?: string;
  binaryPath?: string;
  daemonRunning?: boolean;
  latestVersion?: string;
  updateAvailable?: boolean;
}

export function getRepoRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..', '..');
}

/**
 * Searches and resolves the latest release version of no-mistakes from GitHub.
 */
export async function resolveLatestNoMistakesRelease(): Promise<string | null> {
  try {
    const res = await fetch('https://api.github.com/repos/kunchenguid/no-mistakes/releases/latest', {
      headers: { 'User-Agent': 'get-fable-installer' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = (await res.json()) as { tag_name?: string };
      if (data.tag_name) {
        return data.tag_name.trim();
      }
    }
  } catch {}

  // Fallback via curl redirect resolution
  try {
    const output = execSync(
      "curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/kunchenguid/no-mistakes/releases/latest",
      { encoding: 'utf-8', timeout: 4000 }
    ).trim();
    const match = output.match(/\/tag\/([^/?#]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch {}

  return null;
}

/**
 * Finds the no-mistakes binary location on the local system.
 */
export function findNoMistakesBinary(): string | null {
  const candidates = [
    path.join(os.homedir(), '.local', 'bin', 'no-mistakes'),
    path.join(os.homedir(), '.no-mistakes', 'bin', 'no-mistakes'),
    '/usr/local/bin/no-mistakes',
    '/opt/homebrew/bin/no-mistakes',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  try {
    const bin = execSync('which no-mistakes', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 2000 }).trim();
    if (bin && fs.existsSync(bin)) return bin;
  } catch {}

  return null;
}

/**
 * Checks instantaneously if no-mistakes daemon is currently running.
 */
export function isNoMistakesDaemonRunning(): boolean {
  try {
    const pidFile = path.join(os.homedir(), '.no-mistakes', 'daemon.pid');
    const socketFile = path.join(os.homedir(), '.no-mistakes', 'socket');
    if (!fs.existsSync(pidFile) || !fs.existsSync(socketFile)) return false;
    const content = fs.readFileSync(pidFile, 'utf-8');
    const parsed = JSON.parse(content);
    if (parsed.pid && typeof parsed.pid === 'number') {
      process.kill(parsed.pid, 0);
      return true;
    }
  } catch {}
  return false;
}

/**
 * Inspects current no-mistakes installation status, binary version, and daemon health.
 */
export async function checkNoMistakesStatus(options?: { checkLatest?: boolean }): Promise<NoMistakesStatus> {
  const binaryPath = findNoMistakesBinary();
  if (!binaryPath) {
    let latestVersion: string | undefined;
    if (options?.checkLatest) {
      const resolved = await resolveLatestNoMistakesRelease();
      if (resolved) latestVersion = resolved;
    }
    return { installed: false, latestVersion };
  }

  let version: string | undefined;
  try {
    const verOutput = execSync(`"${binaryPath}" --version`, { encoding: 'utf-8', timeout: 3000 }).trim();
    const verMatch = verOutput.match(/v[0-9]+\.[0-9]+\.[0-9]+/);
    if (verMatch) version = verMatch[0];
  } catch {}

  const daemonRunning = isNoMistakesDaemonRunning();

  let latestVersion: string | undefined;
  let updateAvailable = false;
  if (options?.checkLatest) {
    const resolved = await resolveLatestNoMistakesRelease();
    if (resolved) {
      latestVersion = resolved;
      if (version && resolved !== version) {
        updateAvailable = true;
      }
    }
  }

  return {
    installed: true,
    version,
    binaryPath,
    daemonRunning,
    latestVersion,
    updateAvailable,
  };
}

/**
 * Installs or updates no-mistakes to the latest release using the official upstream installer.
 */
export function installOrUpdateNoMistakes(options?: { silent?: boolean }): boolean {
  if (!options?.silent) {
    logInfo('Installing/Updating no-mistakes to the latest release from https://github.com/kunchenguid/no-mistakes...');
  }

  try {
    const cmd = 'curl -fsSL https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/install.sh | sh';
    execSync(cmd, { stdio: options?.silent ? 'ignore' : 'inherit', timeout: 60000 });
    if (!options?.silent) {
      logSuccess('no-mistakes binary installed successfully');
    }
    return true;
  } catch (err) {
    if (!options?.silent) {
      logError(`Failed to install no-mistakes: ${err instanceof Error ? err.message : String(err)}`);
    }
    return false;
  }
}

/**
 * Configures the collaborative agent ecosystem for no-mistakes:
 * - Installs the `/no-mistakes` skill across Claude, Codex, Agent Kernel, Gemini/Antigravity, and Cursor.
 * - Sets up git aliases (`git pnm`, `git push-nm`).
 * - Starts daemon if not already running.
 */
export function configureNoMistakesEcosystem(options?: { silent?: boolean }): void {
  const repoRoot = getRepoRoot();
  const templateSkillPath = path.join(repoRoot, 'templates', 'no-mistakes', 'SKILL.md');
  let skillContent = '';

  if (fs.existsSync(templateSkillPath)) {
    skillContent = fs.readFileSync(templateSkillPath, 'utf-8');
  }

  if (skillContent) {
    const skillTargets = [
      path.join(getClaudeDir(), 'skills', 'no-mistakes', 'SKILL.md'),
      path.join(getCodexDir(), 'skills', 'no-mistakes', 'SKILL.md'),
      path.join(getCursorDir(), 'skills', 'no-mistakes', 'SKILL.md'),
      path.join(getGeminiConfigDir(), 'skills', 'no-mistakes', 'SKILL.md'),
      path.join(getAgentKernelDir(), 'skills', 'no-mistakes', 'SKILL.md'),
      path.join(os.homedir(), '.agents', 'skills', 'no-mistakes', 'SKILL.md'),
    ];

    for (const target of skillTargets) {
      try {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, skillContent, 'utf-8');
      } catch {}
    }

    // Cursor rule for auto-activation
    const cursorRulePath = path.join(getCursorDir(), 'rules', 'no-mistakes.mdc');
    const cursorRuleContent = `---
description: Default AI validation pipeline and Git push gate using no-mistakes
globs: *
alwaysApply: true
---

# no-mistakes AI Quality Gate & Push Protocol

Use \`no-mistakes\` as the default quality gate and Git push mechanism for all code changes.

## Core Rules

- **Default Push Target**: When pushing code or opening PRs, push to \`no-mistakes\` instead of \`origin\` (\`git push no-mistakes\`).
- **Autonomous Agent Gating**: Use \`/no-mistakes\` or \`no-mistakes axi run\` to validate commits through automated review, tests, lint, documentation, and CI before remote merging.
- **Do Not Push Directly**: Never bypass the gate with \`git push origin\` unless explicitly instructed by the user.
- **Handle Approval Gates**: On \`gate:\` prompts during \`axi run\`, auto-fix safe findings (\`no-mistakes axi respond --action fix --findings <ids>\`) and escalate \`ask-user\` findings directly to the user.
`;
    try {
      fs.mkdirSync(path.dirname(cursorRulePath), { recursive: true });
      fs.writeFileSync(cursorRulePath, cursorRuleContent, 'utf-8');
    } catch {}

    if (!options?.silent) {
      logSuccess('Distributed /no-mistakes skill and Cursor rules across all agent platforms');
    }
  }

  // Setup git aliases if git is installed
  try {
    execSync('git config --global alias.pnm "push no-mistakes"', { stdio: 'ignore' });
    execSync('git config --global alias.push-nm "push no-mistakes"', { stdio: 'ignore' });
    if (!options?.silent) {
      logSuccess('Configured global git aliases: git pnm, git push-nm');
    }
  } catch {}

  // Start daemon if not running
  if (!isNoMistakesDaemonRunning()) {
    const binary = findNoMistakesBinary();
    if (binary) {
      try {
        spawnSync(binary, ['daemon', 'start'], { stdio: 'ignore', timeout: 5000 });
        if (!options?.silent) {
          logSuccess('no-mistakes daemon started');
        }
      } catch {}
    }
  }
}

/**
 * Initializes no-mistakes gate in a project if it is a git repository with an origin remote.
 */
export function initProjectNoMistakes(projectDir: string = process.cwd(), options?: { silent?: boolean }): boolean {
  const binary = findNoMistakesBinary();
  if (!binary) return false;

  const gitDir = path.join(projectDir, '.git');
  if (!fs.existsSync(gitDir)) return false;

  try {
    const remotes = execSync('git remote', { cwd: projectDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    if (!remotes.includes('origin')) return false;

    if (!remotes.includes('no-mistakes')) {
      if (!options?.silent) {
        logInfo(`Initializing no-mistakes gate in repository: ${projectDir}`);
      }
      execSync(`"${binary}" init`, { cwd: projectDir, stdio: options?.silent ? 'ignore' : 'inherit', timeout: 15000 });
      if (!options?.silent) {
        logSuccess('Initialized no-mistakes remote gate in repository');
      }
      return true;
    }
  } catch {}

  return false;
}

/**
 * Master workflow that ensures no-mistakes is installed with the latest version,
 * configured across agent platforms, and optionally initialized in the current project.
 */
export async function ensureNoMistakesInstalled(options?: {
  forceUpdate?: boolean;
  projectDir?: string;
  silent?: boolean;
}): Promise<NoMistakesStatus> {
  const status = await checkNoMistakesStatus({ checkLatest: true });

  if (!status.installed || status.updateAvailable || options?.forceUpdate) {
    installOrUpdateNoMistakes({ silent: options?.silent });
  }

  configureNoMistakesEcosystem({ silent: options?.silent });

  if (options?.projectDir) {
    initProjectNoMistakes(options.projectDir, { silent: options?.silent });
  }

  return await checkNoMistakesStatus();
}
