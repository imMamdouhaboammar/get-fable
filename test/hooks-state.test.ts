import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInitialState, writeFableState } from '../src/core/state.ts';
import { initProjectFable } from '../src/installer.ts';

const root = path.resolve(import.meta.dir, '..');
const tempDirs: string[] = [];

function freshDir(prefix = 'get-fable-hooks-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function project() {
  const dir = freshDir();
  fs.mkdirSync(path.join(dir, '.fable'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.fable', 'LEDGER.md'), '- [x] Acceptance: tests pass -- evidence: bun test 42 passed\n');
  writeFableState(dir, createInitialState('2026-08-13T00:00:00.000Z'));
  return dir;
}

function runHook(name: string, input: Record<string, unknown>) {
  return spawnSync('python3', [path.join(root, 'hooks', name)], {
    input: JSON.stringify(input),
    encoding: 'utf-8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('lifecycle hooks and durable state', () => {
  test('a newly initialized idle project can stop before any work round exists', () => {
    const dir = freshDir('get-fable-init-hooks-');
    initProjectFable(dir);

    const result = runHook('fable_close_guard.py', { cwd: dir, stop_hook_active: false });
    expect(result.status).toBe(0);
  });

  test('two consecutive command failures move durable state into recovery', () => {
    const dir = project();
    const input = {
      session_id: 'test-session',
      cwd: dir,
      tool_response: { exitCode: 1, stderr: 'failed' },
    };

    expect(runHook('fable_fail_streak.py', input).status).toBe(0);
    expect(runHook('fable_fail_streak.py', input).status).toBe(0);

    const state = JSON.parse(fs.readFileSync(path.join(dir, '.fable', 'state.json'), 'utf-8'));
    expect(state.failureStreak).toBe(2);
    expect(state.phase).toBe('recovering');
    expect(state.currentSkill).toBe('fable-recover');
    expect(state.substantial).toBe(true);
  });

  test('close guard blocks substantial work that has no passing state evidence', () => {
    const dir = project();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.phase = 'verifying';
    state.currentSkill = 'fable-verify';
    state.substantial = true;
    fs.writeFileSync(statePath, JSON.stringify(state));

    const blocked = runHook('fable_close_guard.py', { cwd: dir, stop_hook_active: false });
    expect(blocked.status).toBe(2);
    expect(blocked.stderr).toContain('passing state evidence');
  });

  test('close guard blocks substantial completion when the newest evidence is a failure', () => {
    const dir = project();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.phase = 'complete';
    state.currentSkill = null;
    state.substantial = true;
    state.evidence = [
      {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'targeted tests passed',
        timestamp: '2026-08-18T00:01:00.000Z',
      },
      {
        kind: 'runtime',
        source: 'smoke test',
        result: 'fail',
        detail: 'runtime smoke failed after verification',
        timestamp: '2026-08-18T00:02:00.000Z',
      },
    ];
    state.updatedAt = '2026-08-18T00:02:00.000Z';
    fs.writeFileSync(statePath, JSON.stringify(state));

    const blocked = runHook('fable_close_guard.py', { cwd: dir, stop_hook_active: false });
    expect(blocked.status).toBe(2);
    expect(blocked.stderr).toContain('fresh passing state evidence');
  });

  test('profile injector reports the durable workflow phase without synthetic model tiers', () => {
    const dir = project();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.phase = 'recovering';
    state.currentSkill = 'fable-recover';
    state.failureStreak = 2;
    state.substantial = true;
    fs.writeFileSync(statePath, JSON.stringify(state));

    const result = runHook('fable_profile_inject.py', {
      cwd: dir,
      session_id: 'profile-test',
      model: 'any-model-name',
    });
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    const context = payload.hookSpecificOutput.additionalContext;
    expect(context).toContain('fable-recover');
    expect(context).toContain('failureStreak=2');
    expect(context).not.toContain('model ceiling');
    expect(context).not.toContain('Fable-5-grade');
  });
});
