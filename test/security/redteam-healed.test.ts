import { describe, test, expect, afterAll } from 'bun:test';
import { startFableDshServer } from '../../src/dsh/standalone.ts';
import { createMythosRouterServer } from '../../src/router/index.ts';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

describe('RedTeam Healed Security Posture Verification', () => {
  let dshServer: any;
  let dshPort = 4455;
  let dshBaseUrl = `http://127.0.0.1:${dshPort}`;

  let routerServer: Server | null = null;
  let routerPort = 0;
  let routerBaseUrl = '';

  afterAll(async () => {
    if (dshServer) {
      dshServer.stop(true);
    }
    if (routerServer) {
      await new Promise<void>((resolve) => routerServer!.close(() => resolve()));
    }
  });

  test('DSH Standalone Server emits strict security headers on API responses', async () => {
    dshServer = startFableDshServer({ port: dshPort, hostname: '127.0.0.1' });

    const res = await fetch(`${dshBaseUrl}/api/status`);
    expect(res.status).toBe(200);

    const csp = res.headers.get('content-security-policy');
    const xcto = res.headers.get('x-content-type-options');
    const xfo = res.headers.get('x-frame-options');
    const referrer = res.headers.get('referrer-policy');

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(xcto).toBe('nosniff');
    expect(xfo).toBe('DENY');
    expect(referrer).toBe('strict-origin-when-cross-origin');
  });

  test('DSH Standalone Server emits security headers on HTML shell responses', async () => {
    const res = await fetch(`${dshBaseUrl}/`);
    expect(res.status).toBe(200);

    const csp = res.headers.get('content-security-policy');
    const xcto = res.headers.get('x-content-type-options');
    const xfo = res.headers.get('x-frame-options');

    expect(csp).toBeTruthy();
    expect(xcto).toBe('nosniff');
    expect(xfo).toBe('DENY');
  });

  test('DSH Standalone Server blocks sensitive path disclosures with 403 and headers', async () => {
    const resEnv = await fetch(`${dshBaseUrl}/.env`);
    expect(resEnv.status).toBe(403);
    expect(resEnv.headers.get('x-content-type-options')).toBe('nosniff');
    expect(resEnv.headers.get('content-security-policy')).toBeTruthy();

    const resGit = await fetch(`${dshBaseUrl}/.git/HEAD`);
    expect(resGit.status).toBe(403);
  });

  test('Request Proxy Router emits strict security headers on JSON responses', async () => {
    routerServer = createMythosRouterServer();
    await new Promise<void>((resolve) => routerServer!.listen(0, '127.0.0.1', () => resolve()));
    routerPort = (routerServer!.address() as AddressInfo).port;
    routerBaseUrl = `http://127.0.0.1:${routerPort}`;

    const res = await fetch(`${routerBaseUrl}/health`);
    expect(res.status).toBe(200);

    const csp = res.headers.get('content-security-policy');
    const xcto = res.headers.get('x-content-type-options');
    const xfo = res.headers.get('x-frame-options');

    expect(csp).toBe("default-src 'none'; frame-ancestors 'none';");
    expect(xcto).toBe('nosniff');
    expect(xfo).toBe('DENY');
  });

  test('Public Web Server emits strict security headers and blocks sensitive routes', async () => {
    const webPort = 5566;
    const proc = Bun.spawn(['bun', './bin/serve-web.js'], {
      env: { ...process.env, PORT: String(webPort) },
      stdout: 'ignore',
      stderr: 'ignore',
    });

    try {
      // Allow server to bind
      await new Promise((resolve) => setTimeout(resolve, 200));

      const res = await fetch(`http://127.0.0.1:${webPort}/`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-security-policy')).toBeTruthy();
      expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
      expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');

      // Test sensitive file blocking
      const resEnv = await fetch(`http://127.0.0.1:${webPort}/.env`);
      expect(resEnv.status).toBe(403);
      expect(resEnv.headers.get('x-content-type-options')).toBe('nosniff');
    } finally {
      proc.kill();
    }
  });
});
