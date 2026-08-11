import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { ProviderTranslator, RequestValidationError } from './provider-translator.js';
import { ContextInjector } from './context-injector.js';
import { logInfo, logSuccess, logError } from '../utils.js';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 30_000;

export interface RouterOptions {
  host?: string;
  maxBodyBytes?: number;
  upstreamUrl?: string;
  upstreamTimeoutMs?: number;
  corsOrigin?: string;
}

type ResolvedRouterOptions = {
  host: string;
  maxBodyBytes: number;
  upstreamUrl?: string;
  upstreamTimeoutMs: number;
  corsOrigin?: string;
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

function validateUpstreamUrl(value: string | undefined): string | undefined {
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

  return url.toString();
}

function resolveOptions(options: RouterOptions = {}): ResolvedRouterOptions {
  return {
    host: options.host || process.env.FABLE_HOST || DEFAULT_HOST,
    maxBodyBytes: positiveInteger(
      options.maxBodyBytes,
      envPositiveInteger('FABLE_MAX_BODY_BYTES', DEFAULT_MAX_BODY_BYTES)
    ),
    upstreamUrl: validateUpstreamUrl(options.upstreamUrl ?? process.env.UPSTREAM_OPENAI_URL),
    upstreamTimeoutMs: positiveInteger(
      options.upstreamTimeoutMs,
      envPositiveInteger('FABLE_UPSTREAM_TIMEOUT_MS', DEFAULT_UPSTREAM_TIMEOUT_MS)
    ),
    corsOrigin: options.corsOrigin ?? process.env.FABLE_CORS_ORIGIN ?? undefined,
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
  body: unknown
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof req.headers.authorization === 'string' && req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(upstreamTimeoutMs),
    });

    const payload = Buffer.from(await upstreamRes.arrayBuffer());
    res.writeHead(upstreamRes.status, {
      'Content-Type': upstreamRes.headers.get('content-type') || 'application/octet-stream',
    });
    res.end(payload);
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new HttpError(504, 'Upstream request timed out');
    }
    throw new HttpError(502, 'Upstream request failed');
  }
}

export function createMythosRouterServer(options: RouterOptions = {}) {
  const resolved = resolveOptions(options);
  const fablePrompt = ContextInjector.getFableSystemPrompt();

  return http.createServer(async (req, res) => {
    applyCors(res, resolved.corsOrigin);

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
        upstreamConfigured: Boolean(resolved.upstreamUrl),
      });
      return;
    }

    if (
      req.method === 'POST' &&
      (pathname === '/v1/chat/completions' || pathname === '/chat/completions')
    ) {
      try {
        const body = await readJsonBody(req, resolved.maxBodyBytes);
        const normalized = ProviderTranslator.normalizeRequest(body);
        const enriched = ProviderTranslator.injectFableSystemPrompt(normalized, fablePrompt);

        logInfo(`[get-fable router] Enriched request for model: ${enriched.model}`);

        if (resolved.upstreamUrl) {
          await forwardToUpstream(
            req,
            res,
            resolved.upstreamUrl,
            resolved.upstreamTimeoutMs,
            enriched
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
                content: `[get-fable router] Request for model ${enriched.model} enriched successfully. Set UPSTREAM_OPENAI_URL to forward the request to an upstream endpoint.`,
              },
              finish_reason: 'stop',
            },
          ],
          fableEnriched: true,
          previewMode: true,
          systemPromptBytes: Buffer.byteLength(fablePrompt, 'utf-8'),
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
