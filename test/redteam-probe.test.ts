import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'node:http';
import { runSecurityProbes } from '../src/core/redteam/probe.ts';
import type { ScanOptions } from '../src/core/redteam/types.ts';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = req.url || '/';

    // Mock .env exposure
    if (url === '/.env') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('DATABASE_URL=sqlite:///:memory:\nAPP_ENV=test\nAPI_KEY=fixture_indicator_key\n');
      return;
    }

    // Mock CORS reflection
    if (url === '/api/user-data') {
      const origin = req.headers['origin'] as string;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Credentials'] = 'true';
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify({ userId: '123', email: 'victim@example.com' }));
      return;
    }

    // Mock Auth bypass endpoint
    if (url === '/api/protected') {
      // Intentionally vulnerable: no auth check
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ secretInfo: 'confidential' }));
      return;
    }

    // Normal page without security headers
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Hello World</h1>');
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

describe('Native HTTP Security Probe', () => {
  test('detects missing security headers in passive profile', async () => {
    const options: ScanOptions = {
      target: baseUrl,
      profile: 'passive',
      scopeConfig: { allowedHosts: ['127.0.0.1', 'localhost'], allowLocalhost: true },
    };

    const findings = await runSecurityProbes(options);
    const headerFindings = findings.filter((f) => f.category === 'security-headers');

    expect(headerFindings.length).toBeGreaterThan(0);
    expect(headerFindings.some((f) => f.title.includes('Content-Security-Policy'))).toBe(true);
    expect(headerFindings.some((f) => f.title.includes('X-Frame-Options'))).toBe(true);
  });

  test('detects sensitive file exposure (.env)', async () => {
    const options: ScanOptions = {
      target: baseUrl,
      profile: 'passive',
      scopeConfig: { allowedHosts: ['127.0.0.1', 'localhost'], allowLocalhost: true },
    };

    const findings = await runSecurityProbes(options);
    const leakFinding = findings.find((f) => f.category === 'sensitive-exposure' && f.target.includes('.env'));

    expect(leakFinding).toBeDefined();
    expect(leakFinding?.severity).toBe('critical');
    expect(leakFinding?.evidence.response?.snippet).toContain('DATABASE_URL');
  });

  test('detects arbitrary CORS reflection with credentials', async () => {
    const options: ScanOptions = {
      target: `${baseUrl}/api/user-data`,
      profile: 'passive',
      scopeConfig: { allowedHosts: ['127.0.0.1', 'localhost'], allowLocalhost: true },
    };

    const findings = await runSecurityProbes(options);
    const corsFinding = findings.find((f) => f.category === 'cors-misconfiguration');

    expect(corsFinding).toBeDefined();
    expect(corsFinding?.severity).toBe('high');
    expect(corsFinding?.description).toContain('arbitrary origin reflection');
  });

  test('detects missing authentication on sensitive endpoint', async () => {
    const options: ScanOptions = {
      target: `${baseUrl}/api/protected`,
      profile: 'api-logic',
      authToken: 'Bearer valid-user-token',
      scopeConfig: { allowedHosts: ['127.0.0.1', 'localhost'], allowLocalhost: true },
    };

    const findings = await runSecurityProbes(options);
    const authFinding = findings.find((f) => f.category === 'auth-bypass');

    expect(authFinding).toBeDefined();
    expect(authFinding?.severity).toBe('high');
    expect(authFinding?.title).toContain('Authentication Missing');
  });
});
