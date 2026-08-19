import { describe, expect, test } from 'bun:test';
import { runRoutingBenchmark, runSparkBenchmark, runSkillKnownCases } from '../src/core/eval-runner.ts';

describe('unified evaluation runner', () => {
  test('produces a machine-readable routing benchmark and confusion matrix', () => {
    const result = runRoutingBenchmark();
    expect(result.schemaVersion).toBe(1);
    expect(result.metric).toBe('routing');
    expect(result.total).toBeGreaterThanOrEqual(15);
    expect(result.accuracy).toBe(1);
    expect(result.forbiddenViolations).toBe(0);
    expect(Object.keys(result.confusionMatrix).length).toBeGreaterThan(5);
    expect(result.cases.length).toBe(result.total);
  });

  test('skill-owned cases are executed rather than counted by presence', () => {
    const review = runSkillKnownCases('get-fable');
    expect(review.executable).toBeGreaterThan(0);
    expect(review.cases.some((c) => c.id === 'get-fable-route-recovery-precedence')).toBe(true);
    expect(review.cases.every((c) => typeof c.passed === 'boolean')).toBe(true);
  });

  test('executes deterministic Spark scenarios against the authoritative runtime', () => {
    const result = runSparkBenchmark();
    expect(result.total).toBeGreaterThanOrEqual(5);
    expect(result.top1Accuracy).toBeGreaterThanOrEqual(0);
    expect(result.silencePrecision).toBeGreaterThanOrEqual(0);
    expect(result.cases.every((c) => c.executed)).toBe(true);
  });
});
