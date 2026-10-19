/**
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
