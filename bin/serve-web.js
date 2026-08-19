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
    const filePath = resolvePublicPath(request.url);
    if (!filePath) return new Response('Bad Request', { status: 400 });
    const file = Bun.file(filePath);
    if (!(await file.exists())) return new Response('Not Found', { status: 404 });
    return new Response(file, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
});

console.log(`get-fable public site listening on ${server.url}`);
