import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInitialState, writeFableState } from '../src/core/state.ts';

const root = path.resolve(import.meta.dir, '..');
const tempDirs: string[] = [];

function project(openLedger = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-antigravity-contract-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, '.fable'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.fable', 'LEDGER.md'),
    openLedger
      ? '- [ ] Acceptance: verify Antigravity hook contract\n'
      : '- [x] Acceptance: verified -- evidence: contract test\n'
  );
  writeFableState(dir, createInitialState('2026-08-28T00:00:00.000Z', dir));
  return dir;
}

function dispatch(handler: string, event: string, input: Record<string, unknown>) {
  return spawnSync(
    'python3',
    [
      path.join(root, 'hooks', 'fable_hook_dispatch.py'),
      '--handler', handler,
      '--event', event,
      '--host', 'antigravity',
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

describe('Antigravity 2.0 native hook contract', () => {
  test('translates PreInvocation profile context to ephemeral injectSteps', () => {
    const dir = project();
    const result = dispatch('profile', 'PreInvocation', {
      conversationId: 'ag-conversation',
      workspacePaths: [dir],
      modelName: 'gemini-model',
      invocationNum: 1,
    });

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(Array.isArray(output.injectSteps)).toBe(true);
    expect(output.injectSteps.length).toBeGreaterThan(0);
    expect(output.injectSteps[0].ephemeralMessage).toContain('[get-fable]');
  });

  test('denies unbounded native subagent delegation using Antigravity decision JSON', () => {
    const dir = project();
    const result = dispatch('spawn', 'PreToolUse', {
      conversationId: 'ag-conversation',
      workspacePaths: [dir],
      stepIdx: 3,
      toolCall: {
        name: 'invoke_subagent',
        args: {
          Subagents: [
            {
              Role: 'reviewer',
              TypeName: 'reviewer',
              Prompt: 'Review the repository independently. '.repeat(70),
            },
          ],
        },
      },
    });

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.decision).toBe('deny');
    expect(output.reason).toContain('no OPEN ledger card');
  });

  test('attributes native run_command errors and enters recovery after two failures', () => {
    const dir = project();
    const input = {
      conversationId: 'ag-command-session',
      workspacePaths: [dir],
      stepIdx: 4,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'bun test', Cwd: dir },
      },
      error: 'exit status 1',
    };

    expect(dispatch('failure', 'PostToolUse', input).status).toBe(0);
    const second = dispatch('failure', 'PostToolUse', input);
    expect(second.status).toBe(0);
    expect(JSON.parse(second.stdout)).toEqual({});

    const state = JSON.parse(fs.readFileSync(path.join(dir, '.fable', 'state.json'), 'utf-8'));
    expect(state.failureStreak).toBe(2);
    expect(state.phase).toBe('recovering');
    expect(state.currentSkill).toBe('fable-recover');
  });

  test('tracks native write_to_file and replace_file_content mutations', () => {
    const dir = project();
    const statePath = path.join(dir, '.fable', 'state.json');

    for (const toolName of ['write_to_file', 'replace_file_content']) {
      const result = dispatch('mutation', 'PostToolUse', {
        conversationId: 'ag-mutation-session',
        workspacePaths: [dir],
        toolCall: {
          name: toolName,
          args: { TargetFile: path.join(dir, 'example.ts') },
        },
      });
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({});
    }

    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    expect(state.mutationGeneration).toBe(2);
    expect(state.substantial).toBe(true);
  });

  test('translates completion blocking into Antigravity Stop continue semantics', () => {
    const dir = project(true);
    const result = dispatch('close', 'Stop', {
      conversationId: 'ag-stop-session',
      workspacePaths: [dir],
      executionNum: 2,
    });

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.decision).toBe('continue');
    expect(output.reason).toContain('open ledger card');
  });
});
