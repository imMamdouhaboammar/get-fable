/**
 * Core Type Definitions for Fable Orchestrator Engine (Fable Maestro).
 *
 * Grounded in REA reverse-engineered architectures:
 * - VectorOS: Honest Verify Spine & Actor Causation
 * - PortOS: 6-Part Delegation Contract & Sentinel Watchdog
 * - Meridian: Horizontal Blackboard & Contextual Thompson Sampling
 * - Sentinel: Tamper-Evident SHA-256 Chained Ledger
 * - HealFlow: Causal Diagnosis & Compensating Rollback
 * - Google AX & Agent Substrate: Declarative Tasks & Zero-Trust Sandboxing
 */

import type { FableSkillId, LifecyclePhase } from '../types.js';

export type WorkspaceStrategy = 'inplace' | 'worktree' | 'isolated-tmp';

export interface AcceptancePredicate {
  command: string;
  mustPass: boolean;
  timeoutMs?: number;
  expectedStdoutPattern?: string;
}

export interface TaskRoleAssignment {
  tier: 'light' | 'standard' | 'pro' | 'ultra';
  skills: FableSkillId[];
  model?: string;
  reasoningEffort?: 'low' | 'medium' | 'high' | 'ultra';
}

export interface OrchestratedTaskSpec {
  apiVersion: 'fable.io/v1alpha1';
  kind: 'OrchestratedTask';
  metadata: {
    name: string;
    createdAt?: string;
    labels?: Record<string, string>;
  };
  spec: {
    goal: string;
    workspace?: {
      strategy: WorkspaceStrategy;
      baseRef?: string;
      worktreeDir?: string;
    };
    budget?: {
      maxTurns?: number;
      maxCostUsd?: number;
      timeoutSeconds?: number;
    };
    roles?: {
      architect?: TaskRoleAssignment;
      implementer?: TaskRoleAssignment;
      reviewer?: TaskRoleAssignment;
    };
    acceptance: {
      predicates: AcceptancePredicate[];
    };
  };
}

export type ArtifactStatus = 'proposed' | 'requested' | 'committed' | 'rejected' | 'expired';

export interface BlackboardArtifact<T = unknown> {
  artifactId: string;
  taskId: string;
  workerId: string;
  artifactType: string;
  payload: T;
  timestamp: string;
  ttlSeconds: number;
  status: ArtifactStatus;
}

export interface DecisionAuditRecord {
  recordId: string;
  parentHash: string;
  timestamp: string;
  eventType:
    | 'task_submitted'
    | 'wave_scheduled'
    | 'worker_dispatched'
    | 'artifact_proposed'
    | 'artifact_committed'
    | 'verification_attempted'
    | 'heal_triggered'
    | 'task_completed'
    | 'task_failed'
    | 'task_cancelled';
  actorId: string;
  payload: Record<string, unknown>;
  recordHash: string;
}

export interface ExecutionTrace {
  turnId: string;
  taskId: string;
  workerId: string;
  timestamp: string;
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
    resultHash?: string;
  }>;
  fileDiffs: Array<{
    path: string;
    linesAdded: number;
    linesRemoved: number;
    mutationGeneration: number;
  }>;
  exitCode: number;
  stdoutSignature: string;
}

export type ActorCausationVerdict =
  | 'CAUSAL_PASS'       // Mutation directly caused the predicate to pass
  | 'UNCAUSED_PASS'     // Predicate passed but had zero overlap with mutation diff
  | 'MUTATION_FAILED'   // Predicate failed due to error
  | 'BLOCKED';          // Timeout or environment crash

export interface VerifySpineResult {
  verdict: ActorCausationVerdict;
  causalOverlapScore: number;
  verifiedGeneration: number;
  mutationGeneration: number;
  details: string;
}

export interface HealDiagnosis {
  diagnosisId: string;
  taskId: string;
  rootCause: string;
  affectedComponents: string[];
  smallestViableRepair: {
    strategy: 'in_lane_patch' | 'compensating_rollback' | 're_route';
    targetWorker?: string;
    remedialInstructions?: string;
  };
  rollbackCheckpoint?: string;
  confidence: number;
}

export interface WorkerHeartbeat {
  workerId: string;
  taskId: string;
  lastHeartbeat: number;
  pid?: number;
  worktreePath?: string;
  status: 'running' | 'idle' | 'stalled' | 'terminated';
}

export interface OrchestrationKernelStatus {
  taskId: string;
  phase: LifecyclePhase;
  activeWorkers: string[];
  mutationGeneration: number;
  verifiedGeneration: number;
  blackboardArtifactCount: number;
  ledgerRecordCount: number;
  auditChainValid: boolean;
  failureStreak: number;
  latestEvidence?: string;
}
