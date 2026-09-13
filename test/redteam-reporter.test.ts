import { describe, expect, test } from 'bun:test';
import { generateMarkdownReport, generateFableWorkCards, summarizeFindings } from '../src/core/redteam/reporter.ts';
import type { RedTeamFinding, RedTeamResult } from '../src/core/redteam/types.ts';

describe('RedTeam Reporter & Ledger Work Card Generator', () => {
  const mockFindings: RedTeamFinding[] = [
    {
      id: 'EXPOSURE-ENV',
      title: 'Exposed Sensitive File: .env',
      category: 'sensitive-exposure',
      severity: 'critical',
      description: 'Environment file exposed to public internet',
      target: 'http://localhost:3000/.env',
      evidence: { reproCurl: 'curl http://localhost:3000/.env' },
      remediation: 'Block .env access at Nginx',
      cwe: 'CWE-200',
    },
    {
      id: 'SEC-HEADER-CSP',
      title: 'Missing Content-Security-Policy',
      category: 'security-headers',
      severity: 'medium',
      description: 'No CSP header present',
      target: 'http://localhost:3000/',
      evidence: {},
      remediation: 'Add CSP header',
      cwe: 'CWE-1021',
    },
  ];

  test('summarizes findings accurately by severity', () => {
    const summary = summarizeFindings(mockFindings);
    expect(summary.total).toBe(2);
    expect(summary.critical).toBe(1);
    expect(summary.medium).toBe(1);
    expect(summary.high).toBe(0);
  });

  test('generates markdown report with tables and evidence', () => {
    const result: RedTeamResult = {
      target: 'http://localhost:3000',
      profile: 'passive',
      startTime: '2026-09-13T09:00:00Z',
      endTime: '2026-09-13T09:01:00Z',
      findings: mockFindings,
      summary: summarizeFindings(mockFindings),
    };

    const md = generateMarkdownReport(result);
    expect(md).toContain('# Fable RedTeam Security Audit Report');
    expect(md).toContain('Critical | 1');
    expect(md).toContain('Exposed Sensitive File: .env');
    expect(md).toContain('curl http://localhost:3000/.env');
    expect(md).toContain('CWE-200');
  });

  test('generates actionable Fable remediation work cards', () => {
    const cards = generateFableWorkCards(mockFindings);
    expect(cards).toContain('### [CRITICAL] Remediation: Exposed Sensitive File: .env');
    expect(cards).toContain('Block .env access at Nginx');
    expect(cards).toContain('Status: Open');
  });
});
