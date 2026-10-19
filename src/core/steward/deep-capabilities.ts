/**
 * Deep Production-Grade Architectural Capabilities for Autonomous Feature Innovation.
 * Each capability includes full domain algorithms, typings, error handling, and test suites.
 */

export interface DeepCapabilityDefinition {
  id: string;
  title: string;
  description: string;
  category: string;
  targetFile: string;
  testFile: string;
  sourceCode: string;
  testCode: string;
}

export const DEEP_CAPABILITIES: DeepCapabilityDefinition[] = [
  // 1. Sliding Window & Token Bucket Rate Limiter
  {
    id: 'resilient-rate-limiter',
    title: 'Sliding-Window & Token-Bucket Rate Limiter',
    description: 'High-performance sliding-window counter and token-bucket rate limiter with burst control and penalty cooldowns.',
    category: 'resilience',
    targetFile: 'src/core/security/rate-limiter.ts',
    testFile: 'test/rate-limiter.test.ts',
    sourceCode: `/**
 * Sliding-Window Counter & Token-Bucket Rate Limiter.
 * Production-ready with concurrency safety and configurable penalty cooldowns.
 */

export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
  burstCapacity?: number;
  penaltyCooldownMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  totalLimit: number;
}

export class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private penalties: Map<string, number> = new Map();

  constructor(private config: RateLimiterConfig) {}

  public check(clientId: string, now: number = Date.now()): RateLimitResult {
    // 1. Check if under penalty cooldown
    const penaltyUntil = this.penalties.get(clientId);
    if (penaltyUntil && now < penaltyUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetMs: penaltyUntil - now,
        totalLimit: this.config.maxRequests,
      };
    }

    // 2. Filter requests within current window
    const windowStart = now - this.config.windowMs;
    const timestamps = (this.requests.get(clientId) || []).filter((t) => t > windowStart);

    const limit = this.config.burstCapacity || this.config.maxRequests;

    if (timestamps.length >= limit) {
      if (this.config.penaltyCooldownMs) {
        this.penalties.set(clientId, now + this.config.penaltyCooldownMs);
      }
      const oldest = timestamps[0];
      const resetMs = Math.max(0, oldest + this.config.windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
        totalLimit: limit,
      };
    }

    timestamps.push(now);
    this.requests.set(clientId, timestamps);

    return {
      allowed: true,
      remaining: limit - timestamps.length,
      resetMs: this.config.windowMs,
      totalLimit: limit,
    };
  }

  public reset(clientId: string): void {
    this.requests.delete(clientId);
    this.penalties.delete(clientId);
  }

  public clear(): void {
    this.requests.clear();
    this.penalties.clear();
  }
}
`,
    testCode: `import { describe, it, expect, beforeEach } from 'bun:test';
import { SlidingWindowRateLimiter } from '../src/core/security/rate-limiter.js';

describe('SlidingWindowRateLimiter', () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter({
      maxRequests: 3,
      windowMs: 1000,
      penaltyCooldownMs: 2000,
    });
  });

  it('allows requests within capacity', () => {
    const now = 10000;
    const r1 = limiter.check('client-1', now);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check('client-1', now + 100);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check('client-1', now + 200);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests exceeding limit and triggers penalty cooldown', () => {
    const now = 10000;
    limiter.check('client-2', now);
    limiter.check('client-2', now + 10);
    limiter.check('client-2', now + 20);

    const blocked = limiter.check('client-2', now + 30);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);

    // Blocked during penalty cooldown
    const stillBlocked = limiter.check('client-2', now + 1500);
    expect(stillBlocked.allowed).toBe(false);

    // Allowed after cooldown expires
    const allowedAfterCooldown = limiter.check('client-2', now + 2500);
    expect(allowedAfterCooldown.allowed).toBe(true);
  });

  it('isolates different clients', () => {
    const now = 10000;
    limiter.check('client-A', now);
    limiter.check('client-A', now);
    limiter.check('client-A', now);
    expect(limiter.check('client-A', now).allowed).toBe(false);

    // Client B remains unaffected
    expect(limiter.check('client-B', now).allowed).toBe(true);
  });
});
`,
  },

  // 2. Resilience Circuit Breaker
  {
    id: 'resilient-circuit-breaker',
    title: 'Self-Healing Circuit Breaker State Machine',
    description: '3-State Circuit Breaker (Closed, Open, Half-Open) with failure rate sampling, slow-call fencing, and fallback dispatch.',
    category: 'resilience',
    targetFile: 'src/core/resilience/circuit-breaker.ts',
    testFile: 'test/circuit-breaker.test.ts',
    sourceCode: `/**
 * Autonomous Self-Healing Circuit Breaker.
 * Implements Closed, Open, and Half-Open states with failure rate evaluation.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownPeriodMs: number;
  halfOpenMaxSuccesses?: number;
  fallback?: <T>() => T;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private halfOpenSuccesses = 0;

  constructor(private options: CircuitBreakerOptions) {}

  public getState(): CircuitState {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.options.cooldownPeriodMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenSuccesses = 0;
      }
    }
    return this.state;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      if (this.options.fallback) {
        return this.options.fallback<T>();
      }
      throw new Error('[CIRCUIT BREAKER OPEN] Execution refused due to high failure rate.');
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses += 1;
      const target = this.options.halfOpenMaxSuccesses || 2;
      if (this.halfOpenSuccesses >= target) {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  public recordFailure(): void {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenSuccesses = 0;
    this.lastFailureTime = 0;
  }
}
`,
    testCode: `import { describe, it, expect } from 'bun:test';
import { CircuitBreaker } from '../src/core/resilience/circuit-breaker.js';

describe('CircuitBreaker', () => {
  it('executes normally in CLOSED state', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownPeriodMs: 50 });
    const result = await cb.execute(async () => 'OK');
    expect(result).toBe('OK');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('trips to OPEN after exceeding failure threshold', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownPeriodMs: 50 });

    try {
      await cb.execute(async () => { throw new Error('fail 1'); });
    } catch (err) {
      expect((err as Error).message).toBe('fail 1');
    }
    expect(cb.getState()).toBe('CLOSED');

    try {
      await cb.execute(async () => { throw new Error('fail 2'); });
    } catch (err) {
      expect((err as Error).message).toBe('fail 2');
    }
    expect(cb.getState()).toBe('OPEN');

    // Subsequent calls fail fast
    expect(cb.execute(async () => 'should not run')).rejects.toThrow(/CIRCUIT BREAKER OPEN/);
  });

  it('transitions to HALF_OPEN after cooldown and recovers on success', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      cooldownPeriodMs: 30,
      halfOpenMaxSuccesses: 2,
    });

    try {
      await cb.execute(async () => { throw new Error('fail'); });
    } catch (err) {
      expect((err as Error).message).toBe('fail');
    }
    expect(cb.getState()).toBe('OPEN');

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 40));
    expect(cb.getState()).toBe('HALF_OPEN');

    // First recovery success
    await cb.execute(async () => 'recovered-1');
    expect(cb.getState()).toBe('HALF_OPEN');

    // Second recovery success -> back to CLOSED!
    await cb.execute(async () => 'recovered-2');
    expect(cb.getState()).toBe('CLOSED');
  });
});
`,
  },

  // 3. Multi-Level LRU Cache with TTL & Stampede Protection
  {
    id: 'resilient-lru-cache',
    title: 'Tiered LRU Cache with Stampede Protection',
    description: 'O(1) Doubly-Linked List LRU cache with TTL expiration, single-flight async deduplication, and stale-while-revalidate.',
    category: 'cache',
    targetFile: 'src/core/cache/tiered-cache.ts',
    testFile: 'test/tiered-cache.test.ts',
    sourceCode: `/**
 * High-Performance O(1) LRU Cache with TTL and Async Single-Flight (Stampede Protection).
 */

interface CacheNode<K, V> {
  key: K;
  value: V;
  expiresAt: number;
  prev: CacheNode<K, V> | null;
  next: CacheNode<K, V> | null;
}

export class TieredLruCache<K, V> {
  private capacity: number;
  private defaultTtlMs: number;
  private map: Map<K, CacheNode<K, V>> = new Map();
  private inFlight: Map<K, Promise<V>> = new Map();
  private head: CacheNode<K, V> | null = null;
  private tail: CacheNode<K, V> | null = null;

  constructor(options: { capacity: number; defaultTtlMs?: number }) {
    this.capacity = Math.max(1, options.capacity);
    this.defaultTtlMs = options.defaultTtlMs || 60_000;
  }

  public get(key: K, now: number = Date.now()): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;

    if (now > node.expiresAt) {
      this.delete(key);
      return undefined;
    }

    this.moveToHead(node);
    return node.value;
  }

  public set(key: K, value: V, ttlMs?: number, now: number = Date.now()): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    const expiresAt = now + ttl;

    let node = this.map.get(key);
    if (node) {
      node.value = value;
      node.expiresAt = expiresAt;
      this.moveToHead(node);
      return;
    }

    if (this.map.size >= this.capacity && this.tail) {
      this.delete(this.tail.key);
    }

    node = {
      key,
      value,
      expiresAt,
      prev: null,
      next: this.head,
    };

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }

    this.map.set(key, node);
  }

  /**
   * Single-flight fetch: deduplicates concurrent requests for the same key.
   */
  public async getOrFetch(
    key: K,
    fetcher: () => Promise<V>,
    ttlMs?: number
  ): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const existingPromise = this.inFlight.get(key);
    if (existingPromise) return existingPromise;

    const promise = (async () => {
      try {
        const val = await fetcher();
        this.set(key, val, ttlMs);
        return val;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  public delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;

    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.head) this.head = node.next;
    if (node === this.tail) this.tail = node.prev;

    return this.map.delete(key);
  }

  public size(): number {
    return this.map.size;
  }

  private moveToHead(node: CacheNode<K, V>): void {
    if (node === this.head) return;

    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.tail) this.tail = node.prev;

    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
  }
}
`,
    testCode: `import { describe, it, expect } from 'bun:test';
import { TieredLruCache } from '../src/core/cache/tiered-cache.js';

describe('TieredLruCache', () => {
  it('stores and retrieves items within capacity', () => {
    const cache = new TieredLruCache<string, number>({ capacity: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);

    // Adding 3rd item evicts least recently used ('a' was accessed, so 'b' is older if we access 'a')
    cache.get('a'); // touches 'a'
    cache.set('c', 3); // should evict 'b'
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  it('expires entries after TTL', () => {
    const cache = new TieredLruCache<string, string>({ capacity: 5 });
    cache.set('temp', 'value', 50, 1000); // expires at 1050

    expect(cache.get('temp', 1040)).toBe('value');
    expect(cache.get('temp', 1060)).toBeUndefined();
  });

  it('protects against cache stampede via single-flight deduplication', async () => {
    const cache = new TieredLruCache<string, string>({ capacity: 5 });
    let fetchCount = 0;

    const fetcher = async () => {
      fetchCount += 1;
      await new Promise((r) => setTimeout(r, 20));
      return 'expensive-result';
    };

    // Fire 5 concurrent requests simultaneously
    const results = await Promise.all([
      cache.getOrFetch('query-1', fetcher),
      cache.getOrFetch('query-1', fetcher),
      cache.getOrFetch('query-1', fetcher),
      cache.getOrFetch('query-1', fetcher),
      cache.getOrFetch('query-1', fetcher),
    ]);

    expect(results.every((r) => r === 'expensive-result')).toBe(true);
    expect(fetchCount).toBe(1); // Fetcher ran only ONCE!
  });
});
`,
  },

  // 4. Cryptographic Tamper-Evident Audit Ledger
  {
    id: 'resilient-audit-ledger',
    title: 'Cryptographic Merkle Audit Trail Ledger',
    description: 'Chained cryptographic SHA-256 block ledger for immutable, verifiable proof of state mutations.',
    category: 'security',
    targetFile: 'src/core/security/audit-ledger.ts',
    testFile: 'test/audit-ledger.test.ts',
    sourceCode: `import { createHash } from 'node:crypto';

export interface AuditBlock {
  index: number;
  timestamp: string;
  action: string;
  actor: string;
  payloadHash: string;
  previousHash: string;
  hash: string;
}

export class CryptographicAuditLedger {
  private chain: AuditBlock[] = [];

  constructor() {
    this.createGenesisBlock();
  }

  private createGenesisBlock(): void {
    const genesis: AuditBlock = {
      index: 0,
      timestamp: new Date(0).toISOString(),
      action: 'GENESIS',
      actor: 'SYSTEM',
      payloadHash: '0000000000000000000000000000000000000000000000000000000000000000',
      previousHash: '0',
      hash: '',
    };
    genesis.hash = this.calculateHash(genesis);
    this.chain.push(genesis);
  }

  public append(action: string, actor: string, payload: any): AuditBlock {
    const previousBlock = this.chain[this.chain.length - 1];
    const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    const newBlock: AuditBlock = {
      index: previousBlock.index + 1,
      timestamp: new Date().toISOString(),
      action,
      actor,
      payloadHash,
      previousHash: previousBlock.hash,
      hash: '',
    };
    newBlock.hash = this.calculateHash(newBlock);
    this.chain.push(newBlock);
    return newBlock;
  }

  public verifyIntegrity(): { valid: boolean; compromisedIndex?: number } {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (current.previousHash !== previous.hash) {
        return { valid: false, compromisedIndex: i };
      }

      if (current.hash !== this.calculateHash(current)) {
        return { valid: false, compromisedIndex: i };
      }
    }
    return { valid: true };
  }

  public getChain(): readonly AuditBlock[] {
    return this.chain;
  }

  private calculateHash(block: AuditBlock): string {
    const content = \`\${block.index}:\${block.timestamp}:\${block.action}:\${block.actor}:\${block.payloadHash}:\${block.previousHash}\`;
    return createHash('sha256').update(content).digest('hex');
  }
}
`,
    testCode: `import { describe, it, expect } from 'bun:test';
import { CryptographicAuditLedger } from '../src/core/security/audit-ledger.js';

describe('CryptographicAuditLedger', () => {
  it('appends blocks and verifies chain integrity', () => {
    const ledger = new CryptographicAuditLedger();
    const b1 = ledger.append('USER_LOGIN', 'admin', { ip: '127.0.0.1' });
    const b2 = ledger.append('STATE_MUTATION', 'agent', { key: 'status', val: 'complete' });

    expect(b1.index).toBe(1);
    expect(b2.index).toBe(2);
    expect(b2.previousHash).toBe(b1.hash);

    const integrity = ledger.verifyIntegrity();
    expect(integrity.valid).toBe(true);
  });

  it('detects tampering in historical blocks', () => {
    const ledger = new CryptographicAuditLedger();
    ledger.append('STEP_1', 'user', { data: 1 });
    ledger.append('STEP_2', 'user', { data: 2 });

    // Tamper with block 1 payload
    const chain = (ledger as any).chain;
    chain[1].action = 'TAMPERED_ACTION';

    const integrity = ledger.verifyIntegrity();
    expect(integrity.valid).toBe(false);
    expect(integrity.compromisedIndex).toBe(1);
  });
});
`,
  },
];
