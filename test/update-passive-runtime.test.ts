import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';
import {
  getAnnouncementCachePath,
  getAnnouncementStatePath,
  readAnnouncementStateFile,
  writeAnnouncementStateFile,
} from '../src/core/update/passive-runtime.ts';

const tempDirs: string[] = [];

function tempHome(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-passive-runtime-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('passive update runtime storage', () => {
  test('keeps announcement feed cache and client state in separate files', () => {
    const home = tempHome();
    const cache = getAnnouncementCachePath(home);
    const state = getAnnouncementStatePath(home);

    expect(cache).not.toBe(state);
    expect(cache).toEndWith(path.join('.fable', 'update', 'announcements-feed.json'));
    expect(state).toEndWith(path.join('.fable', 'update', 'announcements-state.json'));
  });

  test('writes and reads seen/dismiss state atomically through the shared file helper', () => {
    const statePath = getAnnouncementStatePath(tempHome());
    writeAnnouncementStateFile(
      { schemaVersion: 1, seen: ['notice-1'], dismissed: ['notice-2'] },
      statePath
    );

    expect(readAnnouncementStateFile(statePath)).toEqual({
      schemaVersion: 1,
      seen: ['notice-1'],
      dismissed: ['notice-2'],
    });
  });

  test('missing or corrupt state fails closed to an empty client state', () => {
    const statePath = getAnnouncementStatePath(tempHome());
    expect(readAnnouncementStateFile(statePath)).toEqual({ schemaVersion: 1, seen: [], dismissed: [] });

    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, '{not json', 'utf-8');
    expect(readAnnouncementStateFile(statePath)).toEqual({ schemaVersion: 1, seen: [], dismissed: [] });
  });

  test('runtime adapter source cannot execute package, Git, build or updater mutation paths', () => {
    const source = fs.readFileSync(new URL('../src/core/update/passive-runtime.ts', import.meta.url), 'utf-8');
    expect(source).not.toMatch(/child_process|spawnSync|execSync|executor|git-strategy|runAutoUpdate|applyUpdatePlan/);
  });
});
