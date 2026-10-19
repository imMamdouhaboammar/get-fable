import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { orchestrateSubagentsWithJev } from '../orchestrator/index.js';
import { probeAndTriage } from './triage-engine.js';
import { executeTriageAction } from './action-executors.js';
import type {
  StewardCycleResult,
  StewardOptions,
  TriageDecision,
} from './types.js';

export async function runStewardCycle(
  options: StewardOptions = {},
  cycleIndex = 1
): Promise<StewardCycleResult> {
  const cwd = options.cwd || process.cwd();
  const timestamp = new Date().toISOString();

  // 1. Probe & Triage with ignored/completed targets
  const { probe, decision } = probeAndTriage(cwd, options.ignoredTargets || []);

  // 2. If dry-run, return immediately
  if (options.dryRun) {
    return {
      cycleIndex,
      timestamp,
      decision,
      executed: false,
      status: 'skipped',
      message: `[DRY-RUN] Triage selected Tier ${decision.tier} (${decision.category}): "${decision.title}". No workspace mutations performed.`,
    };
  }

  // 3. Decompose task into subagents using JEV & TOON
  try {
    const delegationPlan = await orchestrateSubagentsWithJev(
      decision.suggestedTask,
      {
        cwd,
        repoRoot: cwd,
      }
    );

    // 4. Execute Real Verifications & Workflows based on Tier
    const execResult = await executeTriageAction(decision, cwd, cycleIndex, {
      allowSelfMerge: options.allowSelfMerge,
      dryRun: options.dryRun,
    });

    return {
      cycleIndex,
      timestamp,
      decision,
      delegationPlan,
      executed: execResult.executed,
      actionOutput: execResult.actionOutput,
      artifactsCreated: execResult.artifactsCreated,
      workSummary: execResult.workSummary,
      status: execResult.status === 'failed' ? 'failed' : 'success',
      message: `Cycle ${cycleIndex} triaged Tier ${decision.tier} (${decision.category}): "${decision.title}". ${execResult.workSummary}`,
    };
  } catch (err: any) {
    return {
      cycleIndex,
      timestamp,
      decision,
      executed: false,
      status: 'failed',
      message: `Cycle ${cycleIndex} triage failed during orchestration: ${err.message || String(err)}`,
    };
  }
}

import { StewardWatchdog } from './watchdog.js';

export async function runStewardPerpetualLoop(
  options: StewardOptions = {},
  onCycleComplete?: (result: StewardCycleResult) => void
): Promise<StewardCycleResult[]> {
  const results: StewardCycleResult[] = [];
  const maxCycles = options.maxCycles ?? (options.loop ? Infinity : 1);
  const baseInterval = (options.intervalSeconds || 60) * 1000;
  const completedTargets = new Set<string>(options.ignoredTargets || []);
  let cycle = 1;
  let consecutiveZeroWork = 0;

  const watchdog =
    options.watchdog !== false
      ? new StewardWatchdog({
          cwd: options.cwd,
          cycleTimeoutMs: options.watchdogTimeoutMs || 60_000,
          onTimeout: (cycleIdx, elapsedMs) => {
            console.error(
              `[WATCHDOG TIMEOUT] Cycle ${cycleIdx} exceeded timeout (${elapsedMs}ms). Triggering safety pause.`
            );
          },
          onCircuitBreakerTripped: (failures, reason) => {
            console.error(`[WATCHDOG BREAKER TRIPPED] ${reason}`);
          },
        })
      : null;

  while (cycle <= maxCycles) {
    const cycleOptions: StewardOptions = {
      ...options,
      ignoredTargets: Array.from(completedTargets),
    };

    try {
      watchdog?.startCycle(cycle);
      const result = await runStewardCycle(cycleOptions, cycle);
      watchdog?.recordSuccess(
        cycle,
        result.decision.targetReference,
        result.decision.category
      );
      results.push(result);

      // Track completed target so next cycle moves to the next problem!
      if (result.decision.targetReference) {
        completedTargets.add(result.decision.targetReference);
      }
      completedTargets.add(result.decision.category);

      if (onCycleComplete) {
        onCycleComplete(result);
      }

      if (!options.loop) {
        break;
      }

      // Adaptive Backoff: If Tier 5 (all higher tiers clear), back off
      if (result.decision.tier === 5) {
        consecutiveZeroWork += 1;
      } else {
        consecutiveZeroWork = 0;
      }

      const backoffMultiplier =
        options.intervalSeconds === 0
          ? 1
          : Math.min(Math.pow(1.5, consecutiveZeroWork), 10);
      const sleepMs =
        options.intervalSeconds === 0 ? 0 : Math.round(baseInterval * backoffMultiplier);

      if (sleepMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      }
      cycle += 1;
    } catch (err: any) {
      try {
        watchdog?.recordFailure(cycle, err?.message || String(err));
      } catch (breakerErr: any) {
        console.error(`[WATCHDOG PARKED] Loop terminated safely by circuit breaker: ${breakerErr.message}`);
        break;
      }
      cycle += 1;
    }
  }

  watchdog?.stop();
  return results;
}
