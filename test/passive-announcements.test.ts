import fs from 'node:fs';
import { describe, expect, test } from 'bun:test';
import {
  runPassiveAnnouncements,
  type PassiveAnnouncementContext,
} from '../src/core/update/passive-announcements.ts';
import type {
  AnnouncementAcquisitionResult,
  AnnouncementState,
} from '../src/core/update/announcements.ts';

const acquisition: AnnouncementAcquisitionResult = {
  source: 'cache',
  stale: false,
  feed: {
    schemaVersion: 1,
    generatedAt: '2026-09-12T11:00:00.000Z',
    announcements: Array.from({ length: 5 }, (_, index) => ({
      id: `notice-${index + 1}`,
      type: 'info' as const,
      title: `Notice ${index + 1}`,
      message: `Message ${index + 1}`,
      display: 'once' as const,
    })),
  },
};

function context(overrides: Partial<PassiveAnnouncementContext> = {}): PassiveAnnouncementContext {
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

describe('passive announcement display', () => {
  test('uses the shared suppression policy before acquisition in CI, non-TTY and machine modes', async () => {
    for (const suppressed of [
      { isCI: true },
      { isTTY: false },
      { jsonMode: true },
      { jsonV1Mode: true },
      { command: 'announcements' },
      { command: 'update' },
    ]) {
      let acquireCalls = 0;
      const result = await runPassiveAnnouncements(context(suppressed), {
        now: () => new Date('2026-09-12T12:00:00.000Z'),
        acquire: async () => {
          acquireCalls += 1;
          return acquisition;
        },
        readState: () => ({ schemaVersion: 1, seen: [], dismissed: [] }),
        writeState: () => {},
        notify: () => {},
      });
      expect(acquireCalls).toBe(0);
      expect(result.displayed).toBe(0);
    }
  });

  test('caps passive output at three announcements per invocation and records them as seen', async () => {
    const notices: string[] = [];
    let state: AnnouncementState = { schemaVersion: 1, seen: [], dismissed: [] };
    const result = await runPassiveAnnouncements(context(), {
      now: () => new Date('2026-09-12T12:00:00.000Z'),
      acquire: async () => acquisition,
      readState: () => state,
      writeState: (next) => {
        state = next;
      },
      notify: (message) => notices.push(message),
    });

    expect(result.displayed).toBe(3);
    expect(notices).toHaveLength(3);
    expect(state.seen).toEqual(['notice-1', 'notice-2', 'notice-3']);
  });

  test('acquisition and state-write failures degrade to silence', async () => {
    const offline = await runPassiveAnnouncements(context(), {
      now: () => new Date('2026-09-12T12:00:00.000Z'),
      acquire: async () => {
        throw new Error('private network detail');
      },
      readState: () => ({ schemaVersion: 1, seen: [], dismissed: [] }),
      writeState: () => {},
      notify: () => {
        throw new Error('must not notify');
      },
    });

    const deniedWrite = await runPassiveAnnouncements(context(), {
      now: () => new Date('2026-09-12T12:00:00.000Z'),
      acquire: async () => acquisition,
      readState: () => ({ schemaVersion: 1, seen: [], dismissed: [] }),
      writeState: () => {
        throw new Error('state denied');
      },
      notify: () => {},
    });

    expect(offline.displayed).toBe(0);
    expect(deniedWrite.displayed).toBe(3);
  });

  test('passive announcement module has no mutation engine or process-execution dependency', () => {
    const source = fs.readFileSync(new URL('../src/core/update/passive-announcements.ts', import.meta.url), 'utf-8');
    expect(source).not.toMatch(/executor|git-strategy|child_process|spawnSync|execSync|runAutoUpdate|applyUpdatePlan/);
  });
});
