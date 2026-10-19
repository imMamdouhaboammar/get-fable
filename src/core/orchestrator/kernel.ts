/**
 * Fable Orchestrator Master Kernel (Fable Maestro).
 *
 * Coordinates:
 * - Declarative Task Ingress (Google AX / DeepCode)
 * - Adaptive Contextual Thompson Sampling Router (Meridian)
 * - Horizontal Peer Coordination Blackboard (Meridian)
 * - Process & Worktree Supervision (PortOS Sentinel Watchdog)
 * - Tamper-Evident SHA-256 Audit Ledger (Sentinel)
 * - Honest Verify Spine & Actor Causation (VectorOS)
 * - Causal Failure Recovery (HealFlow)
 */

import { AdaptiveRouterBandit } from './adaptive-router.js';
import { HorizontalBlackboard } from './blackboard.js';
import { HealFlowEngine } from './healflow.js';
import { SentinelLedger } from './ledger.js';
import { SentinelWatchdog } from './sentinel-watchdog.js';
import { evaluateExecutionTrace } from './verify-spine.js';
import type {
  ExecutionTrace,
  HealDiagnosis,
  OrchestratedTaskSpec,
  OrchestrationKernelStatus,
  VerifySpineResult,
  WorkerHeartbeat,
} from './types.js';

export interface KernelOptions {
  inMemoryOnly?: boolean;
  baseRef?: string;
}

export interface ScheduledWave {
  waveIndex: number;
  taskId: string;
  dispatchedWorkers: Array<{
    workerId: string;
    role: string;
    skills: string[];
    tier: string;
  }>;
}

export class FableOrchestratorKernel {
  private inMemoryOnly: boolean;
  private currentSpec: OrchestratedTaskSpec | null = null;
  private currentPhase: OrchestrationKernelStatus['phase'] = 'idle';
  private currentWaveIndex = 0;
  private mutationGeneration = 1;
  private verifiedGeneration = 0;
  private failureStreak = 0;
  private latestEvidence = '';

  public readonly adaptiveRouter: AdaptiveRouterBandit;
  public readonly blackboard: HorizontalBlackboard;
  public readonly watchdog: SentinelWatchdog;
  public readonly ledger: SentinelLedger;
  public readonly healflow: HealFlowEngine;

  constructor(options: KernelOptions = {}) {
    this.inMemoryOnly = options.inMemoryOnly ?? false;

    this.adaptiveRouter = new AdaptiveRouterBandit({ inMemoryOnly: this.inMemoryOnly });
    this.blackboard = new HorizontalBlackboard({ inMemoryOnly: this.inMemoryOnly });
    this.watchdog = new SentinelWatchdog({ heartbeatTimeoutMs: 30000 });
    this.ledger = new SentinelLedger({ inMemoryOnly: this.inMemoryOnly });
    this.healflow = new HealFlowEngine({ inMemoryOnly: this.inMemoryOnly });
  }

  public submitTask(spec: OrchestratedTaskSpec): { taskId: string; phase: string; activeWorkers: string[] } {
    this.currentSpec = spec;
    this.currentPhase = 'planned';
    this.currentWaveIndex = 0;
    this.mutationGeneration = 1;
    this.verifiedGeneration = 0;
    this.failureStreak = 0;

    this.ledger.append('task_submitted', 'orchestrator-boss', {
      taskId: spec.metadata.name,
      goal: spec.spec.goal,
      strategy: spec.spec.workspace?.strategy || 'inplace',
      budget: spec.spec.budget,
    });

    return {
      taskId: spec.metadata.name,
      phase: this.currentPhase,
      activeWorkers: [],
    };
  }

  public scheduleNextWave(): ScheduledWave {
    if (!this.currentSpec) {
      throw new Error('No active task submitted to orchestrator');
    }

    this.currentWaveIndex++;
    this.currentPhase = 'executing';
    const taskId = this.currentSpec.metadata.name;
    const roles = this.currentSpec.spec.roles || {};

    const dispatched: ScheduledWave['dispatchedWorkers'] = [];

    // Wave 1: Architect/Planning
    if (this.currentWaveIndex === 1) {
      const architect = roles.architect || {
        tier: 'pro',
        skills: ['fable-plan', 'fable-architecture'],
      };
      const workerId = `worker-arch-${Date.now().toString(36)}`;
      this.watchdog.registerWorker({ workerId, taskId });
      dispatched.push({
        workerId,
        role: 'architect',
        skills: architect.skills,
        tier: architect.tier,
      });
    } else {
      // Subsequent Waves: Implementers & Reviewers
      const implementer = roles.implementer || {
        tier: 'standard',
        skills: ['fable-execute', 'fable-tdd'],
      };
      const workerId = `worker-impl-${Date.now().toString(36)}`;
      this.watchdog.registerWorker({ workerId, taskId });
      dispatched.push({
        workerId,
        role: 'implementer',
        skills: implementer.skills,
        tier: implementer.tier,
      });
    }

    this.ledger.append('wave_scheduled', 'orchestrator-boss', {
      taskId,
      waveIndex: this.currentWaveIndex,
      dispatched,
    });

    return {
      waveIndex: this.currentWaveIndex,
      taskId,
      dispatchedWorkers: dispatched,
    };
  }

  public proposeArtifact<T = unknown>(
    workerId: string,
    artifactType: string,
    payload: T,
    ttlSeconds?: number
  ) {
    if (!this.currentSpec) throw new Error('No active task');
    const taskId = this.currentSpec.metadata.name;

    const artifact = this.blackboard.propose({
      taskId,
      workerId,
      artifactType,
      payload,
      ttlSeconds,
    });

    this.ledger.append('artifact_proposed', workerId, {
      taskId,
      artifactId: artifact.artifactId,
      artifactType,
    });

    return artifact;
  }

  public queryBlackboard(artifactType?: string) {
    if (!this.currentSpec) return [];
    return this.blackboard.query(this.currentSpec.metadata.name, artifactType);
  }

  public commitArtifact(artifactId: string, actorId: string) {
    if (!this.currentSpec) throw new Error('No active task');
    const taskId = this.currentSpec.metadata.name;

    const committed = this.blackboard.commit(taskId, artifactId, actorId);
    this.ledger.append('artifact_committed', actorId, {
      taskId,
      artifactId,
    });
    return committed;
  }

  public verifyStep(trace: ExecutionTrace, command: string): VerifySpineResult {
    if (!this.currentSpec) throw new Error('No active task');

    this.mutationGeneration++;
    const result = evaluateExecutionTrace(trace, command, this.mutationGeneration);

    if (result.verdict === 'CAUSAL_PASS') {
      this.verifiedGeneration = result.verifiedGeneration;
      this.failureStreak = 0;
      this.latestEvidence = result.details;

      // Update Bandit reward
      this.adaptiveRouter.recordOutcome('bounded-change', trace.workerId, true);

      this.ledger.append('verification_attempted', 'verify-spine', {
        taskId: this.currentSpec.metadata.name,
        verdict: result.verdict,
        overlapScore: result.causalOverlapScore,
        details: result.details,
      });
    } else {
      this.failureStreak++;
      this.adaptiveRouter.recordOutcome('bounded-change', trace.workerId, false);
    }

    return result;
  }

  public handleStepFailure(trace: ExecutionTrace, command: string): HealDiagnosis {
    if (!this.currentSpec) throw new Error('No active task');

    this.failureStreak++;
    const mutated = trace.fileDiffs.map((d) => d.path);
    const diagnosis = this.healflow.diagnose(
      this.currentSpec.metadata.name,
      trace.stdoutSignature,
      mutated,
      { activeLane: trace.workerId }
    );

    this.ledger.append('heal_triggered', 'healflow', {
      taskId: this.currentSpec.metadata.name,
      diagnosisId: diagnosis.diagnosisId,
      rootCause: diagnosis.rootCause,
      strategy: diagnosis.smallestViableRepair.strategy,
    });

    return diagnosis;
  }

  public verifyAuditChain() {
    return this.ledger.verifyChain();
  }

  public listActiveWorkers(): WorkerHeartbeat[] {
    return this.watchdog.listActiveWorkers(this.currentSpec?.metadata.name);
  }

  public getStatus(): OrchestrationKernelStatus {
    const chain = this.ledger.verifyChain();
    return {
      taskId: this.currentSpec ? this.currentSpec.metadata.name : 'none',
      phase: this.currentPhase,
      activeWorkers: this.listActiveWorkers().map((w) => w.workerId),
      mutationGeneration: this.mutationGeneration,
      verifiedGeneration: this.verifiedGeneration,
      blackboardArtifactCount: this.blackboard.count(this.currentSpec?.metadata.name),
      ledgerRecordCount: this.ledger.getRecords().length,
      auditChainValid: chain.valid,
      failureStreak: this.failureStreak,
      latestEvidence: this.latestEvidence,
    };
  }

  public cancelTask(reason: string): void {
    if (!this.currentSpec) return;
    const taskId = this.currentSpec.metadata.name;
    this.currentPhase = 'blocked';

    for (const w of this.listActiveWorkers()) {
      this.watchdog.terminateWorker(w.workerId, reason);
    }

    this.ledger.append('task_cancelled', 'orchestrator-boss', {
      taskId,
      reason,
    });
  }
}
