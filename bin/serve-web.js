#!/usr/bin/env bun
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(repoRoot, 'public');
const rawPort = process.env.PORT || '3000';

if (!/^\d+$/.test(rawPort)) throw new Error('PORT must be an integer between 1 and 65535');
const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; frame-ancestors 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function resolvePublicPath(requestUrl) {
  const url = new URL(requestUrl);
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return null; }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = path.resolve(publicRoot, relative);
  if (candidate !== publicRoot && !candidate.startsWith(`${publicRoot}${path.sep}`)) return null;
  return candidate;
}
const server = Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (/^\/(\.env|\.git|docker-compose\.yml|\.aws|secrets)/i.test(url.pathname)) {
      return new Response('Forbidden', {
        status: 403,
        headers: {
          'Cache-Control': 'no-store',
          ...SECURITY_HEADERS,
        },
      });
    }

    const filePath = resolvePublicPath(request.url);
    if (!filePath) {
      return new Response('Bad Request', {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
          ...SECURITY_HEADERS,
        },
      });
    }
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return new Response('Not Found', {
        status: 404,
        headers: {
          'Cache-Control': 'no-store',
          ...SECURITY_HEADERS,
        },
      });
    }
    return new Response(file, {
      headers: {
        'Cache-Control': 'no-store',
        ...SECURITY_HEADERS,
      },
    });
  },
});

console.log(`get-fable public site listening on ${server.url}`);
