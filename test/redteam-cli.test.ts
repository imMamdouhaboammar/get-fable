import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import http from 'node:http';
import { handleRedTeamCli } from '../src/core/redteam/cli.ts';

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
});
