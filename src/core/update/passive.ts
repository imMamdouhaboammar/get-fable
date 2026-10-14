import { isCacheFresh, type CacheEnvelope } from './cache.js';
import { assertValidVersion, isNewerVersion } from './release-source.js';
import { decidePassiveCheck } from './policy.js';
import type { ReleaseMetadata } from './types.js';

const RELEASE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const RELEASES_URL = 'https://github.com/imMamdouhaboammar/get-fable/releases';

export interface PassiveUpdateAwarenessContext {
  currentVersion: string;
  command: string;
  autoCheck: boolean;
  isCI: boolean;
  isTTY: boolean;
  jsonMode: boolean;
  jsonV1Mode: boolean;
}

interface PassiveReleaseCacheValue {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  checkedAt: string;
  channel: 'npm';
  changelogUrl: string;
}

export interface PassiveUpdateAwarenessDeps {
  now: () => Date;
  readCache: () => CacheEnvelope<unknown> | null;
  writeCache: (cache: CacheEnvelope<PassiveReleaseCacheValue>) => void;
  fetchRelease: (currentVersion: string) => Promise<ReleaseMetadata>;
  notify: (message: string) => void;
}

export interface PassiveUpdateAwarenessResult {
  notified: boolean;
  reason: string;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function validCacheValue(value: unknown): value is PassiveReleaseCacheValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.currentVersion !== 'string' ||
    typeof candidate.latestVersion !== 'string' ||
    typeof candidate.updateAvailable !== 'boolean' ||
    !isIsoTimestamp(candidate.checkedAt) ||
    candidate.channel !== 'npm' ||
    typeof candidate.changelogUrl !== 'string'
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

function readValidatedCache(
  deps: PassiveUpdateAwarenessDeps
): CacheEnvelope<PassiveReleaseCacheValue> | null {
  try {
    const cache = deps.readCache();
    if (!cache || cache.schemaVersion !== 1 || !isIsoTimestamp(cache.fetchedAt) || !isIsoTimestamp(cache.expiresAt)) {
      return null;
    }
    if (!validCacheValue(cache.value)) return null;
    return cache as CacheEnvelope<PassiveReleaseCacheValue>;
  } catch {
    return null;
  }
}

export async function runPassiveUpdateAwareness(
  context: PassiveUpdateAwarenessContext,
  deps: PassiveUpdateAwarenessDeps
): Promise<PassiveUpdateAwarenessResult> {
  const now = deps.now();
  const cache = readValidatedCache(deps);
  const decision = decidePassiveCheck({
    autoCheck: context.autoCheck,
    cacheFresh: Boolean(cache && isCacheFresh(cache, now)),
    isCI: context.isCI,
    isTTY: context.isTTY,
    jsonMode: context.jsonMode,
    jsonV1Mode: context.jsonV1Mode,
    command: context.command,
  });

  if (!decision.allowed) {
    return { notified: false, reason: decision.reason };
  }

  try {
    const release = await deps.fetchRelease(context.currentVersion);
    const updateAvailable = isNewerVersion(context.currentVersion, release.version);
    const checkedAt = release.checkedAt;
    const cacheValue: PassiveReleaseCacheValue = {
      currentVersion: context.currentVersion,
      latestVersion: release.version,
      updateAvailable,
      checkedAt,
      channel: 'npm',
      changelogUrl: release.releaseUrl ?? release.notesUrl ?? RELEASES_URL,
    };
    try {
      deps.writeCache({
        schemaVersion: 1,
        fetchedAt: checkedAt,
        expiresAt: new Date(Date.parse(checkedAt) + RELEASE_CACHE_TTL_MS).toISOString(),
        value: cacheValue,
      });
    } catch {
      // Local cache persistence is best-effort for passive awareness.
    }

    if (!updateAvailable) return { notified: false, reason: 'up-to-date' };
    deps.notify(`Update available: get-fable v${release.version}. Run get-fable update.`);
    return { notified: true, reason: 'update-available' };
  } catch {
    return { notified: false, reason: 'release-unavailable' };
  }
}
