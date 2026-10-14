import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  assertValidVersion,
  fetchStableRelease,
  isNewerVersion as isReleaseNewerVersion,
} from './update/release-source.js';
import { isCacheFresh, readCache, writeCacheAtomic } from './update/cache.js';
import { detectInstallation } from './update/install-method.js';
import { planUpdate } from './update/planner.js';
import { executeUpdate } from './update/executor.js';
import { acquireUpdateLock, releaseUpdateLock } from './update/lock.js';
import { executeGitUpdate, preflightGitUpdate } from './update/git-strategy.js';
import type {
  FetchLike,
  InstallationInfo,
  ProcessRunner,
  UpdatePlan,
  UpdatePlanInput,
  UpdateReceipt,
} from './update/types.js';
import { logInfo, logSuccess, logError } from '../utils.js';

const RELEASES_URL = 'https://github.com/imMamdouhaboammar/get-fable/releases';
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_UPDATE_TIMEOUT_MS = 3000;
const UPDATE_CHANNELS = new Set<UpdateCheckResult['channel']>(['npm', 'github', 'local']);

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

export interface UpdateRuntimeDeps extends FetchLatestVersionDeps {
  run?: ProcessRunner;
  verifyInstalledVersion?: () => string;
  executablePath?: string;
  bunGlobalDir?: string;
  npmGlobalDir?: string;
  homebrewPrefix?: string;
  lockPath?: string;
  timeoutMs?: number;
}

export interface CreateUpdatePlanOptions {
  targetVersion?: string;
  targetKind?: UpdatePlanInput['targetKind'];
}

function defaultFetch(input: string, init?: Parameters<FetchLike>[1]) {
  return fetch(input, init);
}

function defaultProcessRunner(executable: string, argv: string[], options: { cwd?: string } = {}) {
  const result = spawnSync(executable, argv, {
    cwd: options.cwd,
    encoding: 'utf-8',
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function isValidUpdateCheckResult(value: unknown): value is UpdateCheckResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.currentVersion !== 'string' ||
    typeof candidate.latestVersion !== 'string' ||
    typeof candidate.updateAvailable !== 'boolean' ||
    !isCanonicalTimestamp(candidate.checkedAt) ||
    typeof candidate.channel !== 'string' ||
    !UPDATE_CHANNELS.has(candidate.channel as UpdateCheckResult['channel']) ||
    (candidate.changelogUrl !== undefined && typeof candidate.changelogUrl !== 'string')
  ) {
    return false;
  }

  try {
    assertValidVersion(candidate.currentVersion, 'cached current version');
    assertValidVersion(candidate.latestVersion, 'cached latest version');
    return true;
  } catch {
    return false;
  }
}

export function getUpdateCachePath(): string {
  return path.join(os.homedir(), '.fable', 'update', 'release.json');
}

export function getUpdateLockPath(): string {
  return path.join(os.homedir(), '.fable', 'update', 'update.lock');
}

export function readUpdateCache(cachePath = getUpdateCachePath()): UpdateCheckResult | null {
  const cached = readCache<unknown>(cachePath);
  return cached && isValidUpdateCheckResult(cached.value) ? cached.value : null;
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
  timeoutMs: number = DEFAULT_UPDATE_TIMEOUT_MS,
  deps: FetchLatestVersionDeps = {}
): Promise<UpdateCheckResult> {
  const now = deps.now ?? (() => new Date());

  if (currentVersion === 'unknown') {
    return {
      currentVersion,
      latestVersion: currentVersion,
      updateAvailable: false,
      checkedAt: now().toISOString(),
      channel: 'local',
    };
  }

  assertValidVersion(currentVersion, 'current version');

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
    const cached = readCache<unknown>(cachePath);
    if (cached && isCacheFresh(cached, now()) && isValidUpdateCheckResult(cached.value)) {
      return {
        ...cached.value,
        currentVersion,
        updateAvailable: isNewerVersion(currentVersion, cached.value.latestVersion),
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

function probePath(run: ProcessRunner, executable: string, argv: string[]): string | undefined {
  try {
    const result = run(executable, argv);
    if (result.status !== 0) return undefined;
    const value = result.stdout.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

export function detectCurrentInstallation(
  repoRoot: string,
  deps: UpdateRuntimeDeps = {}
): InstallationInfo {
  const executablePath = deps.executablePath ?? path.resolve(process.argv[1] || path.join(repoRoot, 'bin', 'get-fable.js'));

  if (fs.existsSync(path.join(repoRoot, '.git'))) {
    return {
      ...detectInstallation({
        executablePath,
        repoRoot,
        fileExists: fs.existsSync,
      }),
      packageRoot: repoRoot,
    };
  }

  const run = deps.run ?? defaultProcessRunner;
  const installation = detectInstallation({
    executablePath,
    repoRoot,
    bunGlobalDir: deps.bunGlobalDir ?? probePath(run, 'bun', ['pm', 'bin', '-g']),
    npmGlobalDir: deps.npmGlobalDir ?? probePath(run, 'npm', ['prefix', '-g']),
    homebrewPrefix: deps.homebrewPrefix ?? probePath(run, 'brew', ['--prefix']),
    fileExists: fs.existsSync,
  });

  return { ...installation, packageRoot: repoRoot };
}

export async function createUpdatePlan(
  currentVersion: string,
  repoRoot: string,
  options: CreateUpdatePlanOptions = {},
  deps: UpdateRuntimeDeps = {}
): Promise<UpdatePlan> {
  let targetVersion = options.targetVersion;
  let targetKind = options.targetKind;

  if (targetVersion) {
    assertValidVersion(targetVersion, 'target version');
    targetKind ??= 'explicit-version';
  } else {
    const check = await fetchLatestVersion(
      currentVersion,
      deps.timeoutMs ?? DEFAULT_UPDATE_TIMEOUT_MS,
      deps
    );
    targetVersion = check.latestVersion;
    targetKind = 'latest-stable';
  }

  return planUpdate({
    currentVersion,
    targetVersion,
    targetKind: targetKind ?? 'latest-stable',
    installation: detectCurrentInstallation(repoRoot, deps),
  });
}

function readPackageVersion(packageRoot: string): string {
  const raw = fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf-8');
  const parsed = JSON.parse(raw) as { version?: unknown };
  if (typeof parsed.version !== 'string') throw new Error('Installed package version is unavailable');
  assertValidVersion(parsed.version, 'installed package version');
  return parsed.version;
}

export function applyUpdatePlan(plan: UpdatePlan, deps: UpdateRuntimeDeps = {}): UpdateReceipt {
  const run = deps.run ?? defaultProcessRunner;
  const packageRoot = plan.installation.packageRoot ?? plan.installation.repoRoot;
  const verifyInstalledVersion = deps.verifyInstalledVersion ?? (() => {
    if (!packageRoot) throw new Error('Installed package root is unavailable');
    return readPackageVersion(packageRoot);
  });
  const lockPath = deps.lockPath ?? getUpdateLockPath();

  return executeUpdate(plan, {
    run,
    verifyInstalledVersion,
    acquireLock: (candidate) =>
      acquireUpdateLock(lockPath, candidate.targetVersion, candidate.installation.method),
    releaseLock: releaseUpdateLock,
    executeGitUpdate: (candidate) => {
      const repoRoot = candidate.installation.repoRoot;
      if (!repoRoot) {
        return {
          success: false,
          outcome: 'preflight-failure',
          strategy: 'git-checkout',
          targetVersion: candidate.targetVersion,
          message: 'Git checkout root is unavailable',
        };
      }
      const gitPlan = preflightGitUpdate(repoRoot, run);
      return executeGitUpdate(gitPlan, candidate.targetVersion, { run, verifyInstalledVersion });
    },
  });
}

export async function runAutoUpdate(
  currentVersion: string,
  repoRoot: string,
  force: boolean = false,
  deps: UpdateRuntimeDeps = {}
): Promise<{ success: boolean; message: string }> {
  logInfo(`Checking for get-fable updates (current: v${currentVersion})...`);
  const check = await fetchLatestVersion(
    currentVersion,
    deps.timeoutMs ?? DEFAULT_UPDATE_TIMEOUT_MS,
    deps
  );

  if (!check.updateAvailable && !force) {
    logSuccess(`get-fable is up to date (v${currentVersion}).`);
    return { success: true, message: `Already up to date (v${currentVersion})` };
  }

  if (check.updateAvailable) {
    logInfo(`New version available: v${check.latestVersion} (current: v${currentVersion})`);
  }

  const plan = await createUpdatePlan(
    currentVersion,
    repoRoot,
    { targetVersion: check.latestVersion, targetKind: 'latest-stable' },
    deps
  );
  const receipt = applyUpdatePlan(plan, deps);

  if (receipt.success) {
    logSuccess(receipt.message);
  } else {
    logError(receipt.message);
  }

  return { success: receipt.success, message: receipt.message };
}
