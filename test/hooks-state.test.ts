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
  writeFableState(dir, createInitialState('2026-08-13T00:00:00.000Z', dir));
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

  test('successful write hooks advance mutation generation and stale prior verification', () => {
    const dir = project();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.verifiedGeneration = 0;
    state.evidence = [
      {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'baseline verified',
        generation: 0,
        timestamp: '2026-08-18T00:01:00.000Z',
      },
    ];
    fs.writeFileSync(statePath, JSON.stringify(state));

    const result = runHook('fable_mutation.py', {
      cwd: dir,
      tool_name: 'Edit',
      tool_response: { ok: true },
    });
    expect(result.status).toBe(0);

    const mutated = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    expect(mutated.mutationGeneration).toBe(1);
    expect(mutated.verifiedGeneration).toBe(0);
    expect(mutated.substantial).toBe(true);
  });

  test('failed write attempts stale prior verification and block completion', () => {
    const dir = project();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.phase = 'complete';
    state.currentSkill = null;
    state.substantial = true;
    state.verifiedGeneration = 0;
    state.evidence = [
      {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'verified before the failed write attempt',
        generation: 0,
        timestamp: '2026-08-20T00:01:00.000Z',
      },
    ];
    fs.writeFileSync(statePath, JSON.stringify(state));

    const result = runHook('fable_mutation.py', {
      cwd: dir,
      tool_name: 'Edit',
      tool_response: { is_error: true, error: 'write failed' },
    });
    expect(result.status).toBe(0);

    const mutated = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    expect(mutated.mutationGeneration).toBe(1);
    expect(mutated.verifiedGeneration).toBe(0);

    const blocked = runHook('fable_close_guard.py', { cwd: dir, stop_hook_active: false });
    expect(blocked.status).toBe(2);
    expect(blocked.stderr).toContain('current mutation generation');
  });

  test('read-only tool failures do not advance mutation generation', () => {
    const dir = project();
    const statePath = path.join(dir, '.fable', 'state.json');

    const result = runHook('fable_mutation.py', {
      hook_event_name: 'PostToolUseFailure',
      cwd: dir,
      tool_name: 'Read',
      error: 'read failed',
    });
    expect(result.status).toBe(0);

    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    expect(state.mutationGeneration).toBe(0);
  });

  test('official Claude failure events increment recovery state and success resets it', () => {
    const dir = project();
    const failure = {
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command: 'bun test' },
      session_id: 'claude-event-session',
      cwd: dir,
      error: 'Exit code 1\nTests failed',
      is_interrupt: false,
      duration_ms: 42,
    };
    const success = {
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'bun test' },
      tool_response: { stdout: 'all tests passed', stderr: '' },
      session_id: 'claude-event-session',
      cwd: dir,
    };

    expect(runHook('fable_fail_streak.py', failure).status).toBe(0);
    expect(runHook('fable_fail_streak.py', success).status).toBe(0);
    expect(runHook('fable_fail_streak.py', failure).status).toBe(0);

    let state = JSON.parse(fs.readFileSync(path.join(dir, '.fable', 'state.json'), 'utf-8'));
    expect(state.failureStreak).toBe(1);
    expect(state.phase).not.toBe('recovering');

    const recovering = runHook('fable_fail_streak.py', failure);
    expect(recovering.status).toBe(0);
    expect(JSON.parse(recovering.stdout).hookSpecificOutput.hookEventName).toBe('PostToolUseFailure');

    state = JSON.parse(fs.readFileSync(path.join(dir, '.fable', 'state.json'), 'utf-8'));
    expect(state.failureStreak).toBe(2);
    expect(state.phase).toBe('recovering');
    expect(state.currentSkill).toBe('fable-recover');
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
    expect(blocked.stderr).toContain('current mutation generation');
  });

  test('close guard blocks substantial completion when the newest current-generation completion evidence is a failure', () => {
    const dir = project();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.phase = 'complete';
    state.currentSkill = null;
    state.substantial = true;
    state.verifiedGeneration = 0;
    state.evidence = [
      {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'targeted tests passed',
        generation: 0,
        timestamp: '2026-08-18T00:01:00.000Z',
        workspaceId: state.workspaceId,
      },
      {
        kind: 'runtime',
        source: 'smoke test',
        result: 'fail',
        detail: 'runtime smoke failed after verification',
        generation: 0,
        timestamp: '2026-08-18T00:02:00.000Z',
        workspaceId: state.workspaceId,
      },
    ];
    state.updatedAt = '2026-08-18T00:02:00.000Z';
    fs.writeFileSync(statePath, JSON.stringify(state));

    const blocked = runHook('fable_close_guard.py', { cwd: dir, stop_hook_active: false });
    expect(blocked.status).toBe(2);
    expect(blocked.stderr).toContain('current mutation generation');

    state.evidence.push({
      kind: 'runtime',
      source: 'smoke test',
      result: 'pass',
      detail: 'runtime smoke passed after correction',
      generation: 0,
      timestamp: '2026-08-18T00:03:00.000Z',
      workspaceId: state.workspaceId,
    });
    state.failureStreak = 0;
    state.updatedAt = '2026-08-18T00:03:00.000Z';
    fs.writeFileSync(statePath, JSON.stringify(state));

    const allowed = runHook('fable_close_guard.py', { cwd: dir, stop_hook_active: false });
    expect(allowed.status).toBe(0);
  });

  test('close guard blocks when a newer mutation makes old verification stale', () => {
    const dir = project();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.phase = 'complete';
    state.currentSkill = null;
    state.substantial = true;
    state.mutationGeneration = 1;
    state.verifiedGeneration = 0;
    state.evidence = [
      {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'tests passed before final mutation',
        generation: 0,
        timestamp: '2026-08-18T00:01:00.000Z',
      },
    ];
    fs.writeFileSync(statePath, JSON.stringify(state));

    const blocked = runHook('fable_close_guard.py', { cwd: dir, stop_hook_active: false });
    expect(blocked.status).toBe(2);
    expect(blocked.stderr).toContain('current mutation generation');
  });

  test('close guard rejects malformed latest evidence detail as invalid state', () => {
    const invalidDetails: unknown[] = [null, 42, true, undefined, '   '];

    for (const detail of invalidDetails) {
      const dir = project();
      const statePath = path.join(dir, '.fable', 'state.json');
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      state.phase = 'complete';
      state.currentSkill = null;
      state.substantial = true;
      state.verifiedGeneration = 0;
      state.evidence = [
        {
          kind: 'test',
          source: 'bun test',
          result: 'pass',
          ...(detail === undefined ? {} : { detail }),
          generation: 0,
          timestamp: '2026-08-18T00:01:00.000Z',
        },
      ];
      fs.writeFileSync(statePath, JSON.stringify(state));

      const blocked = runHook('fable_close_guard.py', { cwd: dir, stop_hook_active: false });
      expect(blocked.status).toBe(2);
      expect(blocked.stderr).toContain('invalid for the current lifecycle schema');
    }
  });

  test('profile injector reports specialist and mutation-aware durable state without synthetic model tiers', () => {
    const dir = project();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.phase = 'recovering';
    state.currentSkill = 'fable-recover';
    state.failureStreak = 2;
    state.substantial = true;
    state.mutationGeneration = 3;
    state.verifiedGeneration = 2;
    state.activeCard = 'Repair the failing integration path';
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
    expect(context).toContain('mutationGeneration=3');
    expect(context).toContain('verifiedGeneration=2');
    expect(context).toContain('Repair the failing integration path');
    expect(context).not.toContain('model ceiling');
    expect(context).not.toContain('Fable-5-grade');
  });
});
