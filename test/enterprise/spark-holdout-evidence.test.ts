import { describe, expect, test } from 'bun:test';
import { validateSparkHoldoutEvidenceSnapshot } from '../../src/core/eval-runner.ts';

describe('frozen Spark holdout evidence', () => {
  const hashes = { corpusSha256: 'a'.repeat(64), sparkSha256: 'b'.repeat(64), runnerSha256: 'c'.repeat(64) };

  test('accepts fresh Spark evidence meeting the threshold', () => {
    const result = validateSparkHoldoutEvidenceSnapshot({
      schemaVersion: 1, metric: 'enterprise-spark-holdout', capturedAt: '2026-08-19T12:00:00.000Z',
      ...hashes, total: 20, passed: 19, passRate: 0.95, forbiddenViolations: 0,
    }, hashes);
    expect(result.status).toBe('PASS');
    expect(result.fresh).toBe(true);
  });

  test('invalidates Spark evidence after Spark policy changes', () => {
    const result = validateSparkHoldoutEvidenceSnapshot({
      schemaVersion: 1, metric: 'enterprise-spark-holdout', capturedAt: '2026-08-19T12:00:00.000Z',
      ...hashes, total: 20, passed: 20, passRate: 1, forbiddenViolations: 0,
    }, { ...hashes, sparkSha256: 'd'.repeat(64) });
    expect(result.status).toBe('NOT_CHECKED');
    expect(result.fresh).toBe(false);
  });
  test('keeps Spark evidence fresh when only evaluator tooling provenance changes', () => {
    const snapshot = {
      schemaVersion: 1, metric: 'enterprise-spark-holdout', capturedAt: '2026-08-19T12:00:00.000Z',
      ...hashes, total: 20, passed: 19, passRate: 0.95, forbiddenViolations: 0,
    } as const;
    const result = validateSparkHoldoutEvidenceSnapshot(snapshot, { ...hashes, runnerSha256: 'e'.repeat(64) });
    expect(result.status).toBe('PASS');
    expect(result.fresh).toBe(true);
  });

});
