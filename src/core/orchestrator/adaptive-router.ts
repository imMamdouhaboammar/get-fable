/**
 * Adaptive Contextual Thompson Sampling Router for Fable Orchestrator.
 *
 * Grounded in Meridian (agentic-systems-lab) online decision optimization:
 * - Bayesian Beta-Bernoulli multi-armed bandit per (taskShape, skillId)
 * - Samples Beta distribution to balance exploration vs. exploitation
 * - Persists observed rewards to .fable/router-bandit.json
 */

import fs from 'node:fs';
import path from 'node:path';
import type { FableSkillId, FableTaskShape } from '../types.js';

export interface BanditArmStats {
  alpha: number; // Prior + Successes
  beta: number;  // Prior + Failures
  updatedAt: string;
}

export type BanditState = Record<string, BanditArmStats>;

/**
 * Generates a standard normal random variable using Box-Muller transform.
 */
function sampleStandardNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Samples a Gamma(alpha, 1) random variable using the Marsaglia & Tsang (2000) method.
 */
function sampleGamma(alpha: number): number {
  if (alpha < 1.0) {
    // For alpha < 1, use Johnk's generator or property: Gamma(alpha) = Gamma(alpha + 1) * U^(1/alpha)
    const u = Math.random();
    return sampleGamma(alpha + 1.0) * Math.pow(u, 1.0 / alpha);
  }

  const d = alpha - 1.0 / 3.0;
  const c = 1.0 / Math.sqrt(9.0 * d);

  while (true) {
    let z = sampleStandardNormal();
    let v = 1.0 + c * z;
    while (v <= 0) {
      z = sampleStandardNormal();
      v = 1.0 + c * z;
    }

    const v3 = v * v * v;
    const u = Math.random();

    // Squeeze test
    if (u < 1.0 - 0.0331 * z * z * z * z) {
      return d * v3;
    }

    if (Math.log(u) < 0.5 * z * z + d * (1.0 - v3 + Math.log(v3))) {
      return d * v3;
    }
  }
}

/**
 * Samples a Beta(alpha, beta) random variable.
 * Since X ~ Gamma(alpha, 1) and Y ~ Gamma(beta, 1), X / (X + Y) ~ Beta(alpha, beta).
 */
export function sampleBeta(alpha: number, beta: number): number {
  if (alpha <= 0 || beta <= 0) return 0.5;
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  if (x + y === 0) return 0.5;
  return Math.min(1.0, Math.max(0.0, x / (x + y)));
}

export interface AdaptiveRouterOptions {
  inMemoryOnly?: boolean;
  storagePath?: string;
  initialState?: BanditState;
}

export class AdaptiveRouterBandit {
  private state: BanditState = {};
  private inMemoryOnly: boolean;
  private storagePath: string;

  constructor(options: AdaptiveRouterOptions = {}) {
    this.inMemoryOnly = options.inMemoryOnly ?? false;
    this.storagePath =
      options.storagePath ||
      path.join(process.cwd(), '.fable', 'router-bandit.json');

    if (options.initialState) {
      this.state = { ...options.initialState };
    } else if (!this.inMemoryOnly && fs.existsSync(this.storagePath)) {
      this.load();
    }
  }

  private armKey(taskShape: FableTaskShape | string, skillId: FableSkillId | string): string {
    return `${taskShape}:${skillId}`;
  }

  public getStats(taskShape: FableTaskShape | string, skillId: FableSkillId | string): BanditArmStats {
    const key = this.armKey(taskShape, skillId);
    if (!this.state[key]) {
      this.state[key] = {
        alpha: 1.0, // Uniform Beta(1,1) prior
        beta: 1.0,
        updatedAt: new Date().toISOString(),
      };
    }
    return this.state[key];
  }

  public recordOutcome(
    taskShape: FableTaskShape | string,
    skillId: FableSkillId | string,
    success: boolean
  ): void {
    const stats = this.getStats(taskShape, skillId);
    if (success) {
      stats.alpha += 1.0;
    } else {
      stats.beta += 1.0;
    }
    stats.updatedAt = new Date().toISOString();

    if (!this.inMemoryOnly) {
      this.save();
    }
  }

  public sampleSkill(taskShape: FableTaskShape | string, skillId: FableSkillId | string): number {
    const stats = this.getStats(taskShape, skillId);
    return sampleBeta(stats.alpha, stats.beta);
  }

  public evaluateCandidates(
    taskShape: FableTaskShape | string,
    candidateSkills: Array<FableSkillId | string>
  ): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const skill of candidateSkills) {
      scores[skill] = this.sampleSkill(taskShape, skill);
    }
    return scores;
  }

  public exportState(): BanditState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public load(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        this.state = JSON.parse(raw);
      }
    } catch {
      this.state = {};
    }
  }

  public save(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storagePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.warn(`[AdaptiveRouter] Failed to persist state: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
