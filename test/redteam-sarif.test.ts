import { describe, expect, test } from 'bun:test';
import { generateSarifReport, mapSeverityToSarifLevel } from '../src/core/redteam/sarif.ts';
import type { RedTeamResult } from '../src/core/redteam/types.ts';

describe('Enterprise OASIS SARIF v2.1.0 Generator', () => {
  test('maps severities to valid SARIF levels', () => {
    expect(mapSeverityToSarifLevel('critical')).toBe('error');
    expect(mapSeverityToSarifLevel('high')).toBe('error');
    expect(mapSeverityToSarifLevel('medium')).toBe('warning');
    expect(mapSeverityToSarifLevel('low')).toBe('note');
    expect(mapSeverityToSarifLevel('info')).toBe('note');
  });

  test('generates valid SARIF 2.1.0 log from RedTeamResult', () => {
    const mockResult: RedTeamResult = {
      target: 'http://localhost:3000',
      profile: 'comprehensive',
      startTime: '2026-09-13T10:00:00.000Z',
      endTime: '2026-09-13T10:00:05.000Z',
      findings: [
        {
          id: 'SQLI-1',
          title: 'SQL Injection on search parameter',
          category: 'injection',
          severity: 'critical',
          description: 'SQL syntax error reflection',
          target: 'http://localhost:3000/api/search?q=test',
          remediation: 'Use parameterized queries',
          cwe: 'CWE-89',
          confidence: 0.98,
          evidence: { reproCurl: 'curl -i http://localhost:3000/api/search?q=1' },
        },
        {
          id: 'HEADER-1',
          title: 'Missing CSP header',
          category: 'security-headers',
          severity: 'medium',
          description: 'No Content-Security-Policy header returned',
          target: 'http://localhost:3000',
          remediation: 'Add CSP header',
          cwe: 'CWE-1021',
          confidence: 0.95,
          evidence: {},
        },
      ],
      summary: {
        critical: 1,
        high: 0,
        medium: 1,
        low: 0,
        info: 0,
        total: 2,
      },
    };

    const sarif = generateSarifReport(mockResult);

    expect(sarif.$schema).toBe('https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json');
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs.length).toBe(1);

    const run = sarif.runs[0];
    expect(run.tool.driver.name).toBe('get-fable-redteam');
    expect(run.tool.driver.rules.length).toBe(2);

    const ruleIds = run.tool.driver.rules.map((r) => r.id);
    expect(ruleIds).toContain('CWE-89');
    expect(ruleIds).toContain('CWE-1021');

    expect(run.results.length).toBe(2);
    const sqliResult = run.results.find((r) => r.ruleId === 'CWE-89');
    expect(sqliResult).toBeDefined();
    expect(sqliResult?.level).toBe('error');
    expect(sqliResult?.locations[0].physicalLocation.artifactLocation.uri).toBe('http://localhost:3000/api/search?q=test');
    expect(sqliResult?.properties?.reproCurl).toContain('curl');

    const cspResult = run.results.find((r) => r.ruleId === 'CWE-1021');
    expect(cspResult).toBeDefined();
    expect(cspResult?.level).toBe('warning');
  });
});
