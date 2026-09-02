import type { FetchLike, ReleaseMetadata } from './types.js';

const NPM_PACKAGE_URL = 'https://registry.npmjs.org/get-fable';
const GITHUB_RELEASE_TAG_URL = 'https://api.github.com/repos/imMamdouhaboammar/get-fable/releases/tags/v';

type BunSemverApi = {
  order(versionA: string, versionB: string): -1 | 0 | 1;
  satisfies(version: string, range: string): boolean;
};

type NpmPackageMetadata = {
  'dist-tags'?: { latest?: unknown };
  versions?: Record<string, { dist?: { integrity?: unknown } }>;
};

type GitHubReleaseMetadata = {
  html_url?: unknown;
  published_at?: unknown;
};

export interface ReleaseSourceDeps {
  fetch: FetchLike;
  now: () => Date;
}

function getBunSemver(): BunSemverApi {
  const bun = (globalThis as typeof globalThis & { Bun?: { semver?: BunSemverApi } }).Bun;
  if (!bun?.semver) {
    throw new Error('Bun semver API is unavailable');
  }
  return bun.semver;
}

function assertValidVersion(version: string, label = 'semantic version'): void {
  const semver = getBunSemver();
  if (!semver.satisfies(version, version)) {
    throw new Error(`Invalid ${label}: ${version}`);
  }
}

export function isNewerVersion(current: string, latest: string): boolean {
  assertValidVersion(current);
  assertValidVersion(latest);
  return getBunSemver().order(latest, current) > 0;
}

async function fetchWithTimeout(
  deps: ReleaseSourceDeps,
  input: string,
  timeoutMs: number,
  headers?: Record<string, string>
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await deps.fetch(input, {
      signal: controller.signal,
      redirect: 'error',
      headers,
    });
  } finally {
    clearTimeout(timer);
  }
}

function readNpmLatest(metadata: unknown): { version: string; integrity?: string } {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Invalid npm registry metadata: expected an object');
  }

  const packageMetadata = metadata as NpmPackageMetadata;
  const latest = packageMetadata['dist-tags']?.latest;
  if (typeof latest !== 'string') {
    throw new Error('Invalid npm latest dist-tag: expected a string version');
  }

  assertValidVersion(latest, 'npm latest dist-tag');

  const integrity = packageMetadata.versions?.[latest]?.dist?.integrity;
  return {
    version: latest,
    ...(typeof integrity === 'string' ? { integrity } : {}),
  };
}

function enrichFromGitHub(result: ReleaseMetadata, metadata: unknown): ReleaseMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return result;
  }

  const release = metadata as GitHubReleaseMetadata;
  const releaseUrl = typeof release.html_url === 'string' ? release.html_url : undefined;
  const publishedAt = typeof release.published_at === 'string' ? release.published_at : undefined;

  return {
    ...result,
    ...(releaseUrl ? { releaseUrl, notesUrl: releaseUrl } : {}),
    ...(publishedAt ? { publishedAt } : {}),
  };
}

export async function fetchStableRelease(
  currentVersion: string,
  deps: ReleaseSourceDeps,
  timeoutMs = 3000
): Promise<ReleaseMetadata> {
  assertValidVersion(currentVersion, 'current version');

  const npmResponse = await fetchWithTimeout(deps, NPM_PACKAGE_URL, timeoutMs, {
    accept: 'application/vnd.npm.install-v1+json',
  });
  if (!npmResponse.ok) {
    throw new Error(`npm registry request failed with status ${npmResponse.status}`);
  }

  const npmMetadata = readNpmLatest(await npmResponse.json());
  let result: ReleaseMetadata = {
    version: npmMetadata.version,
    channel: 'stable',
    source: 'npm',
    checkedAt: deps.now().toISOString(),
    ...(npmMetadata.integrity ? { integrity: npmMetadata.integrity } : {}),
  };

  try {
    const githubResponse = await fetchWithTimeout(
      deps,
      `${GITHUB_RELEASE_TAG_URL}${encodeURIComponent(npmMetadata.version)}`,
      timeoutMs,
      { accept: 'application/vnd.github+json' }
    );
    if (githubResponse.ok) {
      result = enrichFromGitHub(result, await githubResponse.json());
    }
  } catch {
    // GitHub release data only enriches npm's authoritative stable result.
  }

  return result;
}
