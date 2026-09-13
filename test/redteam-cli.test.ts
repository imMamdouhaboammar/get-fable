import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'node:http';
import { handleRedTeamCli } from '../src/core/redteam/cli.ts';
import { checkColimaForbidden } from '../src/core/redteam/setup.ts';

let server: http.Server;
let targetUrl: string;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Security-Policy': "default-src 'self'",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify({ status: 'ok' }));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as { port: number };
      targetUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
  try {
    fs.rmSync(path.join(process.cwd(), '.fable/redteam.json'), { force: true });
    fs.rmSync(path.join(process.cwd(), '.fable/redteam'), { recursive: true, force: true });
  } catch {}
});

describe('RedTeam CLI Command', () => {
  test('returns 0 and prints help when invoked with --help', async () => {
    const code = await handleRedTeamCli(['--help']);
    expect(code).toBe(0);
  });

  test('returns 1 when --target is missing', async () => {
    const code = await handleRedTeamCli([]);
    expect(code).toBe(1);
  });

  test('returns 1 when target is out of scope', async () => {
    const code = await handleRedTeamCli(['--target', 'https://unauthorized-domain.com']);
    expect(code).toBe(1);
  });

  test('executes clean scan on local target and returns 0', async () => {
    const code = await handleRedTeamCli(['--target', targetUrl, '--profile', 'passive', '--json']);
    expect(code).toBe(0);
  });

  test('executes status subcommand and returns 0 with json output', async () => {
    const code = await handleRedTeamCli(['status', '--json']);
    expect(code).toBe(0);
  });

  test('executes setup subcommand and enforces policy', async () => {
    const isColima = checkColimaForbidden().detected;
    const code = await handleRedTeamCli(['setup', '--json', '--no-compose', '--no-mcp', '--no-scope']);
    expect(code).toBe(isColima ? 1 : 0);
  });

  test('executes fix subcommand and returns 0', async () => {
    const code = await handleRedTeamCli(['fix', '--json']);
    expect(code).toBe(0);
  });

  test('executes playbooks subcommand and returns 0 with json output', async () => {
    const code = await handleRedTeamCli(['playbooks', '--json']);
    expect(code).toBe(0);
  });

  test('executes verify subcommand and returns 0 when no regressions exist', async () => {
    const code = await handleRedTeamCli(['verify', '--target', targetUrl, '--json']);
    expect(code).toBe(0);
  });

  test('executes scan with --sarif format and returns 0', async () => {
    const code = await handleRedTeamCli([
      'scan',
      '--target',
      targetUrl,
      '--sarif',
      '--profile',
      'passive',
    ]);
    expect(code).toBe(0);
  });

  test('executes scan with tactical playbook flag and returns 0', async () => {
    const code = await handleRedTeamCli([
      'scan',
      '--target',
      targetUrl,
      '--playbook',
      'auth-session',
      '--json',
    ]);
    expect(code).toBe(0);
  });
});
