import { loadSkillRegistry } from '../skill-registry.js';
import { routeTask } from '../task-router.js';
import type { FableSkillId, FableState, RoutingDecision, SkillRegistry } from '../types.js';
import { loadReflexConfig } from './config.js';
import { calculateProbabilityMargin, isAmbiguous } from './disambiguation.js';
import { buildReflexEnvelope } from './envelope.js';
import { fuseRoute } from './fusion.js';
import { appendReflexEvent, hashTaskText } from './ledger.js';
import { extractHardPolicy } from './policy-snapshot.js';
import { TypeSafeJevAdvisor } from './providers/typesafe-jev.js';
import type {
  HardPolicySnapshot,
  ReflexAdvice,
  ReflexAdvisor,
  ReflexConfig,
  RouteResolution,
} from './types.js';

export interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: number;
  isOpen: boolean;
}

export const CIRCUIT_BREAKER_THRESHOLD = 3;
export const CIRCUIT_BREAKER_COOLDOWN_MS = 30000;

export class ReflexCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;

  recordSuccess() {
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  isOpen(): boolean {
    if (this.failureCount < CIRCUIT_BREAKER_THRESHOLD) {
      return false;
    }
    const elapsed = Date.now() - this.lastFailureTime;
    if (elapsed > CIRCUIT_BREAKER_COOLDOWN_MS) {
      // Half-open attempt: allow one test request through
      return false;
    }
    return true;
  }

  reset() {
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  getState(): CircuitBreakerState {
    return {
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      isOpen: this.isOpen(),
    };
  }
}

export const globalCircuitBreaker = new ReflexCircuitBreaker();

/**
 * Async route orchestrator service that coordinates deterministic routing, Jev Reflex advice, and route fusion.
 */
export async function resolveRoute(
  task: string,
  state?: FableState | null,
  options?: {
    config?: ReflexConfig;
    advisor?: ReflexAdvisor;
    registry?: SkillRegistry;
    circuitBreaker?: ReflexCircuitBreaker;
  }
): Promise<RouteResolution> {
  const registry = options?.registry || loadSkillRegistry();
  const config = options?.config || loadReflexConfig();
  const circuitBreaker = options?.circuitBreaker || globalCircuitBreaker;

  // 1. Compute canonical deterministic route synchronously first
  const deterministic = routeTask(task, state, registry);
  const policy: HardPolicySnapshot = extractHardPolicy(task, state, deterministic);

  // 2. If reflex is off, return immediately with zero network or provider operations
  if (config.mode === 'off') {
    return {
      decision: deterministic,
      mode: 'off',
      deterministicDecision: deterministic,
      policySnapshot: policy,
    };
  }

  // 3. Build state envelope and check fail-closed condition (e.g. secret redaction)
  const { envelope, failClosed, reason: failClosedReason } = buildReflexEnvelope(
    task,
    state,
    deterministic
  );

  if (failClosed) {
    return {
      decision: deterministic,
      mode: config.mode,
      deterministicDecision: deterministic,
      fallbackReason: failClosedReason,
      policySnapshot: policy,
    };
  }

  // 4. Check circuit breaker
  if (circuitBreaker.isOpen()) {
    return {
      decision: deterministic,
      mode: config.mode,
      deterministicDecision: deterministic,
      fallbackReason: `Reflex circuit breaker is OPEN due to ${CIRCUIT_BREAKER_THRESHOLD} consecutive failures; falling back to deterministic route`,
      policySnapshot: policy,
    };
  }

  // 5. Instantiate advisor if not provided
  let advisor = options?.advisor;
  if (!advisor) {
    try {
      advisor = new TypeSafeJevAdvisor(config);
    } catch (err: any) {
      return {
        decision: deterministic,
        mode: config.mode,
        deterministicDecision: deterministic,
        fallbackReason: `Could not instantiate advisor: ${err.message}`,
        policySnapshot: policy,
      };
    }
  }

  // 6. Request advice with timeout racing
  try {
    const advice = await advisor.advise(envelope);
    circuitBreaker.recordSuccess();

    let finalAdvice = advice;

    // 6b. Two-stage disambiguation when ambiguous in guarded/authority mode
    if (
      (config.mode === 'guarded' || config.mode === 'authority') &&
      typeof advisor.adviseSecondStage === 'function' &&
      isAmbiguous(advice, envelope, config, registry)
    ) {
      const { topSkill, secondSkill } = calculateProbabilityMargin(advice.probabilities);
      const candidates: FableSkillId[] = [];
      if (topSkill) candidates.push(topSkill);
      if (secondSkill && !candidates.includes(secondSkill)) candidates.push(secondSkill);
      if (deterministic.selectedSkill && !candidates.includes(deterministic.selectedSkill)) {
        candidates.push(deterministic.selectedSkill);
      }

      if (candidates.length > 0) {
        try {
          const secondStage = await advisor.adviseSecondStage(envelope, candidates);
          if (
            secondStage.bestCandidate !== 'none_of_these' &&
            secondStage.candidateFits >= 0.7 &&
            (secondStage.confidence ?? 0) >= config.minMargin
          ) {
            finalAdvice = {
              ...advice,
              selectedSkill: secondStage.bestCandidate,
              probabilities: secondStage.probabilities as Partial<Record<FableSkillId, number>>,
              confidence: secondStage.confidence,
              stage: 2,
              latencyMs: advice.latencyMs + secondStage.latencyMs,
            };
          } else {
            // Abstain to deterministic route
            finalAdvice = {
              ...advice,
              selectedSkill: null,
              confidence: null,
              stage: 2,
              latencyMs: advice.latencyMs + secondStage.latencyMs,
            };
          }
        } catch {
          // If stage 2 fails, proceed with initial advice
        }
      }
    }

    // 7. Fuse advice with deterministic decision
    const resolution = fuseRoute({
      deterministic,
      policy,
      mode: config.mode,
      config,
      advice: finalAdvice,
      registry,
    });

    if (config.telemetry === 'local') {
      appendReflexEvent({
        schemaVersion: 1,
        timestamp: new Date().toISOString(),
        taskHash: hashTaskText(task),
        taskLength: task.length,
        mode: config.mode,
        provider: config.provider,
        model: advice.model,
        deterministicSkill: deterministic.selectedSkill,
        reflexSkill: advice.selectedSkill,
        fusedSkill: resolution.decision.selectedSkill,
        confidence: advice.confidence,
        margin: advice.probabilities && advice.selectedSkill ? (advice.probabilities[advice.selectedSkill] ?? null) : null,
        latencyMs: advice.latencyMs,
        usage: advice.usage,
      });
    }

    return resolution;
  } catch (err: any) {
    circuitBreaker.recordFailure();
    const resolution: RouteResolution = {
      decision: deterministic,
      mode: config.mode,
      deterministicDecision: deterministic,
      fallbackReason: `Provider error (${err?.kind || 'unknown'}): ${err?.message || 'unknown failure'}; falling back to deterministic route`,
      policySnapshot: policy,
    };

    if (config.telemetry === 'local') {
      appendReflexEvent({
        schemaVersion: 1,
        timestamp: new Date().toISOString(),
        taskHash: hashTaskText(task),
        taskLength: task.length,
        mode: config.mode,
        provider: config.provider,
        model: config.model,
        deterministicSkill: deterministic.selectedSkill,
        reflexSkill: null,
        fusedSkill: deterministic.selectedSkill,
        confidence: null,
        margin: null,
        latencyMs: 0,
        fallbackReason: resolution.fallbackReason,
      });
    }

    return resolution;
  }
}
