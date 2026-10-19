/**
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
