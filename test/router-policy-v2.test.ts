import { describe, expect, test } from 'bun:test';
import { createInitialState } from '../src/core/state.ts';
import { routeTask } from '../src/core/task-router.ts';

describe('routing policy v2', () => {
  test('honors explicit workflow suppression instead of routing on negated keywords', () => {
    expect(routeTask('Implement this bounded change. Do not plan it.').selectedSkill).toBe('fable-execute');
    expect(routeTask('Implement these independent tasks with a single agent, no delegation.').selectedSkill).toBe('fable-execute');
    expect(routeTask('Verify the behavior, code review is out of scope.').selectedSkill).toBe('fable-verify');
  });

  test('returns parallel candidates only when the current task has a real signal for them', () => {
    const simple = routeTask('Inspect the repository and trace the current execution path');
    expect(simple.selectedSkill).toBe('fable-discover');
    expect(simple.parallelCandidates).toEqual([]);

    const mixed = routeTask('Inspect the repository and check the latest official API docs');
    expect(mixed.selectedSkill).toBe('fable-discover');
    expect(mixed.parallelCandidates).toContain('fable-research');
    expect(mixed.parallelCandidates).not.toContain('fable-execute');
  });

  test('uses registry order as a deterministic tie break', () => {
    const decision = routeTask('Inspect the repository, then fix the bug test-first with a regression test');
    expect(decision.scores['fable-discover']).toBe(10);
    expect(decision.scores['fable-tdd']).toBe(10);
    expect(decision.selectedSkill).toBe('fable-discover');
  });

  test('keeps active durable workflow state as a soft continuation signal', () => {
    const state = {
      ...createInitialState('2026-08-28T00:00:00.000Z'),
      phase: 'executing' as const,
      currentSkill: 'fable-execute' as const,
      substantial: true,
    };
    const decision = routeTask('Continue the current bounded task', state);
    expect(decision.selectedSkill).toBe('fable-execute');
    expect(decision.reasons).toContain('project state is already active in fable-execute');
  });

  test('recovery remains the hard lifecycle override', () => {
    const state = {
      ...createInitialState('2026-08-28T00:00:00.000Z'),
      phase: 'recovering' as const,
      currentSkill: 'fable-recover' as const,
      failureStreak: 2,
      substantial: true,
    };
    const decision = routeTask('Release this branch now', state);
    expect(decision.selectedSkill).toBe('fable-recover');
  });
});
