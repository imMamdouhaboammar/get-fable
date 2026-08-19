import { describe, expect, test } from 'bun:test';
import { validateVerificationHoldoutEvidenceSnapshot } from '../../src/core/verification-eval.ts';

describe('frozen verification holdout evidence', () => {
  const hashes = { corpusSha256: 'a'.repeat(64), stateSha256: 'b'.repeat(64), evaluatorSha256: 'c'.repeat(64) };

  test('accepts fresh passing evidence', () => {
    const result = validateVerificationHoldoutEvidenceSnapshot({
      schemaVersion: 1, metric: 'enterprise-verification-holdout', capturedAt: '2026-08-19T12:00:00.000Z',
      ...hashes, total: 20, passed: 19, passRate: 0.95,
    }, hashes);
    expect(result.status).toBe('PASS');
    expect(result.fresh).toBe(true);
  });

  test('invalidates evidence when the state policy changes', () => {
    const result = validateVerificationHoldoutEvidenceSnapshot({
      schemaVersion: 1, metric: 'enterprise-verification-holdout', capturedAt: '2026-08-19T12:00:00.000Z',
      ...hashes, total: 20, passed: 20, passRate: 1,
    }, { ...hashes, stateSha256: 'd'.repeat(64) });
    expect(result.status).toBe('NOT_CHECKED');
    expect(result.fresh).toBe(false);
  });

  test('keeps evidence fresh when only evaluator tooling provenance changes', () => {
    const result = validateVerificationHoldoutEvidenceSnapshot({
      schemaVersion: 1, metric: 'enterprise-verification-holdout', capturedAt: '2026-08-19T12:00:00.000Z',
      ...hashes, total: 20, passed: 19, passRate: 0.95,
    }, { ...hashes, evaluatorSha256: 'e'.repeat(64) });
    expect(result.status).toBe('PASS');
    expect(result.fresh).toBe(true);
  });
});
