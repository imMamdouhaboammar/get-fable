import { afterEach, describe, expect, test } from 'bun:test';
import http, { type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createMythosRouterServer } from '../src/router/index.ts';

const servers: Server[] = [];
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const addr = server.address() as AddressInfo;
  return `http://127.0.0.1:${addr.port}`;
}
afterEach(async () => { await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r())))); });

const body = { model: 'demo', messages: [{ role: 'user', content: 'Fix the typo' }] };

describe('request proxy security boundary', () => {
  test('rejects explicit loopback/private upstream targets by default', () => {
    expect(() => createMythosRouterServer({ upstreamUrl: 'http://127.0.0.1:8081/v1' })).toThrow('private');
    expect(() => createMythosRouterServer({ upstreamUrl: 'http://169.254.169.254/latest' })).toThrow('private');
    expect(() => createMythosRouterServer({ upstreamUrl: 'http://localhost:8081/v1' })).toThrow('private');
  });

  test('requires proxy authentication before a non-loopback bind', () => {
    expect(() => createMythosRouterServer({ host: '0.0.0.0' })).toThrow('authentication');
  });

  test('does not follow upstream redirects or forward Authorization to a redirected origin', async () => {
    let redirectedHits = 0;
    const receiver = http.createServer((req, res) => { redirectedHits += 1; res.end('should not be reached'); });
    const receiverUrl = await listen(receiver);
    const redirector = http.createServer((_req, res) => { res.writeHead(302, { Location: `${receiverUrl}/capture` }); res.end(); });
    const redirectorUrl = await listen(redirector);
    const proxyUrl = await listen(createMythosRouterServer({ upstreamUrl: redirectorUrl, allowPrivateUpstream: true }));

    const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secret-value' }, body: JSON.stringify(body),
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
