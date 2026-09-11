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
  input: Record<string, unknown>,
  cwd?: string
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
      cwd,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    }
  );
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('host-agnostic lifecycle hook dispatcher', () => {
  test.each([
    ['workspaceRoot empty', { workspaceRoot: '' }],
    ['workspaceRoot null', { workspaceRoot: null }],
    ['workspace_root null', { workspace_root: null }],
    ['projectRoot empty', { projectRoot: '' }],
    ['context cwd null', { context: { cwd: null } }],
    ['workspace root empty', { workspace: { root: '' } }],
    ['workspace root hidden by empty context', { context: {}, workspace: { root: null } }],
    ['workspace root hidden by unrelated context', { context: { session: 'x' }, workspace: { root: '' } }],
    ['workspacePaths empty', { workspacePaths: [] }],
    ['workspacePaths blank', { workspacePaths: [''] }],
    ['tool call cwd null', { toolCall: { args: { Cwd: null } } }],
    ['tool_call cwd hidden by empty toolCall', { toolCall: {}, tool_call: { args: { cwd: null } } }],
    ['tool_call cwd hidden by unrelated toolCall', {
      toolCall: { name: 'apply_patch' },
      tool_call: { args: { cwd: '' } },
    }],
  ])('does not erase explicitly invalid %s authority', (_label, workspaceInput) => {
    const dir = project();
    const statePath = path.join(dir, '.fable', 'state.json');
    const before = fs.readFileSync(statePath, 'utf-8');
    const result = dispatch('mutation', 'PostToolUse', 'antigravity', {
      ...workspaceInput,
      toolName: 'apply_patch',
      toolResponse: { ok: true },
    }, dir);
    expect(result.status).toBe(0);
    expect(fs.readFileSync(statePath, 'utf-8')).toBe(before);
  });

  test.each([
    ['profile', 'PreInvocation'],
    ['spawn', 'SubagentStart'],
    ['failure', 'PostToolUse'],
    ['mutation', 'PostToolUse'],
    ['close', 'Stop'],
    ['event', 'UserPromptSubmit'],
  ])('an invalid normalized workspace disables the %s handler', (handler, event) => {
    const dir = project();
    const fableDir = path.join(dir, '.fable');
    const statePath = path.join(fableDir, 'state.json');
    const before = fs.readFileSync(statePath, 'utf-8');
    const result = dispatch(handler, event, 'codex', {
      workspaceRoot: null,
      toolName: 'apply_patch',
      toolResponse: { exitCode: 1 },
      stopHookActive: false,
    }, dir);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(fs.readFileSync(statePath, 'utf-8')).toBe(before);
    expect(fs.existsSync(path.join(fableDir, 'events.jsonl'))).toBe(false);
  });

  test('does not turn a normalized invalid workspace path into process-workspace authority', () => {
    const dir = project();
    const statePath = path.join(dir, '.fable', 'state.json');
    const before = fs.readFileSync(statePath, 'utf-8');
    const result = dispatch('mutation', 'PostToolUse', 'antigravity', {
      workspaceRoot: path.join(dir, 'missing-workspace'),
      toolName: 'apply_patch',
      toolResponse: { ok: true },
    }, dir);
    expect(result.status).toBe(0);
    expect(fs.readFileSync(statePath, 'utf-8')).toBe(before);
  });

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

  test('Codex hook map covers the current supported lifecycle event families', () => {
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
      'SessionEnd',
    ]));
    expect(events).not.toContain('PostToolUseFailure');
    expect(events).not.toContain('Interrupt');
  });
});
