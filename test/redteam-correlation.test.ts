import { describe, expect, test } from 'bun:test';
import {
  calculatePriorityBreakdown,
  computeCanonicalFingerprint,
  correlateAndDeduplicateFindings,
  normalizeRouteTemplate,
} from '../src/core/redteam/correlation.ts';
import type { RedTeamFinding } from '../src/core/redteam/types.ts';

describe('RedTeam Canonical Fingerprinting & Correlation Engine', () => {
  test('normalizeRouteTemplate collapses dynamic path parameters into templates', () => {
    const r1 = normalizeRouteTemplate('http://127.0.0.1:3000/users/123');
    expect(r1.asset).toBe('http://127.0.0.1:3000');
    expect(r1.routeTemplate).toBe('/users/{id}');
    expect(r1.dynamicParams).toContain('123');

    const r2 = normalizeRouteTemplate('/orders/550e8400-e29b-41d4-a716-446655440000/items');
    expect(r2.routeTemplate).toBe('/orders/{uuid}/items');

    const r3 = normalizeRouteTemplate('https://api.domain.com/v1/sessions/deadbeefcafe12345678');
    expect(r3.asset).toBe('https://api.domain.com');
    expect(r3.routeTemplate).toBe('/v1/sessions/{hex}');
  });

  test('canonical fingerprints match across identical route templates and root causes', () => {
    const findingA: RedTeamFinding = {
      id: 'f-user-1',
      title: 'BOLA on User 123',
      category: 'idor-bola',
      severity: 'high',
      description: 'Tenant object isolation failure',
      target: 'http://127.0.0.1:3000/users/123',
      evidence: { request: { method: 'GET', url: 'http://127.0.0.1:3000/users/123' } },
      remediation: 'Check ownership',
      cwe: 'CWE-639',
    };

    const findingB: RedTeamFinding = {
      id: 'f-user-2',
      title: 'BOLA on User 456',
      category: 'idor-bola',
      severity: 'high',
      description: 'Tenant object isolation failure',
      target: 'http://127.0.0.1:3000/users/456',
      evidence: { request: { method: 'GET', url: 'http://127.0.0.1:3000/users/456' } },
      remediation: 'Check ownership',
      cwe: 'CWE-639',
    };

    const fpA = computeCanonicalFingerprint(findingA);
    const fpB = computeCanonicalFingerprint(findingB);

    expect(fpA).toBe(fpB);
    expect(fpA.startsWith('RT-FP-')).toBe(true);
  });

  test('distinct vulnerability classes on the exact same endpoint produce different fingerprints', () => {
    const authBypass: RedTeamFinding = {
      id: 'f-admin-1',
      title: 'Admin Missing Auth',
      category: 'auth-bypass',
      severity: 'high',
      description: 'Unauthenticated endpoint',
      target: 'http://127.0.0.1:3000/api/admin/users',
      evidence: { request: { method: 'POST', url: 'http://127.0.0.1:3000/api/admin/users' } },
      remediation: 'Require auth',
      cwe: 'CWE-306',
    };

    const massAssignment: RedTeamFinding = {
      id: 'f-admin-2',
      title: 'Admin Mass Assignment',
      category: 'mass-assignment',
      severity: 'medium',
      description: 'Unfiltered role field assignment',
      target: 'http://127.0.0.1:3000/api/admin/users',
      evidence: { request: { method: 'POST', url: 'http://127.0.0.1:3000/api/admin/users' } },
      remediation: 'Filter fields',
      cwe: 'CWE-915',
    };

    const fp1 = computeCanonicalFingerprint(authBypass);
    const fp2 = computeCanonicalFingerprint(massAssignment);

    expect(fp1).not.toBe(fp2);
  });

  test('correlateAndDeduplicateFindings merges multi-tool evidence into one canonical finding with boosted confidence', () => {
    const nucleiFinding: RedTeamFinding = {
      id: 'nuclei-f1',
      title: 'Nuclei: .env leak',
      category: 'sensitive-exposure',
      severity: 'high',
      description: 'Found exposed environment config',
      target: 'http://127.0.0.1:3000/.env',
      evidence: { rawOutput: 'DATABASE_URL found in body', sourceTool: 'nuclei' },
      remediation: 'Block .env',
      cwe: 'CWE-200',
      sourceTool: 'nuclei',
      confidence: 0.85,
    };

    const nativeFinding: RedTeamFinding = {
      id: 'native-f1',
      title: 'Native: Exposed .env file',
      category: 'sensitive-exposure',
      severity: 'critical',
      description: 'Verified 200 OK with secret keywords',
      target: 'http://127.0.0.1:3000/.env',
      evidence: {
        reproCurl: 'curl -i http://127.0.0.1:3000/.env',
        response: { status: 200 },
        sourceTool: 'native',
      },
      remediation: 'Block .env',
      cwe: 'CWE-200',
      sourceTool: 'native',
      confidence: 0.95,
      evidenceLevel: 'reproduced',
    };

    const raw = [nucleiFinding, nativeFinding];
    const correlated = correlateAndDeduplicateFindings(raw);

    // 2 tool detections on same root cause must collapse into 1 canonical finding
    expect(correlated.length).toBe(1);

    const merged = correlated[0];
    expect(merged.severity).toBe('critical'); // upgraded to highest severity
    expect(merged.evidenceLevel).toBe('reproduced'); // upgraded to highest level
    expect(merged.evidenceList?.length).toBe(2); // contains both evidence sources
    expect(merged.sourceTool).toContain('nuclei');
    expect(merged.sourceTool).toContain('native');
    expect(merged.confidence).toBeGreaterThanOrEqual(0.95); // multi-tool confidence boost
    expect(merged.lifecycle).toBe('reproduced');
    expect(merged.priority).toBeDefined();
    expect(merged.priority?.score).toBeGreaterThan(0.7);
  });

  test('calculatePriorityBreakdown preserves raw metrics and computes calibrated score', () => {
    const finding: Partial<RedTeamFinding> = {
      severity: 'high',
      evidenceLevel: 'reproduced',
      category: 'idor-bola',
      target: 'https://production.api.com/users/123',
      evidence: { reproCurl: 'curl -i https://production.api.com/users/123' },
    };

    const breakdown = calculatePriorityBreakdown(finding);
    expect(breakdown.severityWeight).toBe(0.75);
    expect(breakdown.confidence).toBe(0.95);
    expect(breakdown.exploitability).toBe(0.85);
    expect(breakdown.exposure).toBe(0.85);
    expect(breakdown.assetCriticality).toBe(0.85);
    expect(breakdown.score).toBeGreaterThan(0.8);
  });
});
