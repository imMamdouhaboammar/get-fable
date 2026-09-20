import { describe, expect, test } from 'bun:test';
import { resolveRoute, ReflexCircuitBreaker } from '../../../src/core/reflex/service.js';
import type {
  ReflexAdvice,
  ReflexAdvisor,
  ReflexConfig,
  ReflexStateEnvelopeV1,
} from '../../../src/core/reflex/types.js';

describe('Reflex resolveRoute Service & Circuit Breaker', () => {
  const baseConfig: ReflexConfig = {
    mode: 'guarded',
    provider: 'typesafe-jev',
    model: 'jev-1.13.0',
    timeoutMs: 1200,
    minMargin: 0.2,
    telemetry: 'local',
  };

  test('mode: off never calls advisor and returns deterministic route', async () => {
    let advisorCalled = false;
    const mockAdvisor: ReflexAdvisor = {
      id: 'typesafe-jev',
      async advise(_envelope: ReflexStateEnvelopeV1): Promise<ReflexAdvice> {
        advisorCalled = true;
        throw new Error('Should not be called');
      },
    };

    const resolution = await resolveRoute('Audit OAuth endpoints for vulnerabilities', null, {
      config: { ...baseConfig, mode: 'off' },
      advisor: mockAdvisor,
    });

    expect(advisorCalled).toBe(false);
    expect(resolution.mode).toBe('off');
    expect(resolution.decision.selectedSkill).toBe('fable-security');
  });

  test('mode: shadow runs advisor, records advice, but returns deterministic decision', async () => {
    const mockAdvisor: ReflexAdvisor = {
      id: 'typesafe-jev',
      async advise(_envelope: ReflexStateEnvelopeV1): Promise<ReflexAdvice> {
        return {
          provider: 'typesafe-jev',
          model: 'jev-1.13.0',
          selectedSkill: 'fable-research',
          probabilities: { 'fable-research': 0.85, 'fable-discover': 0.1 },
          confidence: 0.82,
          signals: {},
          latencyMs: 100,
          stage: 1,
        };
      },
    };

    const resolution = await resolveRoute('Inspect internal state files in repository', null, {
      config: { ...baseConfig, mode: 'shadow' },
      advisor: mockAdvisor,
    });

    expect(resolution.mode).toBe('shadow');
    expect(resolution.decision.selectedSkill).toBe('fable-discover'); // Deterministic decision won
    expect(resolution.advice?.selectedSkill).toBe('fable-research'); // Advice was preserved
  });

  test('gracefully falls back to deterministic decision when advisor throws', async () => {
    const failingAdvisor: ReflexAdvisor = {
      id: 'typesafe-jev',
      async advise(_envelope: ReflexStateEnvelopeV1): Promise<ReflexAdvice> {
        throw new Error('Connection refused');
      },
    };

    const resolution = await resolveRoute('Write regression test and fix the bug', null, {
      config: baseConfig,
      advisor: failingAdvisor,
      circuitBreaker: new ReflexCircuitBreaker(),
    });

    expect(resolution.decision.selectedSkill).toBe('fable-tdd');
    expect(resolution.fallbackReason).toContain('Provider error');
  });

  test('circuit breaker trips after 3 consecutive failures', async () => {
    let callCount = 0;
    const alwaysFailingAdvisor: ReflexAdvisor = {
      id: 'typesafe-jev',
      async advise(_envelope: ReflexStateEnvelopeV1): Promise<ReflexAdvice> {
        callCount++;
        throw new Error('Remote timeout');
      },
    };

    const breaker = new ReflexCircuitBreaker();

    // 1st failure
    await resolveRoute('Task 1', null, { config: baseConfig, advisor: alwaysFailingAdvisor, circuitBreaker: breaker });
    // 2nd failure
    await resolveRoute('Task 2', null, { config: baseConfig, advisor: alwaysFailingAdvisor, circuitBreaker: breaker });
    // 3rd failure (trips breaker)
    await resolveRoute('Task 3', null, { config: baseConfig, advisor: alwaysFailingAdvisor, circuitBreaker: breaker });

    expect(callCount).toBe(3);

    // 4th call: circuit breaker is open, should NOT call advisor
    const resolution = await resolveRoute('Task 4', null, { config: baseConfig, advisor: alwaysFailingAdvisor, circuitBreaker: breaker });
    expect(callCount).toBe(3); // Advisor was NOT called
    expect(resolution.fallbackReason).toContain('circuit breaker is OPEN');
  });

  test('triggers second-stage disambiguation when stage 1 margin is ambiguous', async () => {
    let secondStageCalled = false;
    const disambiguatingAdvisor: ReflexAdvisor = {
      id: 'typesafe-jev',
      async advise(_envelope: ReflexStateEnvelopeV1): Promise<ReflexAdvice> {
        return {
          provider: 'typesafe-jev',
          model: 'jev-1.13.0',
          selectedSkill: 'fable-research',
          // Close margin (0.52 - 0.48 = 0.04 < 0.20)
          probabilities: { 'fable-research': 0.52, 'fable-discover': 0.48 },
          confidence: 0.65,
          signals: {},
          latencyMs: 100,
          stage: 1,
        };
      },
      async adviseSecondStage(_envelope, candidates) {
        secondStageCalled = true;
        expect(candidates).toContain('fable-research');
        expect(candidates).toContain('fable-discover');
        return {
          bestCandidate: 'fable-research',
          confidence: 0.89,
          probabilities: { 'fable-research': 0.89, 'fable-discover': 0.11 },
          candidateFits: 0.95,
          latencyMs: 80,
        };
      },
    };

    const resolution = await resolveRoute('Look up Bun documentation on fetch timeouts', null, {
      config: baseConfig,
      advisor: disambiguatingAdvisor,
    });

    expect(secondStageCalled).toBe(true);
    expect(resolution.decision.selectedSkill).toBe('fable-research');
  });

  test('abstains to deterministic route when second stage returns none_of_these', async () => {
    const noneAdvisor: ReflexAdvisor = {
      id: 'typesafe-jev',
      async advise(_envelope: ReflexStateEnvelopeV1): Promise<ReflexAdvice> {
        return {
          provider: 'typesafe-jev',
          model: 'jev-1.13.0',
          selectedSkill: 'fable-research',
          probabilities: { 'fable-research': 0.51, 'fable-discover': 0.49 },
          confidence: 0.6,
          signals: {},
          latencyMs: 100,
          stage: 1,
        };
      },
      async adviseSecondStage() {
        return {
          bestCandidate: 'none_of_these',
          confidence: 0.95,
          probabilities: { none_of_these: 0.95 },
          candidateFits: 0.1,
          latencyMs: 80,
        };
      },
    };

    const resolution = await resolveRoute('Run full regression test suite', null, {
      config: baseConfig,
      advisor: noneAdvisor,
    });

    // Deterministic route wins because second stage abstained
    expect(resolution.decision.selectedSkill).toBe('fable-tdd');
  });
});
