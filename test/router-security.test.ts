import { afterEach, describe, expect, test } from 'bun:test';
import http, { type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createMythosRouterServer } from '../src/router/index.ts';

const servers: Server[] = [];
async function listen(server: Server, host = '127.0.0.1') {
  servers.push(server);
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, host, resolve); });
  const addr = server.address() as AddressInfo;
  const connectHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  return `http://${connectHost}:${addr.port}`;
}
afterEach(async () => { await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r())))); });

const body = { model: 'demo', messages: [{ role: 'user', content: 'Fix the typo' }] };

describe('request proxy security boundary', () => {
  test('rejects explicit loopback/private upstream targets by default', () => {
    expect(() => createMythosRouterServer({ upstreamUrl: 'http://127.0.0.1:8081/v1' })).toThrow('private');
    expect(() => createMythosRouterServer({ upstreamUrl: 'http://169.254.169.254/latest' })).toThrow('private');
    expect(() => createMythosRouterServer({ upstreamUrl: 'http://localhost:8081/v1' })).toThrow('private');
  });

  test('requires proxy authentication before a configured non-loopback bind', () => {
    expect(() => createMythosRouterServer({ host: '0.0.0.0' })).toThrow('authentication');
  });

  test('requires trusted TLS termination before a configured non-loopback bind', () => {
    expect(() => createMythosRouterServer({
      host: '0.0.0.0',
      proxyAuthToken: 'proxy-access-sentinel',
    })).toThrow('TLS');
  });

  test('rejects non-loopback traffic without an asserted TLS-terminating boundary', async () => {
    const proxyUrl = await listen(createMythosRouterServer({
      proxyAuthToken: 'proxy-access-sentinel',
    }), '0.0.0.0');

    const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer proxy-access-sentinel',
      },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain('TLS');
  });

  test('requires proxy authentication when the actual listener is non-loopback', async () => {
    const proxyUrl = await listen(createMythosRouterServer({
      proxyAuthToken: 'proxy-access-sentinel',
      trustProxyTlsTermination: true,
    }), '0.0.0.0');

    const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(401);
  });

  test('does not forward the proxy access token when the actual listener is non-loopback', async () => {
    let upstreamAuthorization: string | undefined;
    const upstream = http.createServer((req, res) => {
      upstreamAuthorization = req.headers.authorization;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    });
    const upstreamUrl = await listen(upstream);
    const proxyUrl = await listen(createMythosRouterServer({
      proxyAuthToken: 'proxy-access-sentinel',
      trustProxyTlsTermination: true,
      upstreamUrl,
      allowPrivateUpstream: true,
    }), '0.0.0.0');

    const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer proxy-access-sentinel',
      },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(200);
    expect(upstreamAuthorization).toBeUndefined();
  });

  test('does not forward the configured non-loopback proxy access token upstream', async () => {
    let upstreamAuthorization: string | undefined;
    const upstream = http.createServer((req, res) => {
      upstreamAuthorization = req.headers.authorization;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    });
    const upstreamUrl = await listen(upstream);
    const proxyUrl = await listen(createMythosRouterServer({
      host: '0.0.0.0',
      proxyAuthToken: 'proxy-access-sentinel',
      trustProxyTlsTermination: true,
      upstreamUrl,
      allowPrivateUpstream: true,
    }), '0.0.0.0');

    const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer proxy-access-sentinel',
      },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(200);
    expect(upstreamAuthorization).toBeUndefined();
  });

  test('requires HTTPS when a dedicated upstream bearer token is configured', () => {
    expect(() => createMythosRouterServer({
      upstreamUrl: 'http://provider.example/v1/chat/completions',
      upstreamAuthToken: 'provider-auth-sentinel',
    })).toThrow('HTTPS');

    expect(() => createMythosRouterServer({
      upstreamUrl: 'https://provider.example/v1/chat/completions',
      upstreamAuthToken: 'provider-auth-sentinel',
    })).not.toThrow();
  });

  test('refuses to forward fallback Authorization to an HTTP upstream', async () => {
    let upstreamHits = 0;
    const upstream = http.createServer((_req, res) => {
      upstreamHits += 1;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    });
    const upstreamUrl = await listen(upstream);
    const proxyUrl = await listen(createMythosRouterServer({
      upstreamUrl,
      allowPrivateUpstream: true,
    }));

    const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer provider-auth-sentinel',
      },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain('HTTPS');
    expect(upstreamHits).toBe(0);
  });

  test('does not follow upstream redirects', async () => {
    let redirectedHits = 0;
    const receiver = http.createServer((_req, res) => { redirectedHits += 1; res.end('should not be reached'); });
    const receiverUrl = await listen(receiver);
    const redirector = http.createServer((_req, res) => { res.writeHead(302, { Location: `${receiverUrl}/capture` }); res.end(); });
    const redirectorUrl = await listen(redirector);
    const proxyUrl = await listen(createMythosRouterServer({ upstreamUrl: redirectorUrl, allowPrivateUpstream: true }));

    const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    expect(response.status).toBe(302);
    expect(redirectedHits).toBe(0);
  });

  test('rejects upstream responses larger than the configured byte limit', async () => {
    const upstream = http.createServer((_req, res) => { res.setHeader('content-type', 'text/plain'); res.end('x'.repeat(512)); });
    const upstreamUrl = await listen(upstream);
    const proxyUrl = await listen(createMythosRouterServer({ upstreamUrl, allowPrivateUpstream: true, maxResponseBytes: 64 }));
    const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain('exceeds');
  });
});

describe('request proxy abuse limits', () => {
  test('rate limits repeated requests from one client without affecting health checks', async () => {
    const proxyUrl = await listen(createMythosRouterServer({ rateLimitPerMinute: 2 }));
    for (let i = 0; i < 2; i += 1) {
      const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      expect(response.status).toBe(200);
    }
    const limited = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    expect(limited.status).toBe(429);
    const health = await fetch(`${proxyUrl}/health`);
    expect(health.status).toBe(200);
  });
});
