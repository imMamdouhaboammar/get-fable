import { describe, expect, test } from 'bun:test';
import {
  addEvidence,
  createInitialState,
  transitionState,
} from '../src/core/state.ts';
import { loadSkillRegistry } from '../src/core/skill-registry.ts';
import { routeTask } from '../src/core/task-router.ts';
import { compileFableDirective } from '../src/core/prompt-compiler.ts';

describe('canonical skill registry', () => {
  test('loads one ordered six-skill workflow graph', () => {
    const registry = loadSkillRegistry();
    expect(registry.entry).toBe('get-fable');
    expect(registry.skills.map((skill) => skill.id)).toEqual([
      'get-fable',
      'fable-discover',
      'fable-plan',
      'fable-execute',
      'fable-verify',
      'fable-recover',
    ]);
  });
});

describe('task routing', () => {
  test('recovery outranks implementation after repeated failure', () => {
    const decision = routeTask('Fix it again because the same test failed twice after retrying');
    expect(decision.selectedSkill).toBe('fable-recover');
    expect(decision.reasons.length).toBeGreaterThan(0);
  });

  test('routes evidence gathering before planning when current facts are unknown', () => {
    const decision = routeTask('Inspect the repository and official docs to understand current behavior');
    expect(decision.selectedSkill).toBe('fable-discover');
  });

  test('routes architecture work to planning and bounded edits to execution', () => {
    expect(routeTask('Design a modular migration across several files').selectedSkill).toBe('fable-plan');
    expect(routeTask('Fix the typo in src/title.ts').selectedSkill).toBe('fable-execute');
  });
});

describe('durable state', () => {
  test('rejects invalid phase jumps and evidence-free substantial completion', () => {
    const initial = createInitialState('2026-08-13T00:00:00.000Z');
    expect(() => transitionState(initial, 'complete')).toThrow('Invalid Fable state transition');

    const executing = transitionState({ ...initial, substantial: true }, 'executing');
    const verifying = transitionState(executing, 'verifying');
    expect(() => transitionState(verifying, 'complete')).toThrow('without passing evidence');

    const evidenced = addEvidence(verifying, {
      kind: 'test',
      source: 'bun test',
      result: 'pass',
      detail: '42 tests passed',
      timestamp: '2026-08-13T00:01:00.000Z',
    });
    expect(transitionState(evidenced, 'complete').phase).toBe('complete');
  });

  test('rejects completion when a failure is newer than the last passing evidence', () => {
    const initial = createInitialState('2026-08-13T00:00:00.000Z');
    const executing = transitionState({ ...initial, substantial: true }, 'executing');
    const verifying = transitionState(executing, 'verifying');
    const passed = addEvidence(verifying, {
      kind: 'test',
      source: 'bun test',
      result: 'pass',
      detail: 'targeted test passed',
      timestamp: '2026-08-13T00:01:00.000Z',
    });
    const failedAfterPass = addEvidence(passed, {
      kind: 'runtime',
      source: 'smoke test',
      result: 'fail',
      detail: 'runtime smoke failed after the test pass',
      timestamp: '2026-08-13T00:02:00.000Z',
    });

    expect(() => transitionState(failedAfterPass, 'complete')).toThrow('fresh');

    const reverified = addEvidence(failedAfterPass, {
      kind: 'runtime',
      source: 'smoke test',
      result: 'pass',
      detail: 'runtime smoke passed after correction',
      timestamp: '2026-08-13T00:03:00.000Z',
    });
    expect(transitionState(reverified, 'complete').phase).toBe('complete');
  });
});

describe('prompt compiler', () => {
  test('injects only the routed specialist contract instead of the monolithic prompt pack', () => {
    const compiled = compileFableDirective('Review this diff before merge');
    expect(compiled.decision.selectedSkill).toBe('fable-verify');
    expect(compiled.systemPrompt).toContain('# Fable Verify');
    expect(compiled.systemPrompt).not.toContain('# Fable Plan');
    expect(compiled.systemPrompt).toContain('do not claim the underlying model changed');
  });
});
