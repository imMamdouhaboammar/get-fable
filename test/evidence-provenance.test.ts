import { describe, expect, test } from 'bun:test';
import {
  addEvidence,
  createInitialState,
  getRepositoryRevision,
  hasFreshPassingEvidence,
  transitionState,
  validateFableState,
} from '../src/core/state.ts';
import { getCoreRepoRoot } from '../src/core/skill-registry.ts';

describe('evidence provenance', () => {
  test('binds new evidence to workspace, generation, scope, and repository revision when supplied', () => {
    const root = getCoreRepoRoot();
    const state = { ...createInitialState('2026-08-19T00:00:00.000Z', root), activeCard: 'enterprise verification' };
    const revision = getRepositoryRevision(root);
    expect(revision).toMatch(/^[0-9a-f]{40}$/);
    const next = addEvidence(state, {
      kind: 'test', source: 'bun test', result: 'pass', detail: 'focused verification passed',
      repositoryRevision: revision || undefined,
      commandCategory: 'test',
      scope: 'test/state-concurrency.test.ts',
    });
    const record = next.evidence.at(-1)!;
    expect(record.workspaceId).toBe(state.workspaceId);
    expect(record.generation).toBe(state.mutationGeneration);
    expect(record.repositoryRevision).toBe(revision);
    expect(record.commandCategory).toBe('test');
    expect(record.scope).toBe('test/state-concurrency.test.ts');
  });

  test('keeps execution receipts typed as provenance rather than behavior evidence', () => {
    const root = getCoreRepoRoot();
    const state = createInitialState('2026-08-19T00:00:00.000Z', root);
    const next = addEvidence(state, { kind: 'receipt', source: 'agentproof', result: 'pass', detail: 'execution receipt', receiptId: 'receipt-123' });
    expect(next.evidence.at(-1)?.receiptId).toBe('receipt-123');
    expect(next.verifiedGeneration).toBe(-1);
  });

  test('rejects evidence explicitly attributed to another workspace', () => {
    const state = createInitialState('2026-08-21T00:00:00.000Z');

    expect(() => addEvidence(state, {
      kind: 'test',
      source: 'bun test',
      result: 'pass',
      detail: 'foreign verification must not advance the local gate',
      workspaceId: 'foreign-workspace',
    })).toThrow('workspaceId does not match the owning workspace');
  });

  test('rejects persisted evidence attributed to another workspace', () => {
    const state = createInitialState('2026-08-21T00:00:00.000Z');
    const persisted = {
      ...state,
      evidence: [{
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'foreign verification must not be loaded',
        generation: 0,
        timestamp: '2026-08-21T00:01:00.000Z',
        workspaceId: 'foreign-workspace',
      }],
    };

    expect(() => validateFableState(persisted)).toThrow(
      'evidence[0].workspaceId does not match the owning workspace'
    );
  });

  test('does not rebind explicitly foreign schema-v1 evidence during migration', () => {
    expect(() => validateFableState({
      schemaVersion: 1,
      phase: 'verifying',
      currentSkill: 'fable-verify',
      failureStreak: 0,
      substantial: true,
      lastDecision: null,
      evidence: [{
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'foreign legacy evidence must retain its provenance',
        timestamp: '2026-08-21T00:01:00.000Z',
        workspaceId: 'foreign-workspace',
      }],
      updatedAt: '2026-08-21T00:01:00.000Z',
    })).toThrow('evidence[0].workspaceId does not match the owning workspace');
  });

  test('keeps legacy unbound evidence readable but not completion-capable', () => {
    const state = createInitialState('2026-08-21T00:00:00.000Z');
    const legacy = validateFableState({
      ...state,
      phase: 'verifying',
      substantial: true,
      verifiedGeneration: 0,
      evidence: [{
        kind: 'test',
        source: 'bun test',
        result: 'pass',
        detail: 'historical evidence without workspace ownership',
        generation: 0,
        timestamp: '2026-08-21T00:01:00.000Z',
      }],
    });

    expect(hasFreshPassingEvidence(legacy)).toBe(false);
    expect(() => transitionState(legacy, 'complete')).toThrow('current mutation generation');
  });

  test('does not skip newer unbound evidence in favor of an older local pass', () => {
    const state = createInitialState('2026-08-21T00:00:00.000Z');
    const withLocalPass = addEvidence({ ...state, phase: 'verifying', substantial: true }, {
      kind: 'test',
      source: 'bun test',
      result: 'pass',
      detail: 'local verification passed first',
    });
    const withNewerUnboundFailure = validateFableState({
      ...withLocalPass,
      evidence: [
        ...withLocalPass.evidence,
        {
          kind: 'test',
          source: 'external test runner',
          result: 'fail',
          detail: 'newer unbound evidence reported failure',
          generation: 0,
          timestamp: '2026-08-21T00:02:00.000Z',
        },
      ],
    });

    expect(hasFreshPassingEvidence(withNewerUnboundFailure)).toBe(false);
    expect(() => transitionState(withNewerUnboundFailure, 'complete')).toThrow(
      'current mutation generation'
    );
  });
});
