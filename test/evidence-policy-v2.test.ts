import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import {
  addEvidence,
  applyRoutingDecision,
  createInitialState,
  recordMutation,
  transitionState,
  validateFableState,
} from '../src/core/state.ts';
import { routeTask } from '../src/core/task-router.ts';

describe('lifecycle v2 evidence policy', () => {
  test('rejects schema-v2 state copied into a different workspace', () => {
    const first = path.join(process.cwd(), 'workspace-a');
    const second = path.join(process.cwd(), 'workspace-b');
    const state = createInitialState('2026-08-19T00:00:00.000Z', first);

    expect(() => validateFableState(state, second)).toThrow(
      'workspaceId does not match the current workspace'
    );
  });

  test('generic feature work cannot complete from a security pass alone', () => {
    const initial = createInitialState('2026-08-19T00:00:00.000Z');
    const routed = applyRoutingDecision(
      initial,
      routeTask('Fix the bug test-first and add a regression test')
    );
    const mutated = recordMutation(routed);
    const verifying = transitionState(mutated, 'verifying');
    const securityOnly = addEvidence(verifying, {
      kind: 'security',
      source: 'security diff review',
      result: 'pass',
      detail: 'no reportable security finding',
    });

    expect(securityOnly.verifiedGeneration).toBe(-1);
    expect(() => transitionState(securityOnly, 'complete')).toThrow(
      'current mutation generation'
    );
  });

  test('a pure security review can use security evidence as its completion proof', () => {
    const initial = createInitialState('2026-08-19T00:00:00.000Z');
    const routed = applyRoutingDecision(
      initial,
      routeTask('Review this authorization change for security vulnerabilities')
    );
    const evidenced = addEvidence(routed, {
      kind: 'security',
      source: 'security diff review',
      result: 'pass',
      detail: 'changed trust boundary reviewed with no reportable finding',
    });

    expect(routed.currentSkill).toBe('fable-security');
    expect(evidenced.verifiedGeneration).toBe(0);
    expect(transitionState(evidenced, 'complete').phase).toBe('complete');
  });

  test('security evidence does not replace functional proof after a security repair mutation', () => {
    const initial = createInitialState('2026-08-19T00:00:00.000Z');
    const securityReview = applyRoutingDecision(
      initial,
      routeTask('Review this authorization change for security vulnerabilities')
    );
    const repairDecision = routeTask('Fix the bug test-first and add a regression test');
    const repairing = applyRoutingDecision(securityReview, repairDecision);
    const mutated = recordMutation(repairing);
    const verifying = transitionState(mutated, 'verifying');
    const securityPass = addEvidence(verifying, {
      kind: 'security',
      source: 'security rescan',
      result: 'pass',
      detail: 'finding is no longer reportable',
    });

    expect(securityPass.verifiedGeneration).toBe(-1);

    const functionalPass = addEvidence(securityPass, {
      kind: 'test',
      source: 'bun test',
      result: 'pass',
      detail: 'authorization behavior and regression tests passed',
    });
    expect(functionalPass.verifiedGeneration).toBe(1);
    expect(transitionState(functionalPass, 'complete').phase).toBe('complete');
  });
});
