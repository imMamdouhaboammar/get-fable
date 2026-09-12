import fs from 'node:fs';
import { describe, expect, test } from 'bun:test';
import {
  runPassiveUpdateAwareness,
  type PassiveUpdateAwarenessContext,
} from '../src/core/update/passive.ts';
import type { CacheEnvelope } from '../src/core/update/cache.ts';
import type { ReleaseMetadata } from '../src/core/update/types.ts';

const NOW = new Date('2026-09-12T12:00:00.000Z');

function context(overrides: Partial<PassiveUpdateAwarenessContext> = {}): PassiveUpdateAwarenessContext {
  return {
    currentVersion: '1.5.1',
    command: 'status',
    autoCheck: true,
    isCI: false,
    isTTY: true,
    jsonMode: false,
    jsonV1Mode: false,
    ...overrides,
  };
}

function release(version = '1.6.0'): ReleaseMetadata {
  return {
    version,
    channel: 'stable',
    source: 'npm',
    checkedAt: NOW.toISOString(),
    releaseUrl: `https://github.com/imMamdouhaboammar/get-fable/releases/tag/v${version}`,
  };
}

function cache(expiresAt: string): CacheEnvelope<unknown> {
  return {
    schemaVersion: 1,
    fetchedAt: '2026-09-12T10:00:00.000Z',
    expiresAt,
    value: {
      currentVersion: '1.5.1',
      latestVersion: '1.6.0',
      updateAvailable: true,
      checkedAt: '2026-09-12T10:00:00.000Z',
      channel: 'npm',
      changelogUrl: 'https://github.com/imMamdouhaboammar/get-fable/releases',
    },
  };
}

describe('notification-only passive update awareness', () => {
  test('suppresses CI, non-TTY, JSON and JSON-v1 before release acquisition', async () => {
    for (const suppressed of [
      { isCI: true },
      { isTTY: false },
      { jsonMode: true },
      { jsonV1Mode: true },
    ]) {
      let fetchCalls = 0;
      const result = await runPassiveUpdateAwareness(context(suppressed), {
        now: () => NOW,
        readCache: () => null,
        writeCache: () => {},
        fetchRelease: async () => {
          fetchCalls += 1;
          return release();
        },
        notify: () => {},
      });
      expect(result.notified).toBe(false);
      expect(fetchCalls).toBe(0);
    }
  });

  test('fresh validated release cache suppresses network work', async () => {
    let fetchCalls = 0;
    const result = await runPassiveUpdateAwareness(context(), {
      now: () => NOW,
      readCache: () => cache('2026-09-12T13:00:00.000Z'),
      writeCache: () => {},
      fetchRelease: async () => {
        fetchCalls += 1;
        return release();
      },
      notify: () => {},
    });

    expect(result.reason).toBe('fresh-cache');
    expect(fetchCalls).toBe(0);
  });

  test('malformed cache is not treated as fresh', async () => {
    let fetchCalls = 0;
    await runPassiveUpdateAwareness(context(), {
      now: () => NOW,
      readCache: () => ({ ...cache('2026-09-12T13:00:00.000Z'), value: { latestVersion: 'not-semver' } }),
      writeCache: () => {},
      fetchRelease: async () => {
        fetchCalls += 1;
        return release('1.5.1');
      },
      notify: () => {},
    });
    expect(fetchCalls).toBe(1);
  });

  test('interactive stale-cache invocation may refresh metadata and print only a concise notice', async () => {
    const notices: string[] = [];
    let written: CacheEnvelope<unknown> | null = null;
    const result = await runPassiveUpdateAwareness(context(), {
      now: () => NOW,
      readCache: () => cache('2026-09-12T11:00:00.000Z'),
      writeCache: (value) => {
        written = value;
      },
      fetchRelease: async () => release('1.6.0'),
      notify: (message) => notices.push(message),
    });

    expect(result.notified).toBe(true);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatch(/1\.6\.0/);
    expect(written?.value).toMatchObject({ latestVersion: '1.6.0', updateAvailable: true });
  });

  test('no-update and network failures stay silent and never fail the unrelated command', async () => {
    const notices: string[] = [];
    const noUpdate = await runPassiveUpdateAwareness(context(), {
      now: () => NOW,
      readCache: () => null,
      writeCache: () => {},
      fetchRelease: async () => release('1.5.1'),
      notify: (message) => notices.push(message),
    });
    const offline = await runPassiveUpdateAwareness(context(), {
      now: () => NOW,
      readCache: () => null,
      writeCache: () => {
        throw new Error('cache denied');
      },
      fetchRelease: async () => {
        throw new Error('network private detail');
      },
      notify: (message) => notices.push(message),
    });

    expect(noUpdate.notified).toBe(false);
    expect(offline.notified).toBe(false);
    expect(notices).toEqual([]);
  });

  test('passive module has no static path to executor, Git strategy, package managers or child_process', () => {
    const source = fs.readFileSync(new URL('../src/core/update/passive.ts', import.meta.url), 'utf-8');
    expect(source).not.toMatch(/executor|git-strategy|child_process|spawnSync|execSync|bun\s+install|npm\s+install|brew\s+upgrade|git\s+pull|runAutoUpdate|applyUpdatePlan/);
  });
});
