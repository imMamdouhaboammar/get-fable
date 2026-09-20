import { describe, expect, test } from 'bun:test';
import {
  runReflexEvaluation,
  STANDARD_REFLEX_BENCHMARK_CORPUS,
  type EvalTestCase,
} from '../../../src/core/reflex/eval/runner.js';
import type {
  ReflexAdvice,
  ReflexAdvisor,
  ReflexStateEnvelopeV1,
} from '../../../src/core/reflex/types.js';

describe('Reflex Evaluation Runner', () => {
  test('corpus contains diverse canonical skill benchmarks', () => {
    expect(STANDARD_REFLEX_BENCHMARK_CORPUS.length).toBeGreaterThanOrEqual(10);
    const skills = new Set(STANDARD_REFLEX_BENCHMARK_CORPUS.map((c) => c.expectedSkill));
    expect(skills.has('fable-security')).toBe(true);
    expect(skills.has('fable-recover')).toBe(true);
    expect(skills.has('fable-tdd')).toBe(true);
    expect(skills.has('fable-research')).toBe(true);
  });

  test('runReflexEvaluation computes metrics cleanly with simulated advisor', async () => {
    const mockAdvisor: ReflexAdvisor = {
      id: 'typesafe-jev',
      async advise(envelope: ReflexStateEnvelopeV1): Promise<ReflexAdvice> {
        // Echo deterministic choice with high confidence
        const skill = envelope.deterministic.selectedSkill;
        return {
          provider: 'typesafe-jev',
          model: 'jev-1.13.0',
          selectedSkill: skill,
          probabilities: { [skill]: 0.95 },
          confidence: 0.92,
          signals: {},
          latencyMs: 15,
          stage: 1,
        };
      },
    };

    const smallCorpus: EvalTestCase[] = [
      {
        id: '1',
        task: 'Audit OAuth token security',
        expectedSkill: 'fable-security',
        category: 'security',
      },
      {
        id: '2',
        task: 'Failing twice with stale build cache',
        expectedSkill: 'fable-recover',
        category: 'recovery',
      },
    ];

    const report = await runReflexEvaluation(smallCorpus, {
      advisor: mockAdvisor,
      config: {
        mode: 'guarded',
        provider: 'typesafe-jev',
        model: 'jev-1.13.0',
        timeoutMs: 1000,
        minMargin: 0.2,
        telemetry: 'off',
      },
    });

    expect(report.totalCases).toBe(2);
    expect(report.deterministic.top1Accuracy).toBe(1.0);
    expect(report.hybridGuarded.top1Accuracy).toBe(1.0);
    expect(report.hybridGuarded.brierScore).toBeLessThan(0.05);
  });
});
