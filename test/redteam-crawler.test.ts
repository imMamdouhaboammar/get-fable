import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { discoverTargetSurface, extractEndpointsFromHtml, parseOpenApiSpec } from '../src/core/redteam/crawler.ts';
import { DEFAULT_EXECUTION_ENVELOPE, EnvelopeHttpClient } from '../src/core/redteam/envelope.ts';
import { startLabServer, type LabServerInstance } from '../src/core/redteam/lab/vulnerable-server.ts';

describe('RedTeam Surface Discovery & Route Crawler', () => {
  let lab: LabServerInstance;

  beforeAll(async () => {
    lab = await startLabServer(0);
  });

  afterAll(async () => {
    await lab.stop();
  });

  test('extractEndpointsFromHtml extracts links, forms, and script API calls', () => {
    const html = `
      <html>
        <body>
          <a href="/api/v1/users">Users</a>
          <a href="/api/v1/invoices?account_id=99">Invoices</a>
          <a href="https://external.com/out">External</a>
          <form action="/api/v1/checkout" method="POST">
            <input name="card_number" />
            <input name="amount" />
          </form>
          <script>
            fetch('/api/v1/telemetry');
          </script>
        </body>
      </html>
    `;

    const result = extractEndpointsFromHtml(html, 'http://127.0.0.1:3000');
    expect(result.links.length).toBeGreaterThanOrEqual(2);
    expect(result.endpoints.some((e) => e.path === '/api/v1/users')).toBe(true);
    expect(result.endpoints.some((e) => e.path === '/api/v1/invoices')).toBe(true);
    expect(result.endpoints.some((e) => e.path === '/api/v1/telemetry')).toBe(true);
    expect(result.forms.length).toBe(1);
    expect(result.forms[0].action).toBe('http://127.0.0.1:3000/api/v1/checkout');
    expect(result.forms[0].method).toBe('POST');
    expect(result.forms[0].fields).toContain('card_number');
  });

  test('parseOpenApiSpec parses paths, methods, parameters and auth requirements', () => {
    const spec = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/items/{id}': {
          get: {
            summary: 'Get item',
            security: [{ Bearer: [] }],
            parameters: [{ name: 'id', in: 'path', required: true }],
          },
          delete: {
            summary: 'Delete item',
            parameters: [{ name: 'id', in: 'path' }],
          },
        },
      },
    };

    const endpoints = parseOpenApiSpec(spec, 'http://127.0.0.1:3000');
    expect(endpoints.length).toBe(2);
    const getEndpoint = endpoints.find((e) => e.method === 'GET');
    expect(getEndpoint).toBeDefined();
    expect(getEndpoint?.hasAuth).toBe(true);
    expect(getEndpoint?.parameters?.[0].name).toBe('id');

    const deleteEndpoint = endpoints.find((e) => e.method === 'DELETE');
    expect(deleteEndpoint).toBeDefined();
    expect(deleteEndpoint?.hasAuth).toBe(false);
  });

  test('discoverTargetSurface crawls live lab and finds OpenAPI, links, and forms', async () => {
    const envelope = { ...DEFAULT_EXECUTION_ENVELOPE, allowedPorts: [lab.port] };
    const client = new EnvelopeHttpClient(envelope);

    const surface = await discoverTargetSurface(lab.url, envelope, client);

    expect(surface.endpoints.length).toBeGreaterThanOrEqual(5);
    expect(surface.openApiSpec).toBeDefined();
    expect(surface.forms.length).toBeGreaterThanOrEqual(1);

    const paths = surface.endpoints.map((e) => e.path);
    expect(paths).toContain('/api/documents/{id}');
    expect(paths).toContain('/api/orders');
    expect(paths).toContain('/api/cors-test');
    expect(paths).toContain('/api/search');
    expect(paths).toContain('/api/fetch');
  });
});
