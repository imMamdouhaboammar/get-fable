import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createInitialState,
  readFableState,
  statePath,
  withFableStateTransaction,
  writeFableState,
} from '../src/core/state.ts';

function fresh(prefix = 'fable-state-concurrency-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('state concurrency and crash safety', () => {
  test('schema v3 carries an explicit monotonically increasing state revision', () => {
    const dir = fresh();
    try {
      const initial = createInitialState('2026-08-19T00:00:00.000Z', dir);
      expect(initial.schemaVersion).toBe(3);
      expect(initial.stateRevision).toBe(0);
      writeFableState(dir, initial);
      const next = withFableStateTransaction(dir, (state) => ({
        ...state,
        mutationGeneration: state.mutationGeneration + 1,
      }));
      expect(next.stateRevision).toBe(1);
      expect(readFableState(dir)?.stateRevision).toBe(1);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('migrates schema v2 explicitly but rejects a foreign workspace instead of rebinding it', () => {
    const source = fresh('fable-state-source-');
    const target = fresh('fable-state-target-');
    try {
      const old = createInitialState('2026-08-19T00:00:00.000Z', source) as any;
      old.schemaVersion = 2;
      delete old.stateRevision;
      fs.mkdirSync(path.dirname(statePath(source)), { recursive: true });
      fs.writeFileSync(statePath(source), JSON.stringify(old));
      const migrated = readFableState(source);
      expect(migrated?.schemaVersion).toBe(3);
      expect(migrated?.stateRevision).toBe(0);

      fs.mkdirSync(path.dirname(statePath(target)), { recursive: true });
      fs.copyFileSync(statePath(source), statePath(target));
      expect(() => readFableState(target)).toThrow('workspaceId');
    } finally {
      fs.rmSync(source, { recursive: true, force: true });
      fs.rmSync(target, { recursive: true, force: true });
    }
  });

  test('concurrent CLI mutation writers preserve every mutation without lost updates', async () => {
    const dir = fresh();
    try {
      writeFableState(dir, createInitialState('2026-08-19T00:00:00.000Z', dir));
      const cli = path.join(path.resolve(import.meta.dir, '..'), 'bin', 'get-fable.js');
      const processes = Array.from({ length: 8 }, (_, index) =>
        Bun.spawn(['bun', cli, 'mutation', `worker-${index + 1}`, '--json'], {
          cwd: dir,
          stdout: 'ignore',
          stderr: 'pipe',
          env: { ...process.env, PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}` },
        })
      );
      const exits = await Promise.all(processes.map((process) => process.exited));
      expect(exits.every((code) => code === 0)).toBe(true);
      const state = readFableState(dir)!;
      expect(state.mutationGeneration).toBe(8);
      expect(state.stateRevision).toBeGreaterThanOrEqual(8);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('recovers a stale lock but never removes a fresh lock held by another writer', () => {
    const dir = fresh();
    try {
      writeFableState(dir, createInitialState('2026-08-19T00:00:00.000Z', dir));
      const lock = path.join(dir, '.fable', 'state.lock');
      fs.writeFileSync(lock, JSON.stringify({ pid: 99999999, createdAt: '2020-01-01T00:00:00.000Z' }));
      const old = new Date(Date.now() - 120_000);
      fs.utimesSync(lock, old, old);
      const next = withFableStateTransaction(dir, (state) => ({ ...state, activeCard: 'recovered' }));
      expect(next.activeCard).toBe('recovered');
      expect(fs.existsSync(lock)).toBe(false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
