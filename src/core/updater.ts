import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { logInfo, logSuccess, logWarn, logError, colors } from '../utils.js';

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  checkedAt: string;
  channel: 'npm' | 'github' | 'local';
  changelogUrl?: string;
}

type BunSemverApi = {
  order(versionA: string, versionB: string): -1 | 0 | 1;
  satisfies(version: string, range: string): boolean;
};

function getBunSemver(): BunSemverApi {
  const bun = (globalThis as typeof globalThis & { Bun?: { semver?: BunSemverApi } }).Bun;
  if (!bun?.semver) {
    throw new Error('Bun semver API is unavailable');
  }
  return bun.semver;
}

export function getUpdateCachePath(): string {
  const dir = path.join(os.homedir(), '.fable');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'update-cache.json');
}

export function readUpdateCache(): UpdateCheckResult | null {
  try {
    const p = getUpdateCachePath();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

export function writeUpdateCache(cache: UpdateCheckResult) {
  try {
    const p = getUpdateCachePath();
    fs.writeFileSync(p, JSON.stringify(cache, null, 2), 'utf-8');
  } catch {
    // ignore cache write failures
  }
}

export async function fetchLatestVersion(
  currentVersion: string,
  timeoutMs: number = 3000
): Promise<UpdateCheckResult> {
  const result: UpdateCheckResult = {
    currentVersion,
    latestVersion: currentVersion,
    updateAvailable: false,
    checkedAt: new Date().toISOString(),
    channel: 'github',
    changelogUrl: 'https://github.com/imMamdouhaboammar/get-fable/releases',
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(
      'https://raw.githubusercontent.com/imMamdouhaboammar/get-fable/master/package.json',
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as { version?: string };
      if (data.version) {
        result.latestVersion = data.version;
        result.updateAvailable = isNewerVersion(currentVersion, data.version);
        writeUpdateCache(result);
        return result;
      }
    }
  } catch {
    // Network unreachable or timeout; fallback to cache
    const cached = readUpdateCache();
    if (cached) return { ...cached, currentVersion, updateAvailable: isNewerVersion(currentVersion, cached.latestVersion) };
  }

  return result;
}

function assertValidVersion(version: string): void {
  const semver = getBunSemver();
  if (!semver.satisfies(version, version)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
}

export function isNewerVersion(current: string, latest: string): boolean {
  const semver = getBunSemver();
  assertValidVersion(current);
  assertValidVersion(latest);
  return semver.order(latest, current) > 0;
}

export async function runAutoUpdate(
  currentVersion: string,
  repoRoot: string,
  force: boolean = false
): Promise<{ success: boolean; message: string }> {
  logInfo(`Checking for get-fable updates (current: v${currentVersion})...`);
  const check = await fetchLatestVersion(currentVersion);

  if (!check.updateAvailable && !force) {
    logSuccess(`get-fable is up to date (v${currentVersion}).`);
    return { success: true, message: `Already up to date (v${currentVersion})` };
  }

  if (check.updateAvailable) {
    logInfo(`New version available: v${check.latestVersion} (current: v${currentVersion})`);
  }

  const gitDir = path.join(repoRoot, '.git');
  if (fs.existsSync(gitDir)) {
    logInfo('Updating repository via git pull...');
    const pull = spawnSync('git', ['pull', '--ff-only'], { cwd: repoRoot, encoding: 'utf-8' });
    if (pull.status !== 0) {
      logError(`Git pull failed: ${pull.stderr || pull.stdout}`);
      return { success: false, message: 'Git pull failed' };
    }

    logInfo('Rebuilding bundle with Bun...');
    const build = spawnSync('bun', ['run', 'build'], { cwd: repoRoot, encoding: 'utf-8' });
    if (build.status !== 0) {
      logError(`Build failed: ${build.stderr || build.stdout}`);
      return { success: false, message: 'Rebuild failed after git pull' };
    }

    logSuccess(`Successfully updated get-fable to latest version!`);
    return { success: true, message: `Updated to latest version` };
  }

  logInfo('Updating global get-fable package via bun...');
  const bunInstall = spawnSync('bun', ['install', '-g', 'get-fable@latest'], { encoding: 'utf-8' });
  if (bunInstall.status === 0) {
    logSuccess(`Successfully updated get-fable to v${check.latestVersion}!`);
    return { success: true, message: `Updated to v${check.latestVersion}` };
  }

  return { success: false, message: 'Automatic update failed' };
}
