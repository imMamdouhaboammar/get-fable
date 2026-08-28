import { describe, expect, test } from 'bun:test';
import {
  addEvidence,
  createInitialState,
  recordMutation,
  transitionState,
  validateFableState,
} from '../src/core/state.ts';
import { loadSkillRegistry } from '../src/core/skill-registry.ts';
import { routeTask } from '../src/core/task-router.ts';
import { compileFableDirective } from '../src/core/prompt-compiler.ts';

describe('canonical skill registry', () => {
  test('loads the ordered lifecycle v2 skill graph', () => {
    const registry = loadSkillRegistry();
    expect(registry.schemaVersion).toBe(2);
    expect(registry.entry).toBe('get-fable');
    expect(registry.skills.map((skill) => skill.id)).toEqual([
      'get-fable',
      'fable-discover',
      'fable-research',
      'fable-plan',
      'fable-tdd',
      'fable-delegate',
      'fable-execute',
      'fable-verify',
      'fable-review',
      'fable-security',
      'fable-release',
      'fable-handoff',
      'fable-eval',
      'fable-recover',
      'fable-dataviz',
      'fable-artifact',
      'fable-simplify',
      'fable-loop',
      'fable-run',
      'fable-memory',
      'fable-config',
      'fable-simulator',
      'fable-cowork',
      'fable-spark',
      'fable-skill-creator',
    ]);
    expect(registry.skills.find((skill) => skill.id === 'fable-security')?.pack).toBe('proof');
    expect(registry.skills.find((skill) => skill.id === 'fable-tdd')?.gates).toContain('red-observed');
  });
});

describe('task routing', () => {
  test('recovery outranks implementation after repeated failure', () => {
    const decision = routeTask('Fix it again because the same test failed twice after retrying');
    expect(decision.selectedSkill).toBe('fable-recover');
    expect(decision.reasons.length).toBeGreaterThan(0);
  });

  test('separates current external research from repository discovery', () => {
    expect(routeTask('Check the latest official API docs before we implement this').selectedSkill).toBe('fable-research');
    expect(routeTask('Inspect the repository and trace the current execution path').selectedSkill).toBe('fable-discover');
  });

  test('routes architecture, TDD, delegation, security, release, handoff, and eval work', () => {
    expect(routeTask('Design a modular migration across several files').selectedSkill).toBe('fable-plan');
    expect(routeTask('Fix the bug test-first and add a regression test').selectedSkill).toBe('fable-tdd');
    expect(routeTask('Split these independent tasks across subagents').selectedSkill).toBe('fable-delegate');
    expect(routeTask('Review this auth change for security vulnerabilities').selectedSkill).toBe('fable-security');
    expect(routeTask('Check whether this branch is ready to release').selectedSkill).toBe('fable-release');
    expect(routeTask('Create a handoff for the next session').selectedSkill).toBe('fable-handoff');
    expect(routeTask('Evaluate this skill change against holdout cases').selectedSkill).toBe('fable-eval');
  });

  test('keeps independent code review distinct from behavior verification', () => {
    expect(routeTask('Code review the diff against repository standards').selectedSkill).toBe('fable-review');
    expect(routeTask('Verify the affected behavior before completion').selectedSkill).toBe('fable-verify');
  });

  test('returns pack, task shape, gates, and fallback metadata', () => {
    const decision = routeTask('Fix the bug test-first and add a regression test');
    expect(decision.selectedPack).toBe('build');
    expect(decision.taskShape).toBe('bug-fix');
    expect(decision.requiredGates).toContain('red-observed');
    expect(decision.fallbackSkill).toBe('fable-recover');
  });
});

describe('durable state', () => {
  test('rejects invalid phase jumps and evidence-free substantial completion', () => {
    const initial = createInitialState('2026-08-13T00:00:00.000Z');
    expect(initial.schemaVersion).toBe(3);
    expect(initial.mutationGeneration).toBe(0);
    expect(initial.verifiedGeneration).toBe(-1);
    expect(() => transitionState(initial, 'complete')).toThrow('Invalid Fable state transition');

    const executing = transitionState({ ...initial, substantial: true }, 'executing');
    const verifying = transitionState(executing, 'verifying');
    expect(() => transitionState(verifying, 'complete')).toThrow('current mutation generation');

    const evidenced = addEvidence(verifying, {
      kind: 'test',
      source: 'bun test',
      result: 'pass',
      detail: '42 tests passed',
      timestamp: '2026-08-13T00:01:00.000Z',
    });
    expect(evidenced.verifiedGeneration).toBe(0);
    expect(transitionState(evidenced, 'complete').phase).toBe('complete');
  });

  test('rejects completion when a failure is newer than the last passing completion evidence', () => {
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

    expect(() => transitionState(failedAfterPass, 'complete')).toThrow('current mutation generation');

    const reverified = addEvidence(failedAfterPass, {
      kind: 'runtime',
      source: 'smoke test',
      result: 'pass',
      detail: 'runtime smoke passed after correction',
      timestamp: '2026-08-13T00:03:00.000Z',
    });
    expect(transitionState(reverified, 'complete').phase).toBe('complete');
  });

  test('invalidates prior verification after a newer workspace mutation', () => {
    const initial = createInitialState('2026-08-13T00:00:00.000Z');
    const executing = transitionState({ ...initial, substantial: true }, 'executing');
    const verifying = transitionState(executing, 'verifying');
    const verified = addEvidence(verifying, {
      kind: 'runtime',
      source: 'smoke',
      result: 'pass',
      detail: 'affected path passed',
      timestamp: '2026-08-13T00:01:00.000Z',
    });
    const completed = transitionState(verified, 'complete');
    const mutated = recordMutation(completed, '2026-08-13T00:02:00.000Z');

    expect(mutated.mutationGeneration).toBe(1);
    expect(mutated.verifiedGeneration).toBe(0);
    expect(() => transitionState(mutated, 'complete')).toThrow('current mutation generation');

    const reverified = addEvidence(mutated, {
      kind: 'test',
      source: 'bun test',
      result: 'pass',
      detail: 'tests passed after final mutation',
      timestamp: '2026-08-13T00:03:00.000Z',
    });
    expect(reverified.verifiedGeneration).toBe(1);
    expect(transitionState(reverified, 'complete').phase).toBe('complete');
  });

  test('does not treat research, receipts, or handoffs as completion proof', () => {
    const initial = createInitialState('2026-08-13T00:00:00.000Z');
    const executing = transitionState({ ...initial, substantial: true }, 'executing');
    const verifying = transitionState(executing, 'verifying');

    for (const kind of ['research', 'receipt', 'handoff'] as const) {
      const recorded = addEvidence(verifying, {
        kind,
        source: kind,
        result: 'pass',
        detail: `${kind} evidence exists`,
      });
      expect(recorded.verifiedGeneration).toBe(-1);
      expect(() => transitionState(recorded, 'complete')).toThrow('current mutation generation');
    }
  });

  test('migrates schema-v1 state into revision-aware schema-v3 state', () => {
    const migrated = validateFableState({
      schemaVersion: 1,
      phase: 'verifying',
      currentSkill: 'fable-verify',
      failureStreak: 0,
      substantial: true,
      lastDecision: null,
      evidence: [
        {
          kind: 'test',
          source: 'bun test',
          result: 'pass',
          detail: 'legacy tests passed',
          timestamp: '2026-08-13T00:01:00.000Z',
        },
      ],
      updatedAt: '2026-08-13T00:01:00.000Z',
    });

    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.mutationGeneration).toBe(0);
    expect(migrated.verifiedGeneration).toBe(-1);
    expect(migrated.evidence[0].generation).toBe(0);
    expect(migrated.evidence[0].workspaceId).toBeUndefined();
    expect(migrated.workspaceId.length).toBeGreaterThan(0);
    expect(() => transitionState(migrated, 'complete')).toThrow('current mutation generation');
  });

  test('rejects malformed nested evidence records field by field', () => {
    const initial = createInitialState('2026-08-13T00:00:00.000Z');
    const validEvidence = {
      kind: 'test',
      source: 'bun test',
      result: 'pass',
      detail: 'targeted tests passed',
      generation: 0,
      timestamp: '2026-08-13T00:01:00.000Z',
    };
    const invalidCases: Array<[string, unknown]> = [
      ['evidence[0]', null],
      ['evidence[0].kind', { ...validEvidence, kind: 'compile' }],
      ['evidence[0].source', { ...validEvidence, source: '' }],
      ['evidence[0].result', { ...validEvidence, result: 'success' }],
      ['evidence[0].detail', { ...validEvidence, detail: '' }],
      ['evidence[0].generation', { ...validEvidence, generation: -1 }],
      ['evidence[0].timestamp', { ...validEvidence, timestamp: '' }],
    ];

    for (const [expectedField, evidence] of invalidCases) {
      expect(() => validateFableState({ ...initial, evidence: [evidence] })).toThrow(expectedField);
    }
  });

  test('rejects malformed lifecycle routing decisions field by field', () => {
    const initial = createInitialState('2026-08-13T00:00:00.000Z');
    const validDecision = routeTask('Code review the diff against repository standards');
    const invalidCases: Array<[string, unknown]> = [
      ['lastDecision', 'fable-review'],
      ['lastDecision.selectedSkill', { ...validDecision, selectedSkill: 'fable-improvise' }],
      ['lastDecision.selectedPack', { ...validDecision, selectedPack: 'magic' }],
      ['lastDecision.taskShape', { ...validDecision, taskShape: 'anything' }],
      ['lastDecision.confidence', { ...validDecision, confidence: 2 }],
      ['lastDecision.requiredGates', { ...validDecision, requiredGates: [''] }],
      ['lastDecision.fallbackSkill', { ...validDecision, fallbackSkill: 'fable-improvise' }],
      ['lastDecision.nextSkills', { ...validDecision, nextSkills: ['fable-improvise'] }],
      [
        'lastDecision.scores.fable-review',
        {
          ...validDecision,
          scores: { ...validDecision.scores, 'fable-review': 'high' },
        },
      ],
      [
        'lastDecision.scores.fable-review',
        {
          ...validDecision,
          scores: { ...validDecision.scores, 'fable-review': -1 },
        },
      ],
    ];

    for (const [expectedField, lastDecision] of invalidCases) {
      expect(() => validateFableState({ ...initial, lastDecision })).toThrow(expectedField);
    }
  });
});

describe('prompt compiler', () => {
  test('injects only the routed specialist contract and current gates', () => {
    const compiled = compileFableDirective('Code review the diff against repository standards');
    expect(compiled.decision.selectedSkill).toBe('fable-review');
    expect(compiled.systemPrompt).toContain('# Fable Review');
    expect(compiled.systemPrompt).not.toContain('# Fable Plan');
    expect(compiled.systemPrompt).toContain('actionable-findings');
    expect(compiled.systemPrompt).toContain('do not claim the underlying model changed');
  });
});
