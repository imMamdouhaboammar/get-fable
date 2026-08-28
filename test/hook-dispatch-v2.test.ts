import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInitialState, writeFableState } from '../src/core/state.ts';

const root = path.resolve(import.meta.dir, '..');
const tempDirs: string[] = [];

function project() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-dispatch-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, '.fable'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.fable', 'LEDGER.md'),
    '- [x] Acceptance: lifecycle adapter works -- evidence: hook adapter test\n'
  );
  writeFableState(dir, createInitialState('2026-08-28T00:00:00.000Z', dir));
  return dir;
}

function dispatch(
  handler: string,
  event: string,
  host: string,
  input: Record<string, unknown>
) {
  return spawnSync(
    'python3',
    [
      path.join(root, 'hooks', 'fable_hook_dispatch.py'),
      '--handler', handler,
      '--event', event,
      '--host', host,
    ],
    {
      input: JSON.stringify(input),
      encoding: 'utf-8',
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    }
  );
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('host-agnostic lifecycle hook dispatcher', () => {
  test('normalizes Antigravity-style workspace and tool aliases for mutation tracking', () => {
    const dir = project();
    const result = dispatch('mutation', 'PostToolUse', 'antigravity', {
      projectRoot: dir,
      toolName: 'apply_patch',
      toolResponse: { ok: true },
    });
    expect(result.status).toBe(0);

    const state = JSON.parse(fs.readFileSync(path.join(dir, '.fable', 'state.json'), 'utf-8'));
    expect(state.mutationGeneration).toBe(1);
    expect(state.substantial).toBe(true);
  });

  test('attributes Codex nonzero Bash PostToolUse events as failures', () => {
    const dir = project();
    const payload = {
      cwd: dir,
      sessionId: 'codex-session',
      toolName: 'Bash',
      toolResponse: { exitCode: 1, stderr: 'tests failed' },
    };

    expect(dispatch('failure', 'PostToolUse', 'codex', payload).status).toBe(0);
    const second = dispatch('failure', 'PostToolUse', 'codex', payload);
    expect(second.status).toBe(0);
    expect(JSON.parse(second.stdout).hookSpecificOutput.hookEventName).toBe('PostToolUse');

    const state = JSON.parse(fs.readFileSync(path.join(dir, '.fable', 'state.json'), 'utf-8'));
    expect(state.failureStreak).toBe(2);
    expect(state.phase).toBe('recovering');
    expect(state.currentSkill).toBe('fable-recover');
  });

  test('journals lifecycle metadata without persisting prompts or tool arguments', () => {
    const dir = project();
    const secret = 'do-not-store-this-secret-prompt';
    const result = dispatch('event', 'UserPromptSubmit', 'codex', {
      workspaceRoot: dir,
      sessionId: 'privacy-session',
      prompt: secret,
      toolInput: { command: `echo ${secret}` },
      toolName: 'Bash',
    });
    expect(result.status).toBe(0);

    const log = fs.readFileSync(path.join(dir, '.fable', 'events.jsonl'), 'utf-8');
    expect(log).toContain('UserPromptSubmit');
    expect(log).toContain('codex');
    expect(log).toContain('privacy-session');
    expect(log).not.toContain(secret);
    expect(log).not.toContain('toolInput');
    expect(log).not.toContain('prompt');
  });

  test('Codex hook map covers current lifecycle event families without Claude-only failure events', () => {
    const config = JSON.parse(fs.readFileSync(path.join(root, 'hooks', 'hooks.codex.json'), 'utf-8'));
    const events = Object.keys(config.hooks);
    expect(events).toEqual(expect.arrayContaining([
      'SessionStart',
      'UserPromptSubmit',
      'PreToolUse',
      'PermissionRequest',
      'PostToolUse',
      'PreCompact',
      'PostCompact',
      'SubagentStart',
      'SubagentStop',
      'Stop',
      'Interrupt',
      'SessionEnd',
    ]));
    expect(events).not.toContain('PostToolUseFailure');
  });
});
