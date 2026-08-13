import { afterEach, describe, expect, test } from 'bun:test';
import { request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createMythosRouterServer } from '../src/router/index.ts';

const servers: Server[] = [];

async function startServer(options: Parameters<typeof createMythosRouterServer>[0] = {}) {
  const server = createMythosRouterServer(options);
  servers.push(server);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        })
    )
  );
});

describe('get-fable request proxy', () => {
  test('binds a health contract without permissive CORS by default', async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(body.status).toBe('ok');
    expect(body.routing).toBe('contextual-skill-compiler');
    expect(body.upstreamConfigured).toBe(false);
  });

  test('adds CORS only when an origin is configured', async () => {
    const baseUrl = await startServer({ corsOrigin: 'https://example.com' });
    const response = await fetch(`${baseUrl}/health`);

    expect(response.headers.get('access-control-allow-origin')).toBe('https://example.com');
  });

  test('returns a routed preview response for a valid messages request', async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'demo',
        messages: [{ role: 'user', content: 'Fix the typo in src/title.ts' }],
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.fableEnriched).toBe(true);
    expect(body.previewMode).toBe(true);
    expect(body.model).toBe('demo');
    expect(body.routing.selectedSkill).toBe('fable-execute');
    expect(body.routing.confidence).toBeGreaterThan(0.5);
    expect(body.systemPromptBytes).toBeGreaterThan(0);
  });

  test('routes review requests to verification without changing the requested model', async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'demo-review',
        messages: [{ role: 'user', content: 'Review this diff before merge and prove it is safe' }],
      }),
    });
    const body = await response.json();

    expect(body.model).toBe('demo-review');
    expect(body.routing.selectedSkill).toBe('fable-verify');
  });

  test('returns 400 for malformed JSON and unsupported request shapes', async () => {
    const baseUrl = await startServer();

    const malformed = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    expect(malformed.status).toBe(400);

    const unsupported = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'demo' }),
    });
    expect(unsupported.status).toBe(400);
  });

  test('rejects bodies above the configured limit', async () => {
    const baseUrl = await startServer({ maxBodyBytes: 64 });
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'demo',
        messages: [{ role: 'user', content: 'x'.repeat(200) }],
      }),
    });

    expect(response.status).toBe(413);
  });

  test('stops reading an oversized chunked body and closes the connection', async () => {
    const baseUrl = new URL(await startServer({ maxBodyBytes: 64 }));

    const result = await new Promise<{ status: number; connection: string | undefined }>((resolve, reject) => {
      const req = request(
        {
          hostname: baseUrl.hostname,
          port: baseUrl.port,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked',
          },
        },
        (res) => {
          const connection = res.headers.connection;
          res.resume();
          res.on('end', () => resolve({ status: res.statusCode || 0, connection }));
        }
      );

      req.on('error', reject);
      req.write('{"model":"demo","messages":[{"role":"user","content":"');
      req.write('x'.repeat(200));
      req.end('"}]}');
    });

    expect(result.status).toBe(413);
    expect(result.connection).toBe('close');
  });

  test('rejects non-http upstream URLs before listening', () => {
    expect(() => createMythosRouterServer({ upstreamUrl: 'file:///tmp/upstream' })).toThrow(
      'must use http or https'
    );
  });
});
