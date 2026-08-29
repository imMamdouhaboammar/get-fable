import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';
import { acquireUpdateLock, releaseUpdateLock } from '../src/core/update/lock.ts';
import type { LockDeps, UpdateLockRecord } from '../src/core/update/lock.ts';

const tempDirs: string[] = [];

function tempLockPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-update-lock-'));
  tempDirs.push(dir);
  return path.join(dir, 'update.lock');
}

function deps(overrides: Partial<LockDeps> = {}): LockDeps {
  return {
    now: () => new Date('2026-08-29T03:00:00.000Z'),
    pid: 4242,
    token: () => 'owner-token',
    isProcessAlive: () => 'alive',
    ...overrides,
  };
}

function writeLock(filePath: string, record: UpdateLockRecord) {
  fs.writeFileSync(filePath, JSON.stringify(record), { encoding: 'utf-8', mode: 0o600 });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('owner-token update lock', () => {
  test('acquires an absent lock with an exclusive owner record', () => {
    const filePath = tempLockPath();
    const handle = acquireUpdateLock(filePath, '1.6.0', 'npm-global', deps());

    expect(handle.path).toBe(filePath);
    expect(handle.token).toBe('owner-token');
    expect(handle.record).toEqual({
      schemaVersion: 1,
      token: 'owner-token',
      pid: 4242,
      acquiredAt: '2026-08-29T03:00:00.000Z',
      targetVersion: '1.6.0',
      installationMethod: 'npm-global',
    });
    expect(JSON.parse(fs.readFileSync(filePath, 'utf-8'))).toEqual(handle.record);
  });

  test('never reclaims an old lock while its owner is alive', () => {
    const filePath = tempLockPath();
    writeLock(filePath, {
      schemaVersion: 1,
      token: 'old-live-owner',
      pid: 111,
      acquiredAt: '2020-01-01T00:00:00.000Z',
      targetVersion: '1.4.0',
      installationMethod: 'npm-global',
    });

    expect(() =>
      acquireUpdateLock(
        filePath,
        '1.6.0',
        'npm-global',
        deps({ isProcessAlive: (pid) => (pid === 111 ? 'alive' : 'unknown') })
      )
    ).toThrow(/lock|owner|alive/i);

    expect(JSON.parse(fs.readFileSync(filePath, 'utf-8')).token).toBe('old-live-owner');
  });

  test('rejects a new lock while its owner is alive', () => {
    const filePath = tempLockPath();
    writeLock(filePath, {
      schemaVersion: 1,
      token: 'new-live-owner',
      pid: 222,
      acquiredAt: '2026-08-29T02:59:59.000Z',
      targetVersion: '1.6.0',
      installationMethod: 'bun-global',
    });

    expect(() => acquireUpdateLock(filePath, '1.6.0', 'bun-global', deps())).toThrow(/lock|owner|alive/i);
    expect(JSON.parse(fs.readFileSync(filePath, 'utf-8')).token).toBe('new-live-owner');
  });

  test('reclaims a lock only when the recorded owner is confirmed dead', () => {
    const filePath = tempLockPath();
    writeLock(filePath, {
      schemaVersion: 1,
      token: 'dead-owner',
      pid: 333,
      acquiredAt: '2026-08-29T02:00:00.000Z',
      targetVersion: '1.5.0',
      installationMethod: 'npm-global',
    });

    const handle = acquireUpdateLock(
      filePath,
      '1.6.0',
      'npm-global',
      deps({ isProcessAlive: (pid) => (pid === 333 ? 'dead' : 'unknown') })
    );

    expect(handle.token).toBe('owner-token');
    expect(JSON.parse(fs.readFileSync(filePath, 'utf-8')).token).toBe('owner-token');
  });

  test('fails closed when owner liveness is unknown', () => {
    const filePath = tempLockPath();
    writeLock(filePath, {
      schemaVersion: 1,
      token: 'uncertain-owner',
      pid: 444,
      acquiredAt: '2020-01-01T00:00:00.000Z',
      targetVersion: '1.5.0',
      installationMethod: 'homebrew',
    });

    expect(() =>
      acquireUpdateLock(filePath, '1.6.0', 'homebrew', deps({ isProcessAlive: () => 'unknown' }))
    ).toThrow(/lock|owner|unknown|liveness/i);

    expect(JSON.parse(fs.readFileSync(filePath, 'utf-8')).token).toBe('uncertain-owner');
  });

  test('does not unlink a lock when the release token no longer matches', () => {
    const filePath = tempLockPath();
    const handle = acquireUpdateLock(filePath, '1.6.0', 'npm-global', deps());

    writeLock(filePath, { ...handle.record, token: 'replacement-token', pid: 555 });
    releaseUpdateLock(handle);

    expect(fs.existsSync(filePath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(filePath, 'utf-8')).token).toBe('replacement-token');
  });

  test('an old owner release cannot remove a replacement lock', () => {
    const filePath = tempLockPath();
    const oldHandle = acquireUpdateLock(filePath, '1.6.0', 'npm-global', deps());

    const replacement: UpdateLockRecord = {
      ...oldHandle.record,
      token: 'new-owner-token',
      pid: 777,
      acquiredAt: '2026-08-29T03:01:00.000Z',
    };
    writeLock(filePath, replacement);

    releaseUpdateLock(oldHandle);

    expect(JSON.parse(fs.readFileSync(filePath, 'utf-8'))).toEqual(replacement);
  });

  test('matching owner token releases the lock', () => {
    const filePath = tempLockPath();
    const handle = acquireUpdateLock(filePath, '1.6.0', 'npm-global', deps());

    releaseUpdateLock(handle);
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
