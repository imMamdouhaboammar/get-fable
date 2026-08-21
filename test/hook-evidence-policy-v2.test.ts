import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInitialState, writeFableState } from '../src/core/state.ts';

const root = path.resolve(import.meta.dir, '..');
const tempDirs: string[] = [];

function freshProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-hook-policy-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, '.fable'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.fable', 'LEDGER.md'),
    '- [x] Acceptance: reviewed -- evidence: scoped verification recorded\n'
  );
  writeFableState(dir, createInitialState('2026-08-19T00:00:00.000Z', dir));
  return dir;
}

function runCloseGuard(dir: string) {
  return spawnSync('python3', [path.join(root, 'hooks', 'fable_close_guard.py')], {
    input: JSON.stringify({ cwd: dir, stop_hook_active: false }),
    encoding: 'utf-8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('hook lifecycle v2 evidence policy', () => {
  test('close guard rejects state copied from a different workspace', () => {
    const source = freshProject();
    const target = freshProject();
    const sourceState = fs.readFileSync(path.join(source, '.fable', 'state.json'), 'utf-8');
    fs.writeFileSync(path.join(target, '.fable', 'state.json'), sourceState);

    const result = runCloseGuard(target);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('invalid for the current lifecycle schema');
  });

  test('close guard treats migrated schema-v1 evidence as historical', () => {
    const dir = freshProject();
    const statePath = path.join(dir, '.fable', 'state.json');
    fs.writeFileSync(statePath, JSON.stringify({
      schemaVersion: 1,
      phase: 'complete',
      currentSkill: null,
      failureStreak: 0,
      substantial: true,
      lastDecision: null,
      evidence: [{
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'legacy verification predates workspace ownership',
        timestamp: '2026-08-21T00:01:00.000Z',
      }],
      updatedAt: '2026-08-21T00:01:00.000Z',
    }));

    const result = runCloseGuard(dir);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('current mutation generation');
  });

  test('close guard rejects explicitly foreign schema-v1 evidence during migration', () => {
    const dir = freshProject();
    const statePath = path.join(dir, '.fable', 'state.json');
    fs.writeFileSync(statePath, JSON.stringify({
      schemaVersion: 1,
      phase: 'complete',
      currentSkill: null,
      failureStreak: 0,
      substantial: true,
      lastDecision: null,
      evidence: [{
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'foreign legacy evidence retains its original owner',
        timestamp: '2026-08-21T00:01:00.000Z',
        workspaceId: 'foreign-workspace',
      }],
      updatedAt: '2026-08-21T00:01:00.000Z',
    }));

    const result = runCloseGuard(dir);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('invalid for the current lifecycle schema');
  });

  test('close guard rejects evidence attributed to a different workspace', () => {
    const dir = freshProject();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.phase = 'complete';
    state.substantial = true;
    state.verifiedGeneration = 0;
    state.evidence = [{
      kind: 'test',
      source: 'bun test',
      result: 'pass',
      detail: 'foreign verification must not close this workspace',
      generation: 0,
      timestamp: '2026-08-21T00:01:00.000Z',
      workspaceId: 'foreign-workspace',
    }];
    fs.writeFileSync(statePath, JSON.stringify(state));

    const result = runCloseGuard(dir);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('invalid for the current lifecycle schema');
  });

  test('close guard does not accept legacy evidence without workspace ownership', () => {
    const dir = freshProject();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.phase = 'complete';
    state.substantial = true;
    state.verifiedGeneration = 0;
    state.evidence = [{
      kind: 'test',
      source: 'bun test',
      result: 'pass',
      detail: 'historical evidence without workspace ownership',
      generation: 0,
      timestamp: '2026-08-21T00:01:00.000Z',
    }];
    fs.writeFileSync(statePath, JSON.stringify(state));

    const result = runCloseGuard(dir);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('current mutation generation');
  });

  test('close guard does not skip newer unbound failure after an older local pass', () => {
    const dir = freshProject();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.phase = 'complete';
    state.substantial = true;
    state.verifiedGeneration = 0;
    state.evidence = [
      {
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'local verification passed first',
        generation: 0,
        timestamp: '2026-08-21T00:01:00.000Z',
        workspaceId: state.workspaceId,
      },
      {
        kind: 'test',
        source: 'external test runner',
        result: 'fail',
        detail: 'newer unbound evidence reported failure',
        generation: 0,
        timestamp: '2026-08-21T00:02:00.000Z',
      },
    ];
    fs.writeFileSync(statePath, JSON.stringify(state));

    const result = runCloseGuard(dir);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('current mutation generation');
  });

  test('generic substantial work is not closable by security evidence alone', () => {
    const dir = freshProject();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.phase = 'complete';
    state.substantial = true;
    state.currentSkill = null;
    state.verifiedGeneration = 0;
    state.lastDecision = {
      selectedSkill: 'fable-tdd',
      selectedPack: 'build',
      taskShape: 'feature',
    };
    state.evidence = [
      {
        kind: 'security',
        source: 'security diff review',
        result: 'pass',
        detail: 'no reportable security finding',
        generation: 0,
        timestamp: '2026-08-19T00:01:00.000Z',
      },
    ];
    fs.writeFileSync(statePath, JSON.stringify(state));

    const result = runCloseGuard(dir);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('current mutation generation');
  });

  test('pure security work can close with scoped security evidence', () => {
    const dir = freshProject();
    const statePath = path.join(dir, '.fable', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.phase = 'complete';
    state.substantial = true;
    state.currentSkill = null;
    state.verifiedGeneration = 0;
    state.lastDecision = {
      selectedSkill: 'fable-security',
      selectedPack: 'proof',
      taskShape: 'security',
    };
    state.evidence = [
      {
        kind: 'security',
        source: 'security diff review',
        result: 'pass',
        detail: 'trust boundary reviewed with no reportable finding',
        generation: 0,
        timestamp: '2026-08-19T00:01:00.000Z',
        workspaceId: state.workspaceId,
      },
    ];
    fs.writeFileSync(statePath, JSON.stringify(state));

    const result = runCloseGuard(dir);
    expect(result.status).toBe(0);
  });
});
