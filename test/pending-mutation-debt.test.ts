import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  addEvidence,
  createInitialState,
  transitionState,
  withFableStateTransaction,
  writeFableState,
} from '../src/core/state.ts';

const root = path.resolve(import.meta.dir, '..');
const dirs: string[] = [];

function project() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-pending-mutation-'));
  dirs.push(dir);
  const state = createInitialState('2026-09-04T00:00:00.000Z', dir);
  state.phase = 'complete';
  state.currentSkill = null;
  state.substantial = true;
  state.verifiedGeneration = 0;
  state.evidence = [{
    kind: 'test', source: 'bun test', result: 'pass', detail: 'fresh proof before contention',
    generation: 0, timestamp: '2026-09-04T00:01:00.000Z', workspaceId: state.workspaceId,
  }];
  writeFableState(dir, state);
  fs.writeFileSync(path.join(dir, '.fable', 'LEDGER.md'), '- [x] Done -- evidence: bun test passed\n');
  return dir;
}

function python(source: string, dir: string) {
  return spawnSync('python3', ['-c', source, dir, root], {
    encoding: 'utf-8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 5000,
  });
}

function stop(dir: string, active = false) {
  return spawnSync('python3', [path.join(root, 'hooks/fable_close_guard.py')], {
    input: JSON.stringify({ cwd: dir, stop_hook_active: active }), encoding: 'utf-8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 5000,
  });
}

afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('durable pending mutation debt', () => {
  test('lock contention persists unique debt that direct, dispatched, and Antigravity Stop cannot bypass', () => {
    const dir = project();
    const lock = path.join(dir, '.fable', 'state.lock');
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));

    const timedOutHook = spawnSync('python3', [path.join(root, 'hooks/fable_mutation.py')], {
      input: JSON.stringify({ cwd: dir, tool_name: 'Edit' }), encoding: 'utf-8',
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 5000,
    });
    expect(timedOutHook.error).toBeUndefined();
    expect(timedOutHook.status).toBe(0);

    const source = [
      'import sys',
      `sys.path.insert(0, ${JSON.stringify(path.join(root, 'hooks'))})`,
      'import _fable_common as common',
      'common.STATE_LOCK_TIMEOUT_SECONDS = 0',
      'common.record_workspace_mutation(sys.argv[1] + "/.fable")',
    ].join(';');
    expect(python(source, dir).status).toBe(0);

    const pending = path.join(dir, '.fable', 'pending-mutations');
    expect(fs.readdirSync(pending)).toHaveLength(2);
    expect(new Set(fs.readdirSync(pending)).size).toBe(2);
    expect(stop(dir, false).status).toBe(2);
    expect(stop(dir, true).status).toBe(2);

    const dispatched = spawnSync('python3', [
      path.join(root, 'hooks/fable_hook_dispatch.py'), '--handler', 'close', '--event', 'Stop', '--host', 'codex',
    ], {
      input: JSON.stringify({ workspaceRoot: dir, stopHookActive: true }), encoding: 'utf-8',
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 5000,
    });
    expect(dispatched.status).toBe(2);

    const antigravity = spawnSync('python3', [
      path.join(root, 'hooks/fable_hook_dispatch.py'), '--handler', 'close', '--event', 'Stop', '--host', 'antigravity',
    ], {
      input: JSON.stringify({ workspacePaths: [dir], stopHookActive: true }), encoding: 'utf-8',
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 5000,
    });
    expect(antigravity.status).toBe(0);
    expect(JSON.parse(antigravity.stdout).decision).toBe('continue');
    expect(JSON.parse(antigravity.stdout).reason).toContain('mutation debt');

    const [token] = fs.readdirSync(pending);
    fs.writeFileSync(path.join(pending, token), JSON.stringify({ workspaceId: 'foreign-workspace' }));
    expect(stop(dir, true).status).toBe(2);
  });

  test('a Python state transaction reconciles debt before updating command state', () => {
    const dir = project();
    const lock = path.join(dir, '.fable', 'state.lock');
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid }));
    const source = [
      'import sys',
      `sys.path.insert(0, ${JSON.stringify(path.join(root, 'hooks'))})`,
      'import _fable_common as common',
      'common.STATE_LOCK_TIMEOUT_SECONDS = 0',
      'common.record_workspace_mutation(sys.argv[1] + "/.fable")',
    ].join(';');
    expect(python(source, dir).status).toBe(0);
    fs.unlinkSync(lock);

    const result = spawnSync('python3', [path.join(root, 'hooks/fable_fail_streak.py')], {
      input: JSON.stringify({ cwd: dir, tool_response: { exitCode: 0 } }), encoding: 'utf-8',
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 5000,
    });
    expect(result.status).toBe(0);
    const state = JSON.parse(fs.readFileSync(path.join(dir, '.fable', 'state.json'), 'utf-8'));
    expect(state.mutationGeneration).toBe(1);
    expect(state.verifiedGeneration).toBe(0);
    expect(state.failureStreak).toBe(0);
    expect(fs.readdirSync(path.join(dir, '.fable', 'pending-mutations'))).toEqual([]);
  });

  test('a transaction reconciles only its debt snapshot before its mutator runs', () => {
    const dir = project();
    const lock = path.join(dir, '.fable', 'state.lock');
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    const source = [
      'import sys',
      `sys.path.insert(0, ${JSON.stringify(path.join(root, 'hooks'))})`,
      'import _fable_common as common',
      'common.STATE_LOCK_TIMEOUT_SECONDS = 0',
      'common.record_workspace_mutation(sys.argv[1] + "/.fable")',
    ].join(';');
    expect(python(source, dir).status).toBe(0);
    expect(python(source, dir).status).toBe(0);
    fs.unlinkSync(lock);

    const pending = path.join(dir, '.fable', 'pending-mutations');
    const before = fs.readdirSync(pending);
    let generationSeen = -1;
    const reconciled = withFableStateTransaction(dir, state => {
      generationSeen = state.mutationGeneration;
      fs.writeFileSync(path.join(pending, 'mutation-concurrent.json'), JSON.stringify({ workspaceId: state.workspaceId }), { flag: 'wx', mode: 0o600 });
      return state;
    });
    expect(generationSeen).toBe(2);
    expect(reconciled.mutationGeneration).toBe(2);
    expect(reconciled.verifiedGeneration).toBe(0);
    expect(reconciled.substantial).toBe(true);
    expect(before.every(name => !fs.existsSync(path.join(pending, name)))).toBe(true);
    expect(fs.readdirSync(pending)).toEqual(['mutation-concurrent.json']);

    const next = withFableStateTransaction(dir, state => state);
    expect(next.mutationGeneration).toBe(3);
    expect(fs.readdirSync(pending)).toEqual([]);
  });

  test('debt is applied before completion and fresh evidence is attributed to the reconciled generation', () => {
    const dir = project();
    const lock = path.join(dir, '.fable', 'state.lock');
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid }));
    const source = [
      'import sys',
      `sys.path.insert(0, ${JSON.stringify(path.join(root, 'hooks'))})`,
      'import _fable_common as common',
      'common.STATE_LOCK_TIMEOUT_SECONDS = 0',
      'common.record_workspace_mutation(sys.argv[1] + "/.fable")',
    ].join(';');
    expect(python(source, dir).status).toBe(0);
    fs.unlinkSync(lock);

    expect(() => withFableStateTransaction(dir, state => transitionState(state, 'complete')))
      .toThrow(/without passing evidence/i);
    expect(fs.readdirSync(path.join(dir, '.fable', 'pending-mutations'))).toHaveLength(1);

    const evidenced = withFableStateTransaction(dir, state => addEvidence(state, {
      kind: 'test', source: 'bun test', result: 'pass', detail: 'verified after debt reconciliation',
    }));
    expect(evidenced.mutationGeneration).toBe(1);
    expect(evidenced.verifiedGeneration).toBe(1);
    expect(evidenced.evidence.at(-1)?.generation).toBe(1);
    expect(withFableStateTransaction(dir, state => transitionState(state, 'complete')).phase).toBe('complete');
  });

  test('unsafe, absent, and foreign workspaces never gain mutation debt', () => {
    const missing = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-pending-missing-'));
    dirs.push(missing);
    const invoke = (dir: string) => spawnSync('python3', [path.join(root, 'hooks/fable_mutation.py')], {
      input: JSON.stringify({ cwd: dir, tool_name: 'Edit' }), encoding: 'utf-8',
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 5000,
    });
    expect(invoke(missing).status).toBe(0);
    expect(fs.existsSync(path.join(missing, '.fable'))).toBe(false);

    const unsafe = project();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-pending-outside-'));
    dirs.push(outside);
    fs.symlinkSync(outside, path.join(unsafe, '.fable', 'pending-mutations'));
    expect(invoke(unsafe).status).toBe(0);
    expect(fs.readdirSync(outside)).toEqual([]);

    const foreign = project();
    const statePath = path.join(foreign, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.workspaceId = '000000000000000000000000';
    fs.writeFileSync(statePath, JSON.stringify(state));
    expect(invoke(foreign).status).toBe(0);
    expect(fs.existsSync(path.join(foreign, '.fable', 'pending-mutations'))).toBe(false);
  });

  test('a token name collision never deletes debt the writer did not create', () => {
    const dir = project();
    const pending = path.join(dir, '.fable', 'pending-mutations');
    fs.mkdirSync(pending);
    const token = 'mutation-123-456-aaaaaaaaaaaaaaaaaaaaaaaa.json';
    const tokenPath = path.join(pending, token);
    const original = JSON.stringify({ workspaceId: 'pre-existing-owner' });
    fs.writeFileSync(tokenPath, original, { flag: 'wx', mode: 0o600 });

    const source = [
      'import sys',
      `sys.path.insert(0, ${JSON.stringify(path.join(root, 'hooks'))})`,
      'import _fable_common as common',
      'common.os.getpid = lambda: 123',
      'common.time.time_ns = lambda: 456',
      'common.secrets.token_hex = lambda size: "a" * 24',
      'print(common._persist_pending_mutation(sys.argv[1] + "/.fable"))',
    ].join(';');
    const result = python(source, dir);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('False');
    expect(fs.readFileSync(tokenPath, 'utf-8')).toBe(original);
  });

  test('an interrupted token write leaves conservative debt for Stop to block', () => {
    const dir = project();
    const token = 'mutation-123-456-bbbbbbbbbbbbbbbbbbbbbbbb.json';
    const source = [
      'import sys',
      `sys.path.insert(0, ${JSON.stringify(path.join(root, 'hooks'))})`,
      'import _fable_common as common',
      'common.os.getpid = lambda: 123',
      'common.time.time_ns = lambda: 456',
      'common.secrets.token_hex = lambda size: "b" * 24',
      'common.os.fsync = lambda fd: (_ for _ in ()).throw(OSError("forced interruption"))',
      'print(common._persist_pending_mutation(sys.argv[1] + "/.fable"))',
    ].join(';');
    const result = python(source, dir);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('False');
    expect(fs.existsSync(path.join(dir, '.fable', 'pending-mutations', token))).toBe(true);
    expect(stop(dir, true).status).toBe(2);
  });
});
