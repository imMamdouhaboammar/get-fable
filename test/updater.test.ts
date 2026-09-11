import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';
import { fetchLatestVersion, isNewerVersion } from '../src/core/updater.ts';

const tempDirs: string[] = [];

function tempCachePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-updater-facade-'));
  tempDirs.push(dir);
  return path.join(dir, 'release.json');
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('Auto-Updater Module', () => {
  test('correctly compares semantic versions', () => {
    expect(isNewerVersion('1.2.0', '1.2.1')).toBe(true);
    expect(isNewerVersion('1.2.0', '1.3.0')).toBe(true);
    expect(isNewerVersion('1.2.0', '2.0.0')).toBe(true);
    expect(isNewerVersion('1.2.0', '1.2.0')).toBe(false);
    expect(isNewerVersion('1.2.1', '1.2.0')).toBe(false);
  });

  test('orders prereleases before the corresponding stable release', () => {
    expect(isNewerVersion('1.6.0-rc.1', '1.6.0')).toBe(true);
    expect(isNewerVersion('1.6.0', '1.6.0-rc.1')).toBe(false);
  });

  test('rejects invalid semantic versions instead of coercing them', () => {
    expect(() => isNewerVersion('not-a-version', '1.6.0')).toThrow();
    expect(() => isNewerVersion('1.6.0', 'still-not-a-version')).toThrow();
  });

  test('rejects an invalid current version instead of converting it to a no-update result', async () => {
    let fetchCalled = false;

    await expect(
      fetchLatestVersion('not-a-version', 100, {
        cachePath: tempCachePath(),
        now: () => new Date('2026-08-28T20:00:00.000Z'),
        fetch: async () => {
          fetchCalled = true;
          throw new Error('network should not be reached');
        },
      })
    ).rejects.toThrow(/invalid/i);

    expect(fetchCalled).toBe(false);
  });

  test('adapts npm stable metadata through injected facade dependencies', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('unexpected global network access');
    }) as typeof fetch;

    try {
      const result = await fetchLatestVersion('1.5.1', 100, {
        cachePath: tempCachePath(),
        now: () => new Date('2026-08-28T20:00:00.000Z'),
        fetch: async (input: string) => {
          if (input === 'https://registry.npmjs.org/get-fable') {
            return {
              ok: true,
              status: 200,
              async json() {
                return { 'dist-tags': { latest: '1.6.0' }, versions: {} };
              },
            };
          }
          return {
            ok: false,
            status: 404,
            async json() {
              return {};
            },
          };
        },
      });

      expect(result.currentVersion).toBe('1.5.1');
      expect(result.latestVersion).toBe('1.6.0');
      expect(result.updateAvailable).toBe(true);
      expect(result.channel).toBe('npm');
      expect(result.checkedAt).toBe('2026-08-28T20:00:00.000Z');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('returns network release intelligence even when the default cache directory cannot be created', async () => {
    const originalHome = process.env.HOME;
    const fakeHomeFile = tempCachePath();
    fs.writeFileSync(fakeHomeFile, 'not-a-directory', 'utf-8');
    process.env.HOME = fakeHomeFile;

    try {
      const result = await fetchLatestVersion('1.5.1', 100, {
        now: () => new Date('2026-08-28T20:00:00.000Z'),
        fetch: async (input: string) => {
          if (input === 'https://registry.npmjs.org/get-fable') {
            return {
              ok: true,
              status: 200,
              async json() {
                return { 'dist-tags': { latest: '1.6.0' }, versions: {} };
              },
            };
          }
          return {
            ok: false,
            status: 404,
            async json() {
              return {};
            },
          };
        },
      });

      expect(result.latestVersion).toBe('1.6.0');
      expect(result.updateAvailable).toBe(true);
    } finally {
      if (originalHome === undefined) delete process.env.HOME;
      else process.env.HOME = originalHome;
    }
  });

  test('does not let default cache directory creation failure prevent a network update check', async () => {
    const originalMkdirSync = fs.mkdirSync;
    let cacheMkdirAttempted = false;
    let fetchCalled = false;

    fs.mkdirSync = ((target: fs.PathLike, options?: unknown) => {
      const candidate = String(target);
      if (candidate.endsWith(path.join('.fable', 'update'))) {
        cacheMkdirAttempted = true;
        throw Object.assign(new Error('cache directory denied'), { code: 'EACCES' });
      }
      return originalMkdirSync(target, options as never);
    }) as typeof fs.mkdirSync;

    try {
      const result = await fetchLatestVersion('1.5.1', 100, {
        now: () => new Date('2026-08-28T20:00:00.000Z'),
        fetch: async (input: string) => {
          fetchCalled = true;
          if (input === 'https://registry.npmjs.org/get-fable') {
            return {
              ok: true,
              status: 200,
              async json() {
                return { 'dist-tags': { latest: '1.6.0' }, versions: {} };
              },
            };
          }
          return {
            ok: false,
            status: 404,
            async json() {
              return {};
            },
          };
        },
      });

      expect(cacheMkdirAttempted).toBe(true);
      expect(fetchCalled).toBe(true);
      expect(result.latestVersion).toBe('1.6.0');
      expect(result.updateAvailable).toBe(true);
    } finally {
      fs.mkdirSync = originalMkdirSync;
    }
  });

  test('falls back to the schema cache when stable discovery fails', async () => {
    const cachePath = tempCachePath();
    const deps = {
      cachePath,
      now: () => new Date('2026-08-28T20:00:00.000Z'),
      fetch: async (input: string) => {
        if (input === 'https://registry.npmjs.org/get-fable') {
          return {
            ok: true,
            status: 200,
            async json() {
              return { 'dist-tags': { latest: '1.6.0' }, versions: {} };
            },
          };
        }
        return {
          ok: false,
          status: 404,
          async json() {
            return {};
          },
        };
      },
    };

    const fresh = await fetchLatestVersion('1.5.1', 100, deps);
    expect(fresh.latestVersion).toBe('1.6.0');

    const cached = await fetchLatestVersion('1.5.2', 100, {
      ...deps,
      fetch: async () => {
        throw new Error('offline');
      },
    });

    expect(cached.currentVersion).toBe('1.5.2');
    expect(cached.latestVersion).toBe('1.6.0');
    expect(cached.updateAvailable).toBe(true);
    expect(cached.channel).toBe('npm');
  });

  test('ignores a fresh cache envelope whose value is not a valid update result', async () => {
    const cachePath = tempCachePath();
    const now = new Date('2026-08-28T20:00:00.000Z');

    fs.writeFileSync(
      cachePath,
      JSON.stringify({
        schemaVersion: 1,
        fetchedAt: '2026-08-28T19:00:00.000Z',
        expiresAt: '2026-08-28T21:00:00.000Z',
        value: {
          currentVersion: '1.5.1',
          latestVersion: 'not-a-version',
          updateAvailable: true,
          checkedAt: '2026-08-28T19:00:00.000Z',
          channel: 'npm',
        },
      }),
      'utf-8'
    );

    const result = await fetchLatestVersion('1.5.2', 100, {
      cachePath,
      now: () => now,
      fetch: async () => {
        throw new Error('offline');
      },
    });

    expect(result.currentVersion).toBe('1.5.2');
    expect(result.latestVersion).toBe('1.5.2');
    expect(result.updateAvailable).toBe(false);
  });

  test('does not report an expired cache entry as current release intelligence', async () => {
    const cachePath = tempCachePath();
    const now = new Date('2026-08-28T20:00:00.000Z');

    fs.writeFileSync(
      cachePath,
      JSON.stringify({
        schemaVersion: 1,
        fetchedAt: '2026-08-27T19:00:00.000Z',
        expiresAt: '2026-08-28T19:00:00.000Z',
        value: {
          currentVersion: '1.5.1',
          latestVersion: '9.9.9',
          updateAvailable: true,
          checkedAt: '2026-08-27T19:00:00.000Z',
          channel: 'npm',
          changelogUrl: 'https://example.invalid/stale',
        },
      })
    );

    const result = await fetchLatestVersion('1.5.2', 100, {
      cachePath,
      now: () => now,
      fetch: async () => {
        throw new Error('offline');
      },
    });

    expect(result.currentVersion).toBe('1.5.2');
    expect(result.latestVersion).toBe('1.5.2');
    expect(result.updateAvailable).toBe(false);
    expect(result.checkedAt).toBe(now.toISOString());
    expect(result.channel).toBe('npm');
  });
});
