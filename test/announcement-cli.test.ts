import { describe, expect, test } from 'bun:test';
import {
  runAnnouncementsCli,
  type AnnouncementCliDeps,
} from '../src/core/update/announcement-cli.ts';
import type {
  AnnouncementAcquisitionResult,
  AnnouncementFeed,
  AnnouncementState,
} from '../src/core/update/announcements.ts';

const NOW = new Date('2026-09-12T12:00:00.000Z');

function feed(): AnnouncementFeed {
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-12T11:00:00.000Z',
    announcements: [
      {
        id: 'once-1',
        type: 'release',
        title: 'Release notice',
        message: 'Release message',
        minVersion: '1.5.0',
        display: 'once',
      },
      {
        id: 'security-1',
        type: 'security',
        title: 'Security notice',
        message: 'Security message',
        display: 'until-dismissed',
      },
    ],
  };
}

function acquisition(): AnnouncementAcquisitionResult {
  return { feed: feed(), source: 'cache', stale: false };
}

function deps(overrides: Partial<AnnouncementCliDeps> = {}) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  let state: AnnouncementState = { schemaVersion: 1, seen: [], dismissed: [] };
  const value: AnnouncementCliDeps = {
    currentVersion: '1.7.0',
    now: () => NOW,
    acquire: async () => acquisition(),
    readState: () => state,
    writeState: (next) => {
      state = next;
    },
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
    ...overrides,
  };
  return { value, stdout, stderr, getState: () => state };
}

describe('announcement CLI', () => {
  test('lists currently targeted announcements', async () => {
    const fixture = deps();
    const code = await runAnnouncementsCli(['list'], fixture.value);

    expect(code).toBe(0);
    expect(fixture.stdout.join('\n')).toContain('once-1');
    expect(fixture.stdout.join('\n')).toContain('security-1');
    expect(fixture.stderr).toEqual([]);
  });

  test('list --unread excludes announcements already seen even when their display mode remains active', async () => {
    const fixture = deps({
      readState: () => ({ schemaVersion: 1, seen: ['security-1'], dismissed: [] }),
    });
    const code = await runAnnouncementsCli(['list', '--unread'], fixture.value);

    expect(code).toBe(0);
    expect(fixture.stdout.join('\n')).toContain('once-1');
    expect(fixture.stdout.join('\n')).not.toContain('security-1');
  });

  test('show marks an announcement as seen', async () => {
    const fixture = deps();
    const code = await runAnnouncementsCli(['show', 'once-1'], fixture.value);

    expect(code).toBe(0);
    expect(fixture.stdout.join('\n')).toContain('Release message');
    expect(fixture.getState().seen).toContain('once-1');
  });

  test('dismiss persists dismissal state for an existing announcement', async () => {
    const fixture = deps();
    const code = await runAnnouncementsCli(['dismiss', 'security-1'], fixture.value);

    expect(code).toBe(0);
    expect(fixture.getState().dismissed).toContain('security-1');
    expect(fixture.getState().seen).toContain('security-1');
  });

  test('refresh forces bounded acquisition and reports source', async () => {
    const options: unknown[] = [];
    const fixture = deps({
      acquire: async (value) => {
        options.push(value);
        return { ...acquisition(), source: 'network' };
      },
    });
    const code = await runAnnouncementsCli(['refresh'], fixture.value);

    expect(code).toBe(0);
    expect(options).toEqual([{ refresh: true, explicit: true }]);
    expect(fixture.stdout.join('\n')).toMatch(/network/i);
  });

  test('explicit refresh failure is structured and non-zero without leaking transport details', async () => {
    const fixture = deps({
      acquire: async () => {
        throw new Error('private transport detail');
      },
    });
    const code = await runAnnouncementsCli(['refresh', '--json'], fixture.value);

    expect(code).toBe(1);
    expect(fixture.stderr).toEqual([]);
    expect(fixture.stdout).toHaveLength(1);
    const parsed = JSON.parse(fixture.stdout[0]!) as Record<string, unknown>;
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed)).not.toContain('private transport detail');
  });

  test('JSON-v1 output is one machine-only document', async () => {
    const fixture = deps();
    const code = await runAnnouncementsCli(['list', '--json-v1'], fixture.value);

    expect(code).toBe(0);
    expect(fixture.stdout).toHaveLength(1);
    expect(fixture.stderr).toEqual([]);
    const parsed = JSON.parse(fixture.stdout[0]!) as {
      schemaVersion: number;
      command: string;
      data: { announcements: unknown[] };
    };
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.command).toBe('announcements:list');
    expect(parsed.data.announcements).toHaveLength(2);
  });

  test('unknown announcement IDs and actions fail closed', async () => {
    const missing = deps();
    const unknown = deps();

    expect(await runAnnouncementsCli(['show', 'missing'], missing.value)).toBe(1);
    expect(await runAnnouncementsCli(['execute', 'anything'], unknown.value)).toBe(1);
    expect(missing.stderr.join('\n')).toMatch(/not found/i);
    expect(unknown.stderr.join('\n')).toMatch(/unknown/i);
  });
});
