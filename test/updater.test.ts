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
});
