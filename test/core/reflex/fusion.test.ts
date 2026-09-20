import { describe, expect, test } from 'bun:test';
import { fuseRoute, getRequiredConfidence, getSkillRiskTier } from '../../../src/core/reflex/fusion.js';
import type {
  HardPolicySnapshot,
  ReflexAdvice,
  ReflexConfig,
} from '../../../src/core/reflex/types.js';
import type { RoutingDecision } from '../../../src/core/types.js';

describe('Route Fusion Policy', () => {
  const dummyDeterministic: RoutingDecision = {
    selectedSkill: 'fable-execute',
    selectedPack: 'core',
    taskShape: 'bounded-change',
    confidence: 0.8,
    reasons: ['deterministic fallback'],
    requiresPlan: false,
    requiredGates: ['test'],
    fallbackSkill: null,
    parallelCandidates: [],
    nextSkills: ['fable-verify'],
    scores: { 'fable-execute': 5 } as any,
  };

  const emptyPolicy: HardPolicySnapshot = {
    recoveryLocked: false,
    securityLocked: false,
    releaseLocked: false,
    handoffLocked: false,
    evalLocked: false,
    reasons: [],
    suppressions: {
      suppressResearch: false,
      suppressRelease: false,
      suppressSecurity: false,
      suppressTdd: false,
      suppressPlan: false,
      suppressReview: false,
      suppressDelegation: false,
    },
  };

  const baseConfig: ReflexConfig = {
    mode: 'guarded',
    provider: 'typesafe-jev',
    model: 'jev-1.13.0',
    timeoutMs: 1200,
    minMargin: 0.2,
    telemetry: 'local',
  };

  test('returns deterministic decision when mode is off', () => {
    const res = fuseRoute({
      deterministic: dummyDeterministic,
      policy: emptyPolicy,
      mode: 'off',
      config: baseConfig,
    });
    expect(res.decision.selectedSkill).toBe('fable-execute');
    expect(res.mode).toBe('off');
  });

  test('shadow mode returns deterministic decision while retaining advice', () => {
    const advice: ReflexAdvice = {
      provider: 'typesafe-jev',
      model: 'jev-1.13.0',
      selectedSkill: 'fable-research',
      probabilities: { 'fable-research': 0.9 },
      confidence: 0.88,
      signals: {},
      latencyMs: 150,
      stage: 1,
    };

    const res = fuseRoute({
      deterministic: dummyDeterministic,
      policy: emptyPolicy,
      mode: 'shadow',
      config: baseConfig,
      advice,
    });

    expect(res.decision.selectedSkill).toBe('fable-execute');
    expect(res.advice?.selectedSkill).toBe('fable-research');
  });

  test('guarded mode overrides low-risk skill when confidence and margin clear threshold', () => {
    const advice: ReflexAdvice = {
      provider: 'typesafe-jev',
      model: 'jev-1.13.0',
      selectedSkill: 'fable-research',
      probabilities: { 'fable-research': 0.82, 'fable-discover': 0.1 },
      confidence: 0.8,
      taskShape: 'research',
      signals: {},
      latencyMs: 150,
      stage: 1,
    };

    const res = fuseRoute({
      deterministic: dummyDeterministic,
      policy: emptyPolicy,
      mode: 'guarded',
      config: baseConfig,
      advice,
    });

    expect(res.decision.selectedSkill).toBe('fable-research');
    expect(res.decision.selectedPack).toBe('intelligence');
    expect(res.decision.reasons[0]).toContain('[reflex-fuse]');
  });

  test('guarded mode prohibits downgrading recovery lock', () => {
    const recoveryPolicy: HardPolicySnapshot = {
      ...emptyPolicy,
      recoveryLocked: true,
      reasons: ['repeated failure lock'],
    };

    const recoveryDeterministic: RoutingDecision = {
      ...dummyDeterministic,
      selectedSkill: 'fable-recover',
      selectedPack: 'core',
    };

    const advice: ReflexAdvice = {
      provider: 'typesafe-jev',
      model: 'jev-1.13.0',
      selectedSkill: 'fable-tdd',
      probabilities: { 'fable-tdd': 0.95, 'fable-execute': 0.05 },
      confidence: 0.94,
      signals: {},
      latencyMs: 150,
      stage: 1,
    };

    const res = fuseRoute({
      deterministic: recoveryDeterministic,
      policy: recoveryPolicy,
      mode: 'guarded',
      config: baseConfig,
      advice,
    });

    expect(res.decision.selectedSkill).toBe('fable-recover');
    expect(res.fallbackReason).toContain('Violates recovery lock');
  });

  test('falls back to deterministic when confidence is below risk tier threshold', () => {
    const advice: ReflexAdvice = {
      provider: 'typesafe-jev',
      model: 'jev-1.13.0',
      selectedSkill: 'fable-tdd', // medium risk, requires 0.80
      probabilities: { 'fable-tdd': 0.72, 'fable-execute': 0.15 },
      confidence: 0.74, // Below 0.80
      signals: {},
      latencyMs: 150,
      stage: 1,
    };

    const res = fuseRoute({
      deterministic: dummyDeterministic,
      policy: emptyPolicy,
      mode: 'guarded',
      config: baseConfig,
      advice,
    });

    expect(res.decision.selectedSkill).toBe('fable-execute');
    expect(res.fallbackReason).toContain('does not meet medium-risk threshold');
  });
});
