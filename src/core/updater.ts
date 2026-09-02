import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fetchStableRelease, isNewerVersion as isReleaseNewerVersion } from './update/release-source.js';
import { readCache, writeCacheAtomic } from './update/cache.js';
import type { FetchLike } from './update/types.js';
import { logInfo, logSuccess, logWarn, logError, colors } from '../utils.js';

const RELEASES_URL = 'https://github.com/imMamdouhaboammar/get-fable/releases';
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  checkedAt: string;
  channel: 'npm' | 'github' | 'local';
  changelogUrl?: string;
}

export interface FetchLatestVersionDeps {
  fetch?: FetchLike;
  now?: () => Date;
  cachePath?: string;
}

function defaultFetch(input: string, init?: Parameters<FetchLike>[1]) {
  return fetch(input, init);
}

export function getUpdateCachePath(): string {
  const dir = path.join(os.homedir(), '.fable', 'update');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'release.json');
}

export function readUpdateCache(cachePath = getUpdateCachePath()): UpdateCheckResult | null {
  return readCache<UpdateCheckResult>(cachePath)?.value ?? null;
}

export function writeUpdateCache(
  cache: UpdateCheckResult,
  cachePath = getUpdateCachePath(),
  ttlMs = DEFAULT_CACHE_TTL_MS
): void {
  try {
    const fetchedAtMs = Date.parse(cache.checkedAt);
    const baseTime = Number.isFinite(fetchedAtMs) ? fetchedAtMs : Date.now();
    writeCacheAtomic(cachePath, {
      schemaVersion: 1,
      fetchedAt: new Date(baseTime).toISOString(),
      expiresAt: new Date(baseTime + ttlMs).toISOString(),
      value: cache,
    });
  } catch {
    // Cache persistence is best-effort and must not fail an explicit update check.
  }
}

export async function fetchLatestVersion(
  currentVersion: string,
  timeoutMs: number = 3000,
  deps: FetchLatestVersionDeps = {}
): Promise<UpdateCheckResult> {
  const now = deps.now ?? (() => new Date());
  const cachePath = deps.cachePath ?? getUpdateCachePath();

  try {
    const release = await fetchStableRelease(
      currentVersion,
      {
        fetch: deps.fetch ?? defaultFetch,
        now,
      },
      timeoutMs
    );

    const result: UpdateCheckResult = {
      currentVersion,
      latestVersion: release.version,
      updateAvailable: isNewerVersion(currentVersion, release.version),
      checkedAt: release.checkedAt,
      channel: 'npm',
      changelogUrl: release.releaseUrl ?? release.notesUrl ?? RELEASES_URL,
    };

    writeUpdateCache(result, cachePath);
    return result;
  } catch {
    const cached = readUpdateCache(cachePath);
    if (cached) {
      return {
        ...cached,
        currentVersion,
        updateAvailable: isNewerVersion(currentVersion, cached.latestVersion),
      };
    }

    return {
      currentVersion,
      latestVersion: currentVersion,
      updateAvailable: false,
      checkedAt: now().toISOString(),
      channel: 'npm',
      changelogUrl: RELEASES_URL,
    };
  }
}

export function isNewerVersion(current: string, latest: string): boolean {
  return isReleaseNewerVersion(current, latest);
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
