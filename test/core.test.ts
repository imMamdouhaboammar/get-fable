import { describe, expect, test } from 'bun:test';
import {
  addEvidence,
  createInitialState,
  transitionState,
  validateFableState,
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

  test('rejects malformed nested evidence records field by field', () => {
    const initial = createInitialState('2026-08-13T00:00:00.000Z');
    const validEvidence = {
      kind: 'test',
      source: 'bun test',
      result: 'pass',
      detail: 'targeted tests passed',
      timestamp: '2026-08-13T00:01:00.000Z',
    };
    const invalidCases: Array<[string, unknown]> = [
      ['evidence[0]', null],
      ['evidence[0].kind', { ...validEvidence, kind: 'compile' }],
      ['evidence[0].source', { ...validEvidence, source: '' }],
      ['evidence[0].result', { ...validEvidence, result: 'success' }],
      ['evidence[0].detail', { ...validEvidence, detail: '' }],
      ['evidence[0].timestamp', { ...validEvidence, timestamp: '' }],
    ];

    for (const [expectedField, evidence] of invalidCases) {
      expect(() => validateFableState({ ...initial, evidence: [evidence] })).toThrow(expectedField);
    }
  });

  test('rejects malformed nested routing decisions field by field', () => {
    const initial = createInitialState('2026-08-13T00:00:00.000Z');
    const validDecision = routeTask('Review this diff before merge');
    const invalidCases: Array<[string, unknown]> = [
      ['lastDecision', 'fable-verify'],
      ['lastDecision.selectedSkill', { ...validDecision, selectedSkill: 'fable-improvise' }],
      ['lastDecision.confidence', { ...validDecision, confidence: 2 }],
      ['lastDecision.reasons', { ...validDecision, reasons: [''] }],
      ['lastDecision.requiresPlan', { ...validDecision, requiresPlan: 'no' }],
      ['lastDecision.nextSkills', { ...validDecision, nextSkills: ['fable-improvise'] }],
      [
        'lastDecision.scores.fable-verify',
        {
          ...validDecision,
          scores: { ...validDecision.scores, 'fable-verify': 'high' },
        },
      ],
    ];

    for (const [expectedField, lastDecision] of invalidCases) {
      expect(() => validateFableState({ ...initial, lastDecision })).toThrow(expectedField);
    }
  });

  test('accepts fully populated valid nested state', () => {
    const initial = createInitialState('2026-08-13T00:00:00.000Z');
    const decision = routeTask('Review this diff before merge');
    const routed = {
      ...initial,
      lastDecision: decision,
      currentSkill: decision.selectedSkill,
    };
    const evidenced = addEvidence(routed, {
      kind: 'review',
      source: 'checker',
      result: 'pass',
      detail: 'independent review found no blocking issue',
      timestamp: '2026-08-13T00:01:00.000Z',
    });

    expect(validateFableState(evidenced)).toEqual(evidenced);
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
