import { afterEach, describe, expect, test } from 'bun:test';
import { startMythosRouterServer } from '../src/router/index.ts';

const servers: Array<{ stop: () => void }> = [];
const originalCors = process.env.FABLE_CORS_ORIGIN;
const originalUpstream = process.env.FABLE_UPSTREAM_URL;
const originalBodyLimit = process.env.FABLE_MAX_BODY_BYTES;

async function startServer() {
  const server = startMythosRouterServer(0) as any;
  servers.push(server);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('router did not expose a TCP address');
  return `http://127.0.0.1:${address.port}`;
}

afterEach(() => {
  for (const server of servers.splice(0)) server.stop();
  if (originalCors === undefined) delete process.env.FABLE_CORS_ORIGIN;
  else process.env.FABLE_CORS_ORIGIN = originalCors;
  if (originalUpstream === undefined) delete process.env.FABLE_UPSTREAM_URL;
  else process.env.FABLE_UPSTREAM_URL = originalUpstream;
  if (originalBodyLimit === undefined) delete process.env.FABLE_MAX_BODY_BYTES;
  else process.env.FABLE_MAX_BODY_BYTES = originalBodyLimit;
});

describe('get-fable request proxy', () => {
  test('binds a health contract without permissive CORS by default', async () => {
    delete process.env.FABLE_CORS_ORIGIN;
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(await response.json()).toEqual({ ok: true, service: 'get-fable-router' });
  });

  test('adds CORS only when an origin is configured', async () => {
    process.env.FABLE_CORS_ORIGIN = 'https://example.com';
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/health`, {
      headers: { Origin: 'https://example.com' },
    });
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

  test('routes review-before-merge requests to the review specialist without changing the requested model', async () => {
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
    expect(body.routing.selectedSkill).toBe('fable-review');
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
      body: JSON.stringify({ model: 'demo', prompt: 'unsupported shape' }),
    });
    expect(unsupported.status).toBe(400);
  });

  test('rejects bodies above the configured limit', async () => {
    process.env.FABLE_MAX_BODY_BYTES = '128';
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'demo', messages: [{ role: 'user', content: 'x'.repeat(512) }] }),
    });
    expect(response.status).toBe(413);
  });

  test('stops reading an oversized chunked body and closes the connection', async () => {
    process.env.FABLE_MAX_BODY_BYTES = '128';
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('x'.repeat(1024)));
          controller.close();
        },
      }),
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    expect(response.status).toBe(413);
  });

  test('rejects non-http upstream URLs before listening', () => {
    process.env.FABLE_UPSTREAM_URL = 'file:///tmp/secret';
    expect(() => startMythosRouterServer(0)).toThrow('FABLE_UPSTREAM_URL must use http or https');
  });
});
