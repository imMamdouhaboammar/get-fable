import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { timingSafeEqual } from 'node:crypto';
import { ProviderTranslator, RequestValidationError } from './provider-translator.js';
import { compileFableDirective, latestUserIntent } from '../core/prompt-compiler.js';
import { logInfo, logSuccess, logError } from '../utils.js';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 32;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 120;

export interface RouterOptions {
  host?: string;
  maxBodyBytes?: number;
  upstreamUrl?: string;
  upstreamTimeoutMs?: number;
  corsOrigin?: string;
  allowPrivateUpstream?: boolean;
  maxResponseBytes?: number;
  maxConcurrentRequests?: number;
  proxyAuthToken?: string;
  rateLimitPerMinute?: number;
}

type ResolvedRouterOptions = {
  host: string;
  maxBodyBytes: number;
  upstreamUrl?: string;
  upstreamTimeoutMs: number;
  corsOrigin?: string;
  allowPrivateUpstream: boolean;
  maxResponseBytes: number;
  maxConcurrentRequests: number;
  proxyAuthToken?: string;
  rateLimitPerMinute: number;
};

class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}

function envPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isLoopbackHost(host: string): boolean {
  const value = host.toLowerCase().replace(/^\[|\]$/g, '');
  return value === 'localhost' || value === '::1' || value === '127.0.0.1' || value.startsWith('127.');
}

function isPrivateIp(address: string): boolean {
  const value = address.toLowerCase().replace(/^::ffff:/, '');
  if (value === '::1' || value === '0.0.0.0' || value === '::') return true;
  if (value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:')) return true;
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

function explicitPrivateUpstream(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === 'localhost' || (isIP(host) !== 0 && isPrivateIp(host));
}

async function assertPublicUpstream(urlValue: string, allowPrivate: boolean): Promise<void> {
  if (allowPrivate) return;
  const url = new URL(urlValue);
  if (explicitPrivateUpstream(url)) throw new HttpError(502, 'Upstream target resolves to a private or loopback address');
  try {
    const records = await lookup(url.hostname, { all: true, verbatim: true });
    if (records.length === 0 || records.some((record) => isPrivateIp(record.address))) {
      throw new HttpError(502, 'Upstream target resolves to a private or loopback address');
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, 'Unable to resolve upstream host safely');
  }
}

function tokenMatches(header: string | undefined, expected: string | undefined): boolean {
  if (!expected || !header?.startsWith('Bearer ')) return false;
  const actual = Buffer.from(header.slice(7));
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

function validateUpstreamUrl(value: string | undefined, allowPrivate: boolean): string | undefined {
  if (!value) return undefined;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('UPSTREAM_OPENAI_URL must be a valid absolute URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('UPSTREAM_OPENAI_URL must use http or https');
  }
  if (!allowPrivate && explicitPrivateUpstream(url)) {
    throw new Error('UPSTREAM_OPENAI_URL must not target private or loopback addresses unless explicitly allowed');
  }
  return url.toString();
}

function resolveOptions(options: RouterOptions = {}): ResolvedRouterOptions {
  const host = options.host || process.env.FABLE_HOST || DEFAULT_HOST;
  const allowPrivateUpstream = options.allowPrivateUpstream === true || process.env.FABLE_ALLOW_PRIVATE_UPSTREAM === '1';
  const proxyAuthToken = options.proxyAuthToken ?? process.env.FABLE_PROXY_AUTH_TOKEN ?? undefined;
  if (!isLoopbackHost(host) && !proxyAuthToken) {
    throw new Error('Non-loopback proxy binding requires authentication via proxyAuthToken or FABLE_PROXY_AUTH_TOKEN');
  }
  return {
    host,
    maxBodyBytes: positiveInteger(options.maxBodyBytes, envPositiveInteger('FABLE_MAX_BODY_BYTES', DEFAULT_MAX_BODY_BYTES)),
    upstreamUrl: validateUpstreamUrl(options.upstreamUrl ?? process.env.UPSTREAM_OPENAI_URL, allowPrivateUpstream),
    upstreamTimeoutMs: positiveInteger(options.upstreamTimeoutMs, envPositiveInteger('FABLE_UPSTREAM_TIMEOUT_MS', DEFAULT_UPSTREAM_TIMEOUT_MS)),
    corsOrigin: options.corsOrigin ?? process.env.FABLE_CORS_ORIGIN ?? undefined,
    allowPrivateUpstream,
    maxResponseBytes: positiveInteger(options.maxResponseBytes, envPositiveInteger('FABLE_MAX_RESPONSE_BYTES', DEFAULT_MAX_RESPONSE_BYTES)),
    maxConcurrentRequests: positiveInteger(options.maxConcurrentRequests, envPositiveInteger('FABLE_MAX_CONCURRENT_REQUESTS', DEFAULT_MAX_CONCURRENT_REQUESTS)),
    proxyAuthToken,
    rateLimitPerMinute: positiveInteger(options.rateLimitPerMinute, envPositiveInteger('FABLE_RATE_LIMIT_PER_MINUTE', DEFAULT_RATE_LIMIT_PER_MINUTE)),
  };
}

function applyCors(res: ServerResponse, origin: string | undefined) {
  if (!origin) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function parseRequestPathname(req: IncomingMessage): string {
  try {
    return new URL(req.url || '/', 'http://localhost').pathname;
  } catch {
    throw new HttpError(400, 'Request target is not a valid URL');
  }
}

async function readJsonBody(req: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  const contentType = req.headers['content-type'];
  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json');
  }

  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    req.pause();
    throw new HttpError(413, `Request body exceeds ${maxBodyBytes} bytes`);
  }

  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;

    const cleanup = () => {
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;

      if (bytes > maxBodyBytes) {
        chunks.length = 0;
        req.pause();
        fail(new HttpError(413, `Request body exceeds ${maxBodyBytes} bytes`));
        return;
      }

      chunks.push(buffer);
    };

    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();

      const bodyText = Buffer.concat(chunks).toString('utf-8');
      if (!bodyText.trim()) {
        reject(new HttpError(400, 'Request body must not be empty'));
        return;
      }

      try {
        resolve(JSON.parse(bodyText));
      } catch {
        reject(new HttpError(400, 'Request body must contain valid JSON'));
      }
    };

    const onError = (error: Error) => fail(error);

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
  });
}

async function forwardToUpstream(
  req: IncomingMessage,
  res: ServerResponse,
  upstreamUrl: string,
  upstreamTimeoutMs: number,
  body: unknown,
  allowPrivateUpstream: boolean,
  maxResponseBytes: number
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof req.headers.authorization === 'string' && req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }

  try {
    await assertPublicUpstream(upstreamUrl, allowPrivateUpstream);
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(upstreamTimeoutMs),
      redirect: 'manual',
    });

    const declaredLength = Number(upstreamRes.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
      throw new HttpError(502, `Upstream response exceeds ${maxResponseBytes} bytes`);
    }
    const chunks: Buffer[] = [];
    let total = 0;
    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxResponseBytes) {
          await reader.cancel();
          throw new HttpError(502, `Upstream response exceeds ${maxResponseBytes} bytes`);
        }
        chunks.push(Buffer.from(value));
      }
    }
    const payload = Buffer.concat(chunks);
    res.writeHead(upstreamRes.status, {
      'Content-Type': upstreamRes.headers.get('content-type') || 'application/octet-stream',
    });
    res.end(payload);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new HttpError(504, 'Upstream request timed out');
    }
    throw new HttpError(502, 'Upstream request failed');
  }
}

export function createMythosRouterServer(options: RouterOptions = {}) {
  const resolved = resolveOptions(options);
  let activeRequests = 0;
  const rateWindows = new Map<string, { windowStartedAt: number; count: number }>();

  return http.createServer(async (req, res) => {
    applyCors(res, resolved.corsOrigin);
    if (!isLoopbackHost(resolved.host) && !tokenMatches(req.headers.authorization, resolved.proxyAuthToken)) {
      sendJson(res, 401, { error: 'Proxy authentication required' });
      return;
    }

    let pathname: string;
    try {
      pathname = parseRequestPathname(req);
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(res, error.statusCode, { error: error.message });
        return;
      }
      throw error;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && (pathname === '/health' || pathname === '/v1/health')) {
      sendJson(res, 200, {
        status: 'ok',
        mode: 'get-fable request proxy',
        routing: 'contextual-skill-compiler',
        upstreamConfigured: Boolean(resolved.upstreamUrl),
      });
      return;
    }

    if (
      req.method === 'POST' &&
      (pathname === '/v1/chat/completions' || pathname === '/chat/completions')
    ) {
      const clientKey = req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const currentWindow = rateWindows.get(clientKey);
      if (!currentWindow || now - currentWindow.windowStartedAt >= 60_000) {
        rateWindows.set(clientKey, { windowStartedAt: now, count: 1 });
      } else if (currentWindow.count >= resolved.rateLimitPerMinute) {
        res.setHeader('Retry-After', '60');
        sendJson(res, 429, { error: 'Proxy request rate limit exceeded' });
        return;
      } else {
        currentWindow.count += 1;
      }
      if (activeRequests >= resolved.maxConcurrentRequests) {
        sendJson(res, 429, { error: 'Too many concurrent proxy requests' });
        return;
      }
      activeRequests += 1;
      try {
        const body = await readJsonBody(req, resolved.maxBodyBytes);
        const normalized = ProviderTranslator.normalizeRequest(body);
        let task = 'continue the current bounded task';
        try {
          task = latestUserIntent(normalized.messages);
        } catch {
          // Some tool-driven requests have no new user message. Default to bounded execution.
        }

        const compiled = compileFableDirective(task, process.cwd());
        const enriched = ProviderTranslator.injectFableSystemPrompt(
          normalized,
          compiled.systemPrompt
        );

        logInfo(
          `[get-fable router] ${compiled.decision.selectedSkill} -> model ${enriched.model}`
        );

        if (resolved.upstreamUrl) {
          await forwardToUpstream(
            req,
            res,
            resolved.upstreamUrl,
            resolved.upstreamTimeoutMs,
            enriched,
            resolved.allowPrivateUpstream,
            resolved.maxResponseBytes
          );
          return;
        }

        sendJson(res, 200, {
          id: `chatcmpl-fable-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: enriched.model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: `[get-fable router] Request for model ${enriched.model} enriched with ${compiled.decision.selectedSkill}. Set UPSTREAM_OPENAI_URL to forward the request to an upstream endpoint.`,
              },
              finish_reason: 'stop',
            },
          ],
          fableEnriched: true,
          previewMode: true,
          routing: {
            selectedSkill: compiled.decision.selectedSkill,
            confidence: compiled.decision.confidence,
            reasons: compiled.decision.reasons,
            nextSkills: compiled.decision.nextSkills,
          },
          systemPromptBytes: Buffer.byteLength(compiled.systemPrompt, 'utf-8'),
        });
      } catch (error) {
        if (error instanceof RequestValidationError || error instanceof HttpError) {
          if (error.statusCode === 413) {
            res.shouldKeepAlive = false;
            res.setHeader('Connection', 'close');
          }
          sendJson(res, error.statusCode, { error: error.message });
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        logError(`Router Error: ${message}`);
        sendJson(res, 500, { error: 'Internal router error' });
      } finally {
        activeRequests -= 1;
      }
      return;
    }

    sendJson(res, 404, { error: 'Endpoint not found. Use POST /v1/chat/completions' });
  });
}

export function startMythosRouterServer(port: number = 8080, options: RouterOptions = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Port must be an integer between 1 and 65535');
  }

  const resolved = resolveOptions(options);
  const server = createMythosRouterServer(resolved);
  server.listen(port, resolved.host, () => {
    logSuccess(`get-fable request proxy active on http://${resolved.host}:${port}`);
    logInfo(`Post OpenAI-compatible requests to http://${resolved.host}:${port}/v1/chat/completions`);
  });
  return server;
}
