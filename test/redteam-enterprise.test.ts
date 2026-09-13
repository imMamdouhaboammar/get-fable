import { describe, expect, test } from 'bun:test';
import http from 'node:http';
import {
  calculateCvssV3,
  deriveComplianceMappings,
  diffWithBaseline,
} from '../src/core/redteam/correlation.ts';
import {
  calculateExecutiveGrade,
  estimateMttrHours,
  generateRunAttestation,
} from '../src/core/redteam/engine.ts';
import {
  CircuitBreakerError,
  EnvelopeHttpClient,
  buildExecutionEnvelope,
} from '../src/core/redteam/envelope.ts';
import {
  isCloudMetadataIp,
  isIpInCidr,
  isRfc1918PrivateIp,
  isTargetInScope,
  validateMaintenanceWindow,
} from '../src/core/redteam/scope.ts';
import type { RedTeamFinding, RedTeamSummary } from '../src/core/redteam/types.ts';

describe('Enterprise RedTeam Governance & Scope Guards', () => {
  test('isIpInCidr correctly evaluates IPv4 subnet membership', () => {
    expect(isIpInCidr('10.0.5.23', '10.0.0.0/8')).toBe(true);
    expect(isIpInCidr('192.168.1.50', '192.168.1.0/24')).toBe(true);
    expect(isIpInCidr('192.168.2.1', '192.168.1.0/24')).toBe(false);
    expect(isIpInCidr('172.16.5.9', '172.16.0.0/12')).toBe(true);
    expect(isIpInCidr('172.32.0.1', '172.16.0.0/12')).toBe(false);
  });

  test('isCloudMetadataIp identifies protected cloud endpoints', () => {
    expect(isCloudMetadataIp('169.254.169.254')).toBe(true);
    expect(isCloudMetadataIp('100.100.100.200')).toBe(true);
    expect(isCloudMetadataIp('metadata.google.internal')).toBe(true);
    expect(isCloudMetadataIp('api.example.com')).toBe(false);
    expect(isCloudMetadataIp('127.0.0.1')).toBe(false);
  });

  test('isRfc1918PrivateIp detects enterprise private subnets', () => {
    expect(isRfc1918PrivateIp('10.10.10.10')).toBe(true);
    expect(isRfc1918PrivateIp('192.168.0.1')).toBe(true);
    expect(isRfc1918PrivateIp('172.20.0.1')).toBe(true);
    expect(isRfc1918PrivateIp('8.8.8.8')).toBe(false);
  });

  test('isTargetInScope blocks cloud metadata unless explicitly allowed', () => {
    expect(isTargetInScope('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(
      isTargetInScope('http://169.254.169.254/latest/meta-data', {
        allowedHosts: ['169.254.169.254'],
        allowLocalhost: false,
      })
    ).toBe(true);
  });

  test('isTargetInScope accepts targets matching allowedCidrs', () => {
    expect(
      isTargetInScope('http://10.20.30.40:8080/api', {
        allowedHosts: [],
        allowedCidrs: ['10.0.0.0/8'],
        allowLocalhost: false,
      })
    ).toBe(true);

    expect(
      isTargetInScope('http://192.168.1.100/api', {
        allowedHosts: [],
        allowedCidrs: ['10.0.0.0/8'],
        allowLocalhost: false,
      })
    ).toBe(false);
  });

  test('validateMaintenanceWindow enforces scan schedule', () => {
    const window = { startUtcHour: 2, endUtcHour: 5, enforce: true };
    expect(validateMaintenanceWindow(window, 3).allowed).toBe(true);
    expect(validateMaintenanceWindow(window, 12).allowed).toBe(false);

    // Overnight window (22:00 to 04:00)
    const overnightWindow = { startUtcHour: 22, endUtcHour: 4, enforce: true };
    expect(validateMaintenanceWindow(overnightWindow, 23).allowed).toBe(true);
    expect(validateMaintenanceWindow(overnightWindow, 2).allowed).toBe(true);
    expect(validateMaintenanceWindow(overnightWindow, 15).allowed).toBe(false);
  });
});

describe('Enterprise Resilience & Circuit Breaker', () => {
  test('EnvelopeHttpClient trips to OPEN when error rate exceeds threshold', async () => {
    let reqCount = 0;
    const server = http.createServer((_req, res) => {
      reqCount++;
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Service Degraded');
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;
    const url = `http://127.0.0.1:${port}/test`;

    const envelope = buildExecutionEnvelope(
      { allowedHosts: ['127.0.0.1'], allowLocalhost: true },
      {
        circuitBreaker: {
          enabled: true,
          failureThresholdPercent: 50,
          sampleWindowSize: 5,
          recoveryTimeoutMs: 200,
        },
      }
    );

    const client = new EnvelopeHttpClient(envelope);

    let tripped = false;
    for (let i = 0; i < 10; i++) {
      try {
        await client.fetch(url, { skipRateLimit: true });
      } catch (err) {
        if (err instanceof CircuitBreakerError) {
          tripped = true;
          break;
        }
      }
    }

    server.close();
    expect(tripped).toBe(true);
    expect(client.getCircuitBreakerState()).toBe('OPEN');
  });
});

describe('Enterprise Compliance & CVSS v3.1 Scoring', () => {
  test('calculateCvssV3 generates valid vector and score for critical injection', () => {
    const finding: RedTeamFinding = {
      id: 'f-sqli',
      title: 'SQL Injection in user parameter',
      category: 'injection',
      severity: 'critical',
      description: 'SQL syntax error returned in query response',
      target: 'http://localhost:3000/api/search',
      evidence: { reproCurl: 'curl http://localhost:3000/api/search?q=test' },
      remediation: 'Use parameterized queries',
      cwe: 'CWE-89',
    };

    const cvss = calculateCvssV3(finding);
    expect(cvss.score).toBe(9.8);
    expect(cvss.rating).toBe('Critical');
    expect(cvss.vector).toContain('CVSS:3.1/');
    expect(cvss.vector).toContain('AV:N');
    expect(cvss.vector).toContain('C:H/I:H/A:H');
  });

  test('deriveComplianceMappings maps categories to OWASP API, PCI-DSS, and SOC 2', () => {
    const idorFinding: RedTeamFinding = {
      id: 'f-idor',
      title: 'BOLA vulnerability on /invoices/{id}',
      category: 'idor-bola',
      severity: 'high',
      description: 'User A can view User B invoices',
      target: 'http://localhost:3000/api/invoices/102',
      evidence: {},
      remediation: 'Check tenant ownership',
      cwe: 'CWE-639',
    };

    const comp = deriveComplianceMappings(idorFinding);
    expect(comp.owaspApi).toBe('API1:2023-Broken Object Level Authorization');
    expect(comp.pciDss).toContain('Req 6.2.4');
    expect(comp.soc2).toContain('CC6.1');
    expect(comp.owaspTop10).toContain('A01:2021');
  });
});

describe('Enterprise Baseline Diffing & Attestation', () => {
  test('diffWithBaseline detects regressions and persistent findings', () => {
    const baselineFinding: RedTeamFinding = {
      id: 'b-1',
      fingerprint: 'fp-old-idor',
      title: 'Known BOLA',
      category: 'idor-bola',
      severity: 'high',
      description: 'Legacy BOLA',
      target: 'http://localhost:3000/api/doc/1',
      evidence: {},
      remediation: 'Fix ownership',
    };

    const newRegression: RedTeamFinding = {
      id: 'n-1',
      fingerprint: 'fp-new-leak',
      title: 'Leaked .env file',
      category: 'sensitive-exposure',
      severity: 'critical',
      description: 'Leaked .env',
      target: 'http://localhost:3000/.env',
      evidence: {},
      remediation: 'Block .env',
    };

    const currentFindings = [baselineFinding, newRegression];
    const diff = diffWithBaseline(currentFindings, [baselineFinding]);

    expect(diff.hasRegressions).toBe(true);
    expect(diff.newFindings.length).toBe(1);
    expect(diff.newFindings[0].id).toBe('n-1');
    expect(diff.persistentFindings.length).toBe(1);
    expect(diff.resolvedFindings.length).toBe(0);
  });

  test('diffWithBaseline respects suppressed fingerprints', () => {
    const suppressedFinding: RedTeamFinding = {
      id: 's-1',
      fingerprint: 'fp-accepted-risk',
      title: 'Accepted CORS',
      category: 'cors-misconfiguration',
      severity: 'medium',
      description: 'CORS on internal staging',
      target: 'http://localhost:3000/cors',
      evidence: {},
      remediation: 'Tighten CORS',
    };

    const diff = diffWithBaseline([suppressedFinding], [], ['fp-accepted-risk']);
    expect(diff.suppressedCount).toBe(1);
    expect(diff.newFindings.length).toBe(0);
    expect(diff.hasRegressions).toBe(false);
  });

  test('generateRunAttestation produces deterministic SHA-256 seal', () => {
    const summary: RedTeamSummary = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 0,
      info: 0,
      total: 3,
    };

    const attestation = generateRunAttestation(
      'http://localhost:3000',
      'comprehensive',
      ['native', 'akto'],
      summary,
      { allowedHosts: ['localhost'] }
    );

    expect(attestation.attestationVersion).toBe('1.0.0');
    expect(attestation.attestationHash).toMatch(/^[0-9a-f]{64}$/);
    expect(attestation.scopeDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(attestation.findingsCount).toBe(3);
  });

  test('calculateExecutiveGrade and estimateMttrHours compute correct values', () => {
    expect(calculateExecutiveGrade({ critical: 1, high: 0, medium: 0, low: 0, info: 0, total: 1 })).toBe('F');
    expect(calculateExecutiveGrade({ critical: 0, high: 3, medium: 0, low: 0, info: 0, total: 3 })).toBe('D');
    expect(calculateExecutiveGrade({ critical: 0, high: 1, medium: 0, low: 0, info: 0, total: 1 })).toBe('C');
    expect(calculateExecutiveGrade({ critical: 0, high: 0, medium: 3, low: 0, info: 0, total: 3 })).toBe('B');
    expect(calculateExecutiveGrade({ critical: 0, high: 0, medium: 0, low: 2, info: 0, total: 2 })).toBe('A');

    const mttr = estimateMttrHours({ critical: 1, high: 2, medium: 3, low: 4, info: 0, total: 10 });
    expect(mttr).toBe(26);
  });
});
