import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

let server: http.Server;
let serverPort: number;
let serverBaseUrl: string;
let testWorkspace: string;
const fableBin = path.resolve(process.cwd(), 'bin/get-fable.js');

beforeAll(async () => {
  testWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-live-functional-'));

  // Provision an initial clean .fable directory in the isolated test workspace
  fs.mkdirSync(path.join(testWorkspace, '.fable'), { recursive: true });
  fs.writeFileSync(
    path.join(testWorkspace, '.fable/LEDGER.md'),
    '# Repository Task Ledger\n\n## Active Tasks\n\n',
    'utf-8'
  );

  // Launch a real HTTP test server simulating common real-world vulnerabilities
  server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${serverPort}`);
    const pathname = parsedUrl.pathname;

    // Vulnerability 1: Exposed .env file
    if (pathname === '/.env') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('DATABASE_URL=postgres://user:pass@127.0.0.1:5432/production_db\nAPI_KEY=live_indicator_secret_12345\n');
      return;
    }

    // Vulnerability 2: Insecure CORS reflection with credentials
    if (pathname === '/api/cors-test') {
      const origin = req.headers['origin'] as string;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Credentials'] = 'true';
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify({ secret: 'user-private-data' }));
      return;
    }

    // Vulnerability 3: Sensitive file exposure (.git/HEAD)
    if (pathname === '/.git/HEAD') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ref: refs/heads/master\n');
      return;
    }

    // Clean endpoint
    if (pathname === '/clean') {
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Security-Policy': "default-src 'self'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end('<html><body>Clean Page</body></html>');
      return;
    }

    // Normal root page missing security headers (no CSP, no X-Frame-Options, no X-Content-Type-Options)
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>Welcome to Vulnerable Demo App</h1></body></html>');
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as { port: number };
      serverPort = address.port;
      serverBaseUrl = `http://127.0.0.1:${serverPort}`;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
  fs.rmSync(testWorkspace, { recursive: true, force: true });
});

describe('RedTeam End-to-End Functional Live Target Verification', () => {
  test('test_cli_status_displays_operational_table_and_runtimes', async () => {
    const proc = Bun.spawn(['bun', fableBin, 'redteam', 'status'], {
      cwd: testWorkspace,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Fable RedTeam Tool Readiness Matrix');
    expect(stdout).toContain('Native TypeScript Probe');
    expect(stdout).toContain('READY');
    expect(stdout).toContain('CyberStrikeAI Attack Graph Engine');
  });

  test('test_vulnerable_target_detects_real_flaws_and_returns_exit_code_2', async () => {
    // Run real CLI scan against the live running HTTP server
    const proc = Bun.spawn(
      [
        'bun',
        fableBin,
        'redteam',
        'scan',
        '--target',
        serverBaseUrl,
        '--profile',
        'comprehensive',
        '--json',
      ],
      {
        cwd: testWorkspace,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    // Exit code 2 indicates critical security findings were identified
    expect(exitCode).toBe(2);
    expect(stdout).toBeTruthy();

    const parsed = JSON.parse(stdout);
    expect(parsed.target).toBe(serverBaseUrl);
    expect(parsed.findings.length).toBeGreaterThan(0);

    // Verify finding categories
    const categories = parsed.findings.map((f: any) => f.category);
    expect(categories).toContain('sensitive-exposure');
    expect(categories).toContain('security-headers');

    // Verify evidence includes reproducible cURL command
    const envFinding = parsed.findings.find((f: any) => f.target.includes('.env'));
    expect(envFinding).toBeDefined();
    expect(envFinding.severity).toBe('critical');
    expect(envFinding.evidence.reproCurl).toContain(serverBaseUrl);

    // Verify attack graph was formulated
    expect(parsed.attackGraph).toBeDefined();
    expect(parsed.attackGraph.nodes.length).toBeGreaterThanOrEqual(2);
  });

  test('test_repro_curl_command_actually_reproduces_leak_against_live_server', async () => {
    const res = await fetch(`${serverBaseUrl}/.env`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('DATABASE_URL');
    expect(text).toContain('live_indicator_secret_12345');
  });

  test('test_fix_subcommand_logs_actionable_work_cards_into_ledger', async () => {
    const proc = Bun.spawn(
      [
        'bun',
        fableBin,
        'redteam',
        'fix',
        '--target',
        serverBaseUrl,
      ],
      {
        cwd: testWorkspace,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain('remediation work cards');

    // Check that isolated .fable/LEDGER.md contains the generated work card
    const ledgerPath = path.join(testWorkspace, '.fable/LEDGER.md');
    expect(fs.existsSync(ledgerPath)).toBe(true);

    const ledgerContent = fs.readFileSync(ledgerPath, 'utf-8');
    expect(ledgerContent).toContain('WORK-CARD');
    expect(ledgerContent).toContain('CRITICAL');
    expect(ledgerContent).toContain('Test');
    expect(ledgerContent).toContain('EXPOSURE');
  });

  test('test_out_of_scope_target_is_rejected_fail_closed', async () => {
    const proc = Bun.spawn(
      [
        'bun',
        fableBin,
        'redteam',
        'scan',
        '--target',
        'https://unauthorized-external-victim.com',
        '--json',
      ],
      {
        cwd: testWorkspace,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.error).toContain('OUT OF ALLOWED SCOPE');
  });
});
