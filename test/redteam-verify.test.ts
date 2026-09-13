import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LAB_TOKENS, startLabServer, type LabServerInstance } from '../src/core/redteam/lab/vulnerable-server.ts';
import type { RedTeamFinding } from '../src/core/redteam/types.ts';
import { generateRegressionTestSuite, loadPreviousFindings, runRedTeamVerify } from '../src/core/redteam/verify.ts';

describe('RedTeam Closed-Loop Verification & Replay Engine', () => {
  let lab: LabServerInstance;
  let tmpDir: string;

  beforeAll(async () => {
    lab = await startLabServer(0);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-verify-test-'));
  });

  afterAll(async () => {
    await lab.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('loadPreviousFindings loads findings from JSON file', () => {
    const jsonPath = path.join(tmpDir, 'findings.json');
    const mockFindings: RedTeamFinding[] = [
      {
        id: 'SEC-1',
        title: 'Exposed env',
        category: 'sensitive-exposure',
        severity: 'critical',
        description: 'Leaked .env',
        target: 'http://127.0.0.1:3000/.env',
        remediation: 'Block file',
        evidence: {},
      },
    ];
    fs.writeFileSync(jsonPath, JSON.stringify(mockFindings), 'utf-8');

    const loaded = loadPreviousFindings(jsonPath, tmpDir);
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('SEC-1');
  });

  test('runRedTeamVerify detects persistent regression on vulnerable endpoint', async () => {
    const findings: RedTeamFinding[] = [
      {
        id: 'EXPOSURE-ENV',
        title: 'Exposed .env',
        category: 'sensitive-exposure',
        severity: 'critical',
        description: 'Leaked .env',
        target: `${lab.url}/.env`,
        remediation: 'Block file',
        evidence: {},
      },
    ];

    const result = await runRedTeamVerify({
      findings,
      envelope: { allowedPorts: [lab.port] },
    });

    expect(result.total).toBe(1);
    expect(result.regressions).toBe(1);
    expect(result.fixed).toBe(0);
    expect(result.status).toBe('regressions-detected');
    expect(result.items[0].newStatus).toBe('regression-failed');
  });

  test('runRedTeamVerify verifies fixed status on secured endpoint', async () => {
    const findings: RedTeamFinding[] = [
      {
        id: 'SEC-PING',
        title: 'Auth bypass on ping',
        category: 'auth-bypass',
        severity: 'high',
        description: 'Missing auth on ping',
        target: `${lab.url}/api/secure-ping`,
        remediation: 'Enforce auth',
        evidence: {},
      },
    ];

    const result = await runRedTeamVerify({
      findings,
      envelope: { allowedPorts: [lab.port] },
    });

    expect(result.total).toBe(1);
    expect(result.fixed).toBe(1);
    expect(result.regressions).toBe(0);
    expect(result.status).toBe('clean');
    expect(result.items[0].newStatus).toBe('verified-fixed');
  });

  test('generateRegressionTestSuite generates executable Bun test suite', () => {
    const findings: RedTeamFinding[] = [
      {
        id: 'CORS-TEST',
        title: 'Arbitrary CORS reflection',
        category: 'cors-misconfiguration',
        severity: 'high',
        description: 'Reflects evil origin',
        target: 'http://127.0.0.1:3000/api/cors-test',
        remediation: 'Validate origin',
        evidence: {},
      },
    ];

    const code = generateRegressionTestSuite(findings);
    expect(code).toContain("import { describe, expect, test } from 'bun:test';");
    expect(code).toContain("describe('RedTeam Automated Security Regression Guard'");
    expect(code).toContain('remediation: CORS rejects unauthorized arbitrary origins');
  });
});
