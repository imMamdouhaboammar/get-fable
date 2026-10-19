/**
 * Autonomous Algorithmic Utility: Capability 17
 * Exponential Backoff with Jitter & Decorrelated Retry Calculator.
 */
export interface BackoffConfig {
  baseMs: number;
  maxMs: number;
  factor?: number;
  jitter?: 'full' | 'equal' | 'none';
}

export class BackoffCalculator {
  private factor: number;
  private jitter: 'full' | 'equal' | 'none';

  constructor(private config: BackoffConfig) {
    this.factor = config.factor || 2;
    this.jitter = config.jitter || 'full';
  }

  public calculateDelay(attempt: number): number {
    const calculated = Math.min(
      this.config.maxMs,
      this.config.baseMs * Math.pow(this.factor, attempt)
    );

    if (this.jitter === 'none') {
      return Math.round(calculated);
    }
    if (this.jitter === 'equal') {
      const half = calculated / 2;
      return Math.round(half + Math.random() * half);
    }
    // full jitter: random between 0 and calculated
    return Math.round(Math.random() * calculated);
  }
}
