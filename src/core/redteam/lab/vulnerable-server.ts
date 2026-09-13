import http from 'node:http';

export interface LabServerInstance {
  server: http.Server;
  url: string;
  port: number;
  stop: () => Promise<void>;
}

export const LAB_TOKENS = {
  USER_A: 'Bearer token-alice-tenant-1',
  USER_B: 'Bearer token-bob-tenant-2',
};

/**
 * Creates and starts a deterministic, zero-dependency HTTP test server
 * implementing realistic vulnerabilities for testing the RedTeam orchestrator.
 */
export async function startLabServer(port = 0): Promise<LabServerInstance> {
  const documents: Record<string, { id: string; owner: string; secretData: string }> = {
    '101': { id: '101', owner: 'alice', secretData: 'Alice Confidential Tax Filing' },
    '202': { id: '202', owner: 'bob', secretData: 'Bob Confidential Financial Statements' },
  };

  const openApiSpec = {
    openapi: '3.0.0',
    info: { title: 'Fable Lab Target API', version: '1.0.0' },
    paths: {
      '/api/documents/{id}': {
        get: {
          summary: 'Get user document',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true }],
        },
      },
      '/api/orders': {
        post: {
          summary: 'Create an order',
          parameters: [],
        },
      },
      '/api/cors-test': {
        get: {
          summary: 'CORS test endpoint',
          parameters: [],
        },
      },
      '/api/search': {
        get: {
          summary: 'Search documents',
          parameters: [{ name: 'q', in: 'query' }],
        },
      },
      '/api/fetch': {
        get: {
          summary: 'Fetch external resource',
          parameters: [{ name: 'url', in: 'query' }],
        },
      },
      '/api/redirect': {
        get: {
          summary: 'Redirect user',
          parameters: [{ name: 'url', in: 'query' }],
        },
      },
      '/api/secure-ping': {
        get: {
          summary: 'Secure status check',
          security: [{ BearerAuth: [] }],
          parameters: [],
        },
      },
    },
  };

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = parsedUrl.pathname;
    const authHeader = req.headers['authorization'];

    // 1. Live OpenAPI Documentation
    if (pathname === '/openapi.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(openApiSpec));
      return;
    }

    // 2. Sensitive Exposure: /.env
    if (pathname === '/.env') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('DATABASE_URL=postgres://admin:supersecret@127.0.0.1:5432/proddb\nAPI_KEY=live_indicator_secret_12345\n');
      return;
    }

    // 3. Sensitive Exposure: /.git/HEAD
    if (pathname === '/.git/HEAD') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ref: refs/heads/main\n');
      return;
    }

    // 4. Multi-Tenant BOLA / IDOR: /api/documents/:id
    if (pathname.startsWith('/api/documents/')) {
      const docId = pathname.replace('/api/documents/', '');
      const doc = documents[docId];

      if (!doc) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Document not found' }));
        return;
      }

      // VULNERABILITY: Returns doc regardless of authenticated token
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ document: doc }));
      return;
    }

    // 5. Missing Auth on State Mutation: POST /api/orders
    if (pathname === '/api/orders' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ orderId: 'ord-8832', status: 'created', charge: 99.0 }));
      return;
    }

    // 6. Insecure CORS Reflection with Credentials: /api/cors-test
    if (pathname === '/api/cors-test') {
      const origin = req.headers['origin'] as string;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Credentials'] = 'true';
      }
      res.writeHead(200, headers);
      res.end(JSON.stringify({ secret: 'user-profile-data' }));
      return;
    }

    // 7. SQL Injection: /api/search?q=
    if (pathname === '/api/search') {
      const q = parsedUrl.searchParams.get('q') || '';
      if (q.includes("'") || q.includes('OR') || q.includes('--')) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`SQLite3::SQLException: near "${q}": syntax error in SELECT * FROM items WHERE name = '${q}'`);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ results: [{ id: 1, name: 'Sample Item' }] }));
      return;
    }

    // 8. SSRF: /api/fetch?url=
    if (pathname === '/api/fetch') {
      const fetchUrl = parsedUrl.searchParams.get('url') || '';
      if (fetchUrl.includes('169.254.169.254')) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ami-id: ami-0c55b159cbfafe1f0\ninstance-id: i-0123456789abcdef0\n');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('External contents simulated');
      return;
    }

    // 9. Open Redirect: /api/redirect?url=
    if (pathname === '/api/redirect') {
      const redirectUrl = parsedUrl.searchParams.get('url') || '/';
      res.writeHead(302, { Location: redirectUrl });
      res.end();
      return;
    }

    // 10. AI/LLM Endpoint: /api/chat
    if (pathname === '/api/chat' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        if (body.includes('system instructions') || body.includes('system prompt')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reply: 'Here is my system prompt: You are a helpful AI assistant configured with secret DEVELOPER_MODE.' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: 'Hello, how can I assist you today?' }));
      });
      return;
    }

    // 11. Properly Secured Endpoint (False-Positive Control)
    if (pathname === '/api/secure-ping') {
      if (authHeader !== LAB_TOKENS.USER_A && authHeader !== LAB_TOKENS.USER_B) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Security-Policy': "default-src 'self'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify({ status: 'ok', secure: true }));
      return;
    }

    // 12. Root Page (Contains discovered links & missing headers)
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html>
<head><title>Fable Lab</title></head>
<body>
  <h1>Lab Target App</h1>
  <nav>
    <a href="/api/documents/101">View Alice Document</a>
    <a href="/api/cors-test">CORS Profile Test</a>
    <a href="/api/search?q=test">Search Items</a>
    <a href="/api/fetch?url=http://example.com">Fetch Proxy</a>
    <a href="/api/redirect?url=/home">Redirect</a>
    <a href="/openapi.json">API Docs</a>
  </nav>
  <form action="/api/orders" method="POST">
    <input name="item" value="book" />
    <button type="submit">Submit Order</button>
  </form>
</body>
</html>`);
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const address = server.address() as { port: number };
      const serverPort = address.port;
      const url = `http://127.0.0.1:${serverPort}`;

      resolve({
        server,
        url,
        port: serverPort,
        stop: () =>
          new Promise<void>((closeResolve) => {
            server.close(() => closeResolve());
          }),
      });
    });
  });
}
