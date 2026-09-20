import { describe, expect, test } from 'bun:test';
import {
  buildSecondStageQuestions,
  calculateProbabilityMargin,
  isAmbiguous,
} from '../../../src/core/reflex/disambiguation.js';
import type { ReflexAdvice, ReflexConfig, ReflexStateEnvelopeV1 } from '../../../src/core/reflex/types.js';

describe('Reflex Disambiguation & Probability Margin', () => {
  const dummyConfig: ReflexConfig = {
    mode: 'guarded',
    provider: 'typesafe-jev',
    model: 'jev-1.13.0',
    timeoutMs: 1200,
    minMargin: 0.2,
    telemetry: 'local',
  };

  test('calculateProbabilityMargin extracts top-1 and top-2 candidates and margin', () => {
    const probs = {
      'fable-discover': 0.65,
      'fable-research': 0.25,
      'fable-plan': 0.1,
    };

    const result = calculateProbabilityMargin(probs as any);
    expect(result.topSkill).toBe('fable-discover');
    expect(result.topProb).toBe(0.65);
    expect(result.secondSkill).toBe('fable-research');
    expect(result.secondProb).toBe(0.25);
    expect(result.margin).toBeCloseTo(0.4, 2);
  });

  test('isAmbiguous returns true when margin is below minMargin', () => {
    const narrowAdvice: ReflexAdvice = {
      provider: 'typesafe-jev',
      model: 'jev-1.13.0',
      selectedSkill: 'fable-discover',
      probabilities: { 'fable-discover': 0.52, 'fable-research': 0.45 },
      confidence: 0.85,
      signals: {},
      latencyMs: 120,
      stage: 1,
    };

    const dummyEnvelope: ReflexStateEnvelopeV1 = {
      schemaVersion: 1,
      task: 'Check repo docs',
      lifecycle: {
        phase: 'idle',
        currentSkill: null,
        failureState: 'none',
        substantial: false,
        hasActiveCard: false,
        verificationFreshness: 'none',
      },
      deterministic: {
        selectedSkill: 'fable-discover',
        selectedPack: 'core',
        reasons: [],
        requiresPlan: false,
        topCandidates: [],
      },
      constraints: {} as any,
    };

    expect(isAmbiguous(narrowAdvice, dummyEnvelope, dummyConfig)).toBe(true);
  });

  test('buildSecondStageQuestions restricts criteria to top candidates and adds none_of_these', () => {
    const questions = buildSecondStageQuestions(['fable-discover', 'fable-research']);

    expect(questions.best_candidate).toBeDefined();
    expect(questions.best_candidate.type).toBe('choice');
    const criteria = questions.best_candidate.criteria;

    expect(criteria['fable-discover']).toBeDefined();
    expect(criteria['fable-research']).toBeDefined();
    expect(criteria['none_of_these']).toBeDefined();
    expect(criteria['fable-security']).toBeUndefined(); // Excluded from stage 2

    expect(questions.candidate_fits).toBeDefined();
    expect(questions.candidate_fits.type).toBe('noul');
  });
});
