import { describe, expect, test } from 'bun:test';
import { addEvidence, createInitialState, getRepositoryRevision } from '../src/core/state.ts';
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
});
