import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRemediationCards, writeRemediationToLedger } from '../src/core/redteam/remediation.ts';
import type { RedTeamFinding } from '../src/core/redteam/types.ts';

describe('RedTeam Closed-Loop Remediation Generator', () => {
  const sampleFindings: RedTeamFinding[] = [
    {
      id: 'vuln-1',
      title: 'Missing Authentication on /api/billing',
      category: 'auth-bypass',
      severity: 'critical',
      description: 'Unauthenticated state mutation permitted',
      target: 'http://localhost:3000/api/billing',
      evidence: { reproCurl: 'curl -i -X POST http://localhost:3000/api/billing' },
      remediation: 'Require valid bearer JWT',
      cwe: 'CWE-306',
    },
    {
      id: 'vuln-2',
      title: 'Missing CSP header',
      category: 'security-headers',
      severity: 'low',
      description: 'CSP not sent',
      target: 'http://localhost:3000',
      evidence: {},
      remediation: 'Add CSP',
    },
  ];

  test('createRemediationCards filters for critical/high findings and generates suggested tests', () => {
    const cards = createRemediationCards(sampleFindings);
    expect(cards.length).toBe(1);
    expect(cards[0].id).toBe('vuln-1');
    expect(cards[0].severity).toBe('critical');
    expect(cards[0].suggestedTestCode).toContain('rejects unauthenticated');
  });

  test('writeRemediationToLedger appends work cards to .fable/LEDGER.md without duplicates', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-remediation-test-'));

    try {
      const firstRun = writeRemediationToLedger(sampleFindings, tmpDir);
      expect(firstRun.count).toBe(1);
      expect(fs.existsSync(firstRun.ledgerPath)).toBe(true);

      const content = fs.readFileSync(firstRun.ledgerPath, 'utf-8');
      expect(content).toContain('WORK-CARD');
      expect(content).toContain('vuln-1');
      expect(content).toContain('CWE-306');

      // Second run with same findings should be idempotent and not duplicate
      const secondRun = writeRemediationToLedger(sampleFindings, tmpDir);
      expect(secondRun.count).toBe(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
