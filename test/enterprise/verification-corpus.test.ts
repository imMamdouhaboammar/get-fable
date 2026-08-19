import { describe, expect, test } from 'bun:test';
import { runEnterpriseVerificationBenchmark } from '../../src/core/verification-eval.ts';

describe('enterprise verification policy corpus', () => {
  test('executes freshness and completion policy categories separately', () => {
    const result = runEnterpriseVerificationBenchmark();
    expect(result.categories.known.total).toBeGreaterThanOrEqual(8);
    expect(result.categories.negative.total).toBeGreaterThanOrEqual(6);
    expect(result.categories.ambiguous.total).toBeGreaterThanOrEqual(6);
    expect(result.categories.adversarial.total).toBeGreaterThanOrEqual(8);
    expect(result.categories.holdout.status).toBe('NOT_CHECKED');
    expect(result.categories.known.passRate).toBeGreaterThanOrEqual(0.9);
    expect(result.categories.negative.passRate).toBeGreaterThanOrEqual(0.95);
    expect(result.categories.ambiguous.passRate).toBeGreaterThanOrEqual(0.9);
    expect(result.categories.adversarial.passRate).toBeGreaterThanOrEqual(0.95);
  });
});
