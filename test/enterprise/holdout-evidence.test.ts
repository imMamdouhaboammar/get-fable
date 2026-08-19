import { describe, expect, test } from 'bun:test';
import { validateRoutingHoldoutEvidenceSnapshot } from '../../src/core/eval-runner.ts';

describe('frozen routing holdout evidence', () => {
  const hashes = { corpusSha256: 'a'.repeat(64), routerSha256: 'b'.repeat(64), runnerSha256: 'c'.repeat(64) };

  test('accepts a fresh passing snapshot bound to the exact corpus and router', () => {
    const result = validateRoutingHoldoutEvidenceSnapshot({
      schemaVersion: 1, metric: 'enterprise-routing-holdout', capturedAt: '2026-08-19T12:00:00.000Z',
      ...hashes, total: 20, passed: 19, passRate: 0.95, forbiddenViolations: 0,
    }, hashes);
    expect(result.status).toBe('PASS');
    expect(result.fresh).toBe(true);
  });

  test('marks evidence stale when the router under test changes', () => {
    const result = validateRoutingHoldoutEvidenceSnapshot({
      schemaVersion: 1, metric: 'enterprise-routing-holdout', capturedAt: '2026-08-19T12:00:00.000Z',
      ...hashes, total: 20, passed: 20, passRate: 1, forbiddenViolations: 0,
    }, { ...hashes, routerSha256: 'd'.repeat(64) });
    expect(result.status).toBe('NOT_CHECKED');
    expect(result.fresh).toBe(false);
  });
  test('keeps routing evidence fresh when only evaluator tooling provenance changes', () => {
    const snapshot = {
      schemaVersion: 1, metric: 'enterprise-routing-holdout', capturedAt: '2026-08-19T12:00:00.000Z',
      ...hashes, total: 20, passed: 19, passRate: 0.95, forbiddenViolations: 0,
    } as const;
    const result = validateRoutingHoldoutEvidenceSnapshot(snapshot, { ...hashes, runnerSha256: 'e'.repeat(64) });
    expect(result.status).toBe('PASS');
    expect(result.fresh).toBe(true);
  });

});
