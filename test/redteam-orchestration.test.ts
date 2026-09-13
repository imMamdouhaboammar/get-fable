import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { deduplicateFindings, runRedTeamScan } from '../src/core/redteam/engine.ts';
import type { RedTeamFinding, ScanOptions } from '../src/core/redteam/types.ts';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = req.url || '/';

    if (url === '/.env') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('DATABASE_URL=postgres://localhost:5432/app\nAPP_ENV=production\n');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
});

describe('Master RedTeam Orchestrator Engine', () => {
  test('deduplicateFindings unifies overlapping findings and upgrades severity', () => {
    const dupes: RedTeamFinding[] = [
      {
        id: 'f-1',
        title: 'Headers missing',
        category: 'security-headers',
        severity: 'low',
        description: 'Missing CSP',
        target: 'http://localhost:3000',
        evidence: { rawOutput: 'tool-1 output' },
        remediation: 'Add CSP',
      },
      {
        id: 'f-2',
        title: 'Critical header policy flaw',
        category: 'security-headers',
        severity: 'high',
        description: 'Missing CSP allows framing',
        target: 'http://localhost:3000',
        evidence: { rawOutput: 'tool-2 output' },
        remediation: 'Add CSP frame-ancestors',
      },
    ];

    const deduplicated = deduplicateFindings(dupes);
    expect(deduplicated.length).toBe(1);
    expect(deduplicated[0].severity).toBe('high');
    expect(deduplicated[0].evidence.rawOutput).toContain('tool-1 output');
    expect(deduplicated[0].evidence.rawOutput).toContain('tool-2 output');
  });

  test('runs orchestrated scan, generates attack graph and comprehensive report', async () => {
    const options: ScanOptions = {
      target: baseUrl,
      profile: 'orchestrated',
      orchestrate: true,
      scopeConfig: { allowedHosts: ['127.0.0.1', 'localhost'], allowLocalhost: true },
    };

    const result = await runRedTeamScan(options, true);
    expect(result.activeAdapters).toContain('native');
    expect(result.attackGraph).toBeDefined();
    expect(result.attackGraph?.nodes.length).toBeGreaterThanOrEqual(1);

    // Verify written report in docs/security/REDTEAM_REPORT.md
    const reportPath = path.resolve(process.cwd(), 'docs/security/REDTEAM_REPORT.md');
    expect(fs.existsSync(reportPath)).toBe(true);
    const content = fs.readFileSync(reportPath, 'utf-8');
    expect(content).toContain('Fable RedTeam Security Audit Report');
    expect(content).toContain('Participating Adapters');
    expect(content).toContain('`native`');
  });
});
