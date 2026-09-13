import type { ExecutionEnvelope, ScopeConfig } from './types.js';

export const DEFAULT_SENSITIVE_ENV_VARS: string[] = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_KEY',
  'SUPABASE_ANON_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'DATABASE_URL',
  'SECRET_KEY',
  'JWT_SECRET',
  'PRIVATE_KEY',
  'ENCRYPTION_KEY',
];

export const DEFAULT_EXECUTION_ENVELOPE: ExecutionEnvelope = {
  allowedHosts: ['localhost', '127.0.0.1', '::1'],
  allowedPorts: undefined, // Permits loopback ephemeral ports by default unless explicitly restricted
  allowedProtocols: ['http:', 'https:'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  maxRequestsPerSecond: 25,
  maxConcurrency: 6,
  maxTotalRequests: 250,
  maxDurationMs: 30000,
  maxResponseBytes: 1024 * 1024, // 1MB response cap to prevent memory exhaustion
  networkEgress: 'scoped-hosts-only',
  strippedEnvVars: [...DEFAULT_SENSITIVE_ENV_VARS],
  filesystemIsolation: true,
  circuitBreaker: {
    enabled: true,
    failureThresholdPercent: 20,
    sampleWindowSize: 20,
    recoveryTimeoutMs: 5000,
  },
};

/**
 * Merges scope config and custom overrides into an enforced ExecutionEnvelope.
 */
export function buildExecutionEnvelope(
  scopeConfig?: ScopeConfig,
  overrides?: Partial<ExecutionEnvelope>
): ExecutionEnvelope {
  const base = { ...DEFAULT_EXECUTION_ENVELOPE };

  if (scopeConfig) {
    if (scopeConfig.allowedHosts && scopeConfig.allowedHosts.length > 0) {
      base.allowedHosts = [...scopeConfig.allowedHosts];
    }
    if (scopeConfig.allowedPorts && scopeConfig.allowedPorts.length > 0) {
      base.allowedPorts = [...scopeConfig.allowedPorts];
    } else if (scopeConfig.allowLocalhost) {
      // Allow dynamic developer and test server ports on loopback when allowedPorts is not explicitly restricted
      base.allowedPorts = [];
    }
    if (scopeConfig.maxRequestsPerSecond) {
      base.maxRequestsPerSecond = scopeConfig.maxRequestsPerSecond;
    }
  }

  if (overrides?.circuitBreaker) {
    base.circuitBreaker = {
      ...base.circuitBreaker!,
      ...overrides.circuitBreaker,
    };
  }

  if (overrides) {
    Object.assign(base, overrides);
    if (overrides.strippedEnvVars) {
      base.strippedEnvVars = Array.from(
        new Set([...DEFAULT_SENSITIVE_ENV_VARS, ...overrides.strippedEnvVars])
      );
    }
  }

  return base;
}

/**
 * Creates a sanitized environment variables record by stripping secrets and sensitive credentials.
 * Ensures child processes, external adapters, and autonomous agent swarms cannot exfiltrate
 * repository or workspace secrets.
 */
export function createSanitizedEnv(
  baseEnv: NodeJS.ProcessEnv = process.env,
  additionalStripped: string[] = []
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const strippedSet = new Set(
    [...DEFAULT_SENSITIVE_ENV_VARS, ...additionalStripped].map((k) => k.toUpperCase())
  );

  const sensitivePattern = /(_SECRET|_KEY|_TOKEN|_PASSWORD|_AUTH|_CREDENTIALS|_PRIVATE)$/i;

  for (const [key, value] of Object.entries(baseEnv)) {
    if (value === undefined) continue;

    const upperKey = key.toUpperCase();
    if (strippedSet.has(upperKey)) {
      continue;
    }

    // Heuristic protection for undeclared sensitive variables
    if (sensitivePattern.test(upperKey)) {
      // Allow standard system variables if needed, otherwise drop
      if (!['PATH', 'USER', 'HOME', 'SHELL', 'TERM'].includes(upperKey)) {
        continue;
      }
    }

    sanitized[key] = value;
  }

  // Set explicit red-team sandboxing flag
  sanitized['FABLE_REDTEAM_SANDBOX'] = '1';
  return sanitized;
}

/**
 * Validates whether a target URL complies with the ExecutionEnvelope boundaries.
 */
export function validateEnvelopeTarget(
  targetUrl: string,
  envelope: ExecutionEnvelope = DEFAULT_EXECUTION_ENVELOPE
): { allowed: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { allowed: false, reason: `Malformed URL string: ${targetUrl}` };
  }

  const protocol = parsed.protocol as 'http:' | 'https:';
  if (envelope.allowedProtocols && !envelope.allowedProtocols.includes(protocol)) {
    return {
      allowed: false,
      reason: `Protocol '${protocol}' not permitted by ExecutionEnvelope (allowed: ${envelope.allowedProtocols.join(', ')})`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

  if (envelope.networkEgress === 'loopback-only' && !isLoopback) {
    return {
      allowed: false,
      reason: `Egress policy 'loopback-only' prohibits outbound requests to non-loopback host '${hostname}'`,
    };
  }

  const hostAllowed = envelope.allowedHosts.some((h) => {
    if (h === hostname) return true;
    if (h.startsWith('*.')) {
      const rootDomain = h.slice(2).toLowerCase();
      return hostname.endsWith(`.${rootDomain}`) || hostname === rootDomain;
    }
    return false;
  });

  if (!hostAllowed) {
    return {
      allowed: false,
      reason: `Host '${hostname}' is not in the ExecutionEnvelope allowedHosts allowlist`,
    };
  }

  if (envelope.allowedPorts && envelope.allowedPorts.length > 0) {
    const port = parsed.port ? parseInt(parsed.port, 10) : protocol === 'https:' ? 443 : 80;
    if (!envelope.allowedPorts.includes(port)) {
      return {
        allowed: false,
        reason: `Port ${port} is not in the ExecutionEnvelope allowedPorts (${envelope.allowedPorts.join(', ')})`,
      };
    }
  }

  return { allowed: true };
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export interface EnvelopeFetchOptions extends RequestInit {
  timeoutMs?: number;
  skipRateLimit?: boolean;
}

export class EnvelopeHttpClient {
  private envelope: ExecutionEnvelope;
  private activeRequests = 0;
  private requestQueue: (() => void)[] = [];
  private lastRequestTime = 0;
  private totalRequestsSent = 0;
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private circuitWindow: boolean[] = [];
  private circuitTrippedAt = 0;

  constructor(envelope: ExecutionEnvelope = DEFAULT_EXECUTION_ENVELOPE) {
    this.envelope = envelope;
  }

  getEnvelope(): ExecutionEnvelope {
    return this.envelope;
  }

  getTotalRequestsSent(): number {
    return this.totalRequestsSent;
  }

  getCircuitBreakerState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    const config = this.envelope.circuitBreaker;
    if (!config || !config.enabled) return 'CLOSED';

    if (this.circuitBreakerState === 'OPEN') {
      const elapsed = Date.now() - this.circuitTrippedAt;
      if (elapsed > (config.recoveryTimeoutMs || 5000)) {
        this.circuitBreakerState = 'HALF_OPEN';
      }
    }
    return this.circuitBreakerState;
  }

  private checkCircuitBreaker(): void {
    const state = this.getCircuitBreakerState();
    if (state === 'OPEN') {
      throw new CircuitBreakerError(
        'CircuitBreaker is OPEN: Server error rate exceeded safe threshold. Pausing probing to prevent disruption.'
      );
    }
  }

  private recordCircuitResult(success: boolean): void {
    const config = this.envelope.circuitBreaker;
    if (!config || !config.enabled) return;

    if (this.circuitBreakerState === 'HALF_OPEN') {
      if (success) {
        this.circuitBreakerState = 'CLOSED';
        this.circuitWindow = [true];
      } else {
        this.circuitBreakerState = 'OPEN';
        this.circuitTrippedAt = Date.now();
      }
      return;
    }

    const windowSize = config.sampleWindowSize || 20;
    this.circuitWindow.push(success);
    if (this.circuitWindow.length > windowSize) {
      this.circuitWindow.shift();
    }

    if (this.circuitWindow.length >= Math.min(5, windowSize)) {
      const failures = this.circuitWindow.filter((v) => !v).length;
      const failureRate = (failures / this.circuitWindow.length) * 100;
      if (failureRate >= (config.failureThresholdPercent || 20)) {
        this.circuitBreakerState = 'OPEN';
        this.circuitTrippedAt = Date.now();
      }
    }
  }

  private async acquireConcurrencySlot(): Promise<void> {
    if (this.activeRequests < this.envelope.maxConcurrency) {
      this.activeRequests++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.requestQueue.push(() => {
        this.activeRequests++;
        resolve();
      });
    });
  }

  private releaseConcurrencySlot(): void {
    this.activeRequests--;
    if (this.requestQueue.length > 0 && this.activeRequests < this.envelope.maxConcurrency) {
      const next = this.requestQueue.shift();
      if (next) next();
    }
  }

  private async throttle(): Promise<void> {
    const rps = this.envelope.maxRequestsPerSecond || 10;
    const minIntervalMs = 1000 / rps;
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < minIntervalMs) {
      const waitTime = minIntervalMs - elapsed;
      await new Promise((r) => setTimeout(r, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  async fetch(url: string, init?: EnvelopeFetchOptions): Promise<Response> {
    const validation = validateEnvelopeTarget(url, this.envelope);
    if (!validation.allowed) {
      throw new Error(`ExecutionEnvelope Violation: ${validation.reason}`);
    }

    if (
      this.envelope.maxTotalRequests &&
      this.totalRequestsSent >= this.envelope.maxTotalRequests
    ) {
      throw new Error(
        `ExecutionEnvelope Budget Exceeded: Reached maxTotalRequests cap (${this.envelope.maxTotalRequests})`
      );
    }

    this.checkCircuitBreaker();
    await this.acquireConcurrencySlot();

    try {
      if (!init?.skipRateLimit) {
        await this.throttle();
      }

      this.totalRequestsSent++;
      const timeoutMs = init?.timeoutMs ?? this.envelope.maxDurationMs ?? 15000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      if (init?.signal) {
        init.signal.addEventListener('abort', () => controller.abort());
      }

      try {
        const res = await fetch(url, {
          ...init,
          signal: controller.signal,
        });

        // 502, 503, 504 are system-level service degradation signals
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          this.recordCircuitResult(false);
        } else {
          this.recordCircuitResult(true);
        }

        if (res.status === 429) {
          const retryAfter = res.headers.get('retry-after');
          let delayMs = 1000;
          if (retryAfter) {
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds)) {
              delayMs = seconds * 1000;
            } else {
              const dateMs = Date.parse(retryAfter);
              if (!isNaN(dateMs)) {
                delayMs = Math.max(0, dateMs - Date.now());
              }
            }
          }
          const jitter = Math.floor(Math.random() * 250);
          await new Promise((r) => setTimeout(r, Math.min(delayMs + jitter, 5000)));
        }

        return res;
      } catch (err) {
        this.recordCircuitResult(false);
        throw err;
      } finally {
        clearTimeout(timer);
      }
    } finally {
      this.releaseConcurrencySlot();
    }
  }

  async fetchText(
    url: string,
    init?: EnvelopeFetchOptions
  ): Promise<{ status: number; headers: Headers; text: string; truncated: boolean }> {
    const res = await this.fetch(url, init);
    const maxBytes = this.envelope.maxResponseBytes || 1024 * 1024;

    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let bytesRead = 0;
      let truncated = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          if (bytesRead + value.length > maxBytes) {
            const needed = maxBytes - bytesRead;
            chunks.push(value.slice(0, needed));
            bytesRead += needed;
            truncated = true;
            await reader.cancel();
            break;
          } else {
            chunks.push(value);
            bytesRead += value.length;
          }
        }
      }

      const totalBuffer = new Uint8Array(bytesRead);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(totalBuffer);
      return { status: res.status, headers: res.headers, text, truncated };
    } else {
      const fullText = await res.text();
      if (fullText.length > maxBytes) {
        return {
          status: res.status,
          headers: res.headers,
          text: fullText.slice(0, maxBytes),
          truncated: true,
        };
      }
      return { status: res.status, headers: res.headers, text: fullText, truncated: false };
    }
  }
}
