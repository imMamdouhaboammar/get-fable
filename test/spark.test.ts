import { describe, expect, test } from 'bun:test';
import {
  evaluateFableSpark,
  type SparkSignalContext,
} from '../src/core/spark.ts';
import { createInitialState } from '../src/core/state.ts';
import type { FableState } from '../src/core/types.ts';

function makeState(overrides: Partial<FableState> = {}): FableState {
  const base = createInitialState('2026-08-19T00:00:00.000Z', '/workspace/demo');
  return {
    ...base,
    ...overrides,
  };
}

describe('Fable Spark situational awareness micro-policy', () => {
  describe('Rule 1 & Rule 9: Loop detection and repeated failure', () => {
    test('suggests diagnosing repeated failure after two consecutive failures', () => {
      const state = makeState({
        phase: 'recovering',
        currentSkill: 'fable-recover',
        failureStreak: 2,
        substantial: true,
      });

      const spark = evaluateFableSpark({ state });
      expect(spark.silent).toBe(false);
      expect(spark.suggestion).toBe('diagnose the repeated failure');
      expect(spark.source).toBe('failure-loop');
      expect(spark.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('specializes diagnosis when failure mentions integration tests', () => {
      const state = makeState({
        phase: 'recovering',
        currentSkill: 'fable-recover',
        failureStreak: 2,
        substantial: true,
      });

      const spark = evaluateFableSpark({
        state,
        latestError: 'IntegrationTestRunner: timeout on /api/v2/auth',
      });
      expect(spark.suggestion).toBe('diagnose the repeated integration failure');
    });
  });

  describe('Rule 2 & Rule 5: Mutation vs verification delta', () => {
    test('suggests running affected tests when code mutated after verification', () => {
      const state = makeState({
        phase: 'executing',
        currentSkill: 'fable-execute',
        mutationGeneration: 2,
        verifiedGeneration: 1,
        substantial: true,
      });

      const spark = evaluateFableSpark({
        state,
        userIntent: 'fix token refresh regression',
      });
      expect(spark.suggestion).toBe('run the affected refresh tests');
      expect(spark.reasonCode).toBe('verification-stale-after-mutation');
    });

    test('suggests running generic affected tests when no specific keyword exists', () => {
      const state = makeState({
        phase: 'executing',
        currentSkill: 'fable-execute',
        mutationGeneration: 1,
        verifiedGeneration: 0,
        substantial: true,
      });

      const spark = evaluateFableSpark({ state });
      expect(spark.suggestion).toBe('run the affected tests');
    });

    test('suggests running build when build or config files mutated', () => {
      const state = makeState({
        phase: 'executing',
        currentSkill: 'fable-execute',
        mutationGeneration: 3,
        verifiedGeneration: 2,
        substantial: true,
      });

      const spark = evaluateFableSpark({
        state,
        latestMutationSource: 'esbuild.config.mjs',
      });
      expect(spark.suggestion).toBe('run the build');
      expect(spark.reasonCode).toBe('build-verification-stale');
    });
  });

  describe('Rule 5 & Rule 6: Missing gates across specialist skills', () => {
    test('suggests writing failing test in TDD before implementation', () => {
      const state = makeState({
        phase: 'executing',
        currentSkill: 'fable-tdd',
        mutationGeneration: 0,
        verifiedGeneration: 0,
        evidence: [],
      });

      const spark = evaluateFableSpark({ state });
      expect(spark.suggestion).toBe('write the failing test');
      expect(spark.reasonCode).toBe('tdd-missing-failing-test');
    });

    test('suggests reviewing diff when implementation complete but unreviewed', () => {
      const state = makeState({
        phase: 'verifying',
        currentSkill: 'fable-review',
        mutationGeneration: 1,
        verifiedGeneration: 1,
        evidence: [
          {
            kind: 'test',
            source: 'bun test',
            result: 'pass',
            detail: 'all tests green',
            generation: 1,
            timestamp: '2026-08-19T00:01:00.000Z',
          },
        ],
      });

      const spark = evaluateFableSpark({ state });
      expect(spark.suggestion).toBe('review the diff');
    });

    test('suggests fixing review finding when review card has findings', () => {
      const state = makeState({
        phase: 'executing',
        currentSkill: 'fable-review',
        activeCard: 'fix auth boundary bypass finding',
      });

      const spark = evaluateFableSpark({ state });
      expect(spark.suggestion).toBe('fix the review finding');
    });

    test('suggests checking official docs when external API uncertainty arises', () => {
      const state = makeState({
        phase: 'discovering',
        currentSkill: 'fable-research',
      });

      const spark = evaluateFableSpark({
        state,
        userIntent: 'Check Claude hooks API format in official documentation',
      });
      expect(spark.suggestion).toBe('check the current official docs');
    });

    test('suggests delegating independent cards when multiple work items exist', () => {
      const state = makeState({
        phase: 'executing',
        currentSkill: 'fable-delegate',
      });

      const spark = evaluateFableSpark({
        state,
        openCards: ['card 1: build parser', 'card 2: build serializer'],
      });
      expect(spark.suggestion).toBe('delegate the independent cards');
    });

    test('suggests verifying repaired behavior when security passed but bugfix mutated code', () => {
      const state = makeState({
        phase: 'verifying',
        currentSkill: 'fable-security',
        mutationGeneration: 4,
        verifiedGeneration: 3,
        evidence: [
          {
            kind: 'security',
            source: 'codex-security',
            result: 'pass',
            detail: 'no vulnerabilities found in diff',
            generation: 4,
            timestamp: '2026-08-19T00:02:00.000Z',
          },
        ],
      });

      const spark = evaluateFableSpark({
        state,
        userIntent: 'fix SQL injection bug in user query',
      });
      expect(spark.suggestion).toBe('verify the repaired behavior');
      expect(spark.reasonCode).toBe('security-does-not-prove-functional-repair');
    });

    test('suggests preparing handoff when all required gates passed', () => {
      const state = makeState({
        phase: 'complete',
        currentSkill: 'fable-handoff',
        mutationGeneration: 2,
        verifiedGeneration: 2,
        substantial: true,
        evidence: [
          {
            kind: 'test',
            source: 'bun test',
            result: 'pass',
            detail: 'all tests pass',
            generation: 2,
            timestamp: '2026-08-19T00:03:00.000Z',
          },
        ],
      });

      const spark = evaluateFableSpark({ state });
      expect(spark.suggestion).toBe('prepare the handoff');
    });

    test('suggests checking release readiness when release was explicitly requested', () => {
      const state = makeState({
        phase: 'verifying',
        currentSkill: 'fable-release',
        mutationGeneration: 1,
        verifiedGeneration: 1,
      });

      const spark = evaluateFableSpark({
        state,
        userIntent: 'prepare v1.3.0 release and verify package artifact',
      });
      expect(spark.suggestion).toBe('check release readiness');
    });
  });

  describe('Rule 7 & Rule 10: Atomic phrasing and staying silent on ambiguity', () => {
    test('produces exactly one short action of 2-12 words in imperative style', () => {
      const state = makeState({
        phase: 'executing',
        currentSkill: 'fable-execute',
        mutationGeneration: 1,
        verifiedGeneration: 0,
      });

      const spark = evaluateFableSpark({ state });
      expect(spark.suggestion).not.toBeNull();
      const words = spark.suggestion!.trim().split(/\s+/);
      expect(words.length).toBeGreaterThanOrEqual(2);
      expect(words.length).toBeLessThanOrEqual(12);
      expect(spark.suggestion).not.toMatch(/^(I will|Let's|You should|Please|Great)/i);
    });

    test('stays silent when idle with no active intent', () => {
      const state = makeState({
        phase: 'idle',
        currentSkill: null,
        mutationGeneration: 0,
        verifiedGeneration: 0,
      });

      const spark = evaluateFableSpark({ state });
      expect(spark.silent).toBe(true);
      expect(spark.suggestion).toBeNull();
    });

    test('stays silent when work is complete and no open cards or unfinished scope remain', () => {
      const state = makeState({
        phase: 'complete',
        currentSkill: null,
        mutationGeneration: 1,
        verifiedGeneration: 1,
        evidence: [
          {
            kind: 'test',
            source: 'bun test',
            result: 'pass',
            detail: 'passed',
            generation: 1,
            timestamp: '2026-08-19T00:04:00.000Z',
          },
        ],
      });

      const spark = evaluateFableSpark({ state, openCards: [] });
      expect(spark.silent).toBe(true);
      expect(spark.suggestion).toBeNull();
    });
  });
});
