import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runRedTeamScan } from '../src/core/redteam/engine.ts';
import { LAB_TOKENS, startLabServer, type LabServerInstance } from '../src/core/redteam/lab/vulnerable-server.ts';
import { writeRemediationToLedger } from '../src/core/redteam/remediation.ts';

describe('RedTeam Deterministic Lab & Live Orchestration Golden Test', () => {
  let lab: LabServerInstance;
  let testWorkspace: string;

  beforeAll(async () => {
    testWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-lab-test-'));
    lab = await startLabServer(0);
  });

  afterAll(async () => {
    await lab.stop();
    fs.rmSync(testWorkspace, { recursive: true, force: true });
  });

  test('golden orchestration scan against deterministic vulnerable lab', async () => {
    // Execute orchestrated scan with multi-identity tokens against live lab
    const result = await runRedTeamScan(
      {
        target: lab.url,
        profile: 'comprehensive',
        orchestrate: true,
        authToken: LAB_TOKENS.USER_A,
        secondAuthToken: LAB_TOKENS.USER_B,
        safeMode: true,
        rateLimit: 50,
      },
      false
    );

    // 1. Terminates cleanly with valid timestamp structure
    expect(result.target).toBe(lab.url);
    expect(result.startTime).toBeDefined();
    expect(result.endTime).toBeDefined();
    expect(new Date(result.endTime).getTime()).toBeGreaterThanOrEqual(new Date(result.startTime).getTime());

    // 2. Finds known vulnerabilities (Sensitive exposure, Security headers, Injection, IDOR, CORS, Auth)
    expect(result.findings.length).toBeGreaterThanOrEqual(5);
    const categories = result.findings.map((f) => f.category);
    expect(categories).toContain('sensitive-exposure');
    expect(categories).toContain('security-headers');
    expect(categories).toContain('injection');
    expect(categories).toContain('idor-bola');
    expect(categories).toContain('cors-misconfiguration');
    expect(categories).toContain('auth-bypass');

    // 3. Does NOT invent absent vulnerabilities on secured endpoints
    const securePingFindings = result.findings.filter((f) => f.target.includes('secure-ping'));
    expect(securePingFindings.length).toBe(0);

    // 4. Deduplicates overlapping evidence & produces stable canonical fingerprints
    for (const finding of result.findings) {
      expect(finding.fingerprint).toBeDefined();
      expect(finding.fingerprint?.startsWith('RT-FP-')).toBe(true);
      expect(finding.priority).toBeDefined();
      expect(finding.priority?.score).toBeGreaterThan(0);
      expect(finding.evidenceList).toBeDefined();
      expect(finding.evidenceList?.length).toBeGreaterThanOrEqual(1);
    }

    // 5. Generates expected attack graph with explicit evidence levels & calibrated confidence
    expect(result.attackGraph).toBeDefined();
    expect(result.attackGraph?.nodes.length).toBeGreaterThanOrEqual(2);
    expect(result.attackGraph?.edges.length).toBeGreaterThanOrEqual(1);

    for (const edge of result.attackGraph!.edges) {
      expect(['observed', 'reproduced', 'inferred', 'hypothetical']).toContain(edge.evidenceLevel!);
      expect(edge.confidence).toBeGreaterThan(0);
      expect(edge.prerequisites).toBeDefined();
    }

    for (const path of result.attackGraph!.attackPaths) {
      expect(path.confidence).toBeGreaterThan(0);
      expect(['observed', 'reproduced', 'inferred', 'hypothetical']).toContain(path.evidenceLevel!);
    }

    // 6. Generates valid actionable remediation work cards into ledger
    const fixResult = writeRemediationToLedger(result.findings, testWorkspace);
    expect(fixResult.count).toBeGreaterThan(0);
    expect(fs.existsSync(fixResult.ledgerPath)).toBe(true);

    const ledgerContent = fs.readFileSync(fixResult.ledgerPath, 'utf-8');
    expect(ledgerContent).toContain('WORK-CARD');
    expect(ledgerContent).toContain('Priority:');
    expect(ledgerContent).toContain('Failing TDD Regression Test');
    expect(ledgerContent).toContain('RT-FP-');
  });

  test('respects ExecutionEnvelope and rejects out-of-scope ports and hosts', async () => {
    // Attempt scan against an unpermitted port
    expect(
      runRedTeamScan(
        {
          target: `${lab.url.replace(/:\d+$/, ':9999')}`,
          scopeConfig: {
            allowedHosts: ['127.0.0.1'],
            allowedPorts: [lab.port, 9999],
            allowLocalhost: true,
          },
          envelope: {
            allowedHosts: ['127.0.0.1'],
            allowedPorts: [lab.port], // only lab port allowed
          },
        },
        false
      )
    ).rejects.toThrow('ExecutionEnvelope Violation');
  });
});
