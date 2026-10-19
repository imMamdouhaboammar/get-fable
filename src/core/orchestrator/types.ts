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

import type { FableSkillId, FablePhase } from '../types.js';

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
  phase: FablePhase;
  activeWorkers: string[];
  mutationGeneration: number;
  verifiedGeneration: number;
  blackboardArtifactCount: number;
  ledgerRecordCount: number;
  auditChainValid: boolean;
  failureStreak: number;
  latestEvidence?: string;
}

export interface OrchestratorReaArtifactProvenance {
  repository: string;
  commitSha: string;
  role: string;
  coreInnovation: string;
  verifiedSymbols: string[];
}

export interface FableOrchestratorReaEvidenceLedger {
  version: string;
  studiedAt: string;
  cleanRoomAdaptation: boolean;
  corePhilosophy: string;
  repositories: Record<string, {
    url: string;
    commitSha: string;
    description: string;
    artifacts: OrchestratorReaArtifactProvenance[];
  }>;
}

export const FABLE_ORCHESTRATOR_REA_EVIDENCE_LEDGER: FableOrchestratorReaEvidenceLedger = {
  version: '1.0.0',
  studiedAt: '2026-10-19T09:30:00Z',
  cleanRoomAdaptation: true,
  corePhilosophy: 'Fable Maestro: Decoupled Dual-Plane Micro-Kernel unifying contextual multi-armed bandit routing, horizontal blackboard peer coordination, process watchdog monitoring, SHA-256 chained audit ledgers, honest verify spines, and causal rollback healing.',
  repositories: {
    'vector-os-nano': {
      url: 'https://github.com/VectorRobotics/vector-os-nano',
      commitSha: 'cd7029aad15d6510c956f504e57181cbb6651996',
      description: 'Zero-trust verification spine enforcing actor causation and anti-collusion between planner and verifier',
      artifacts: [
        {
          repository: 'VectorRobotics/vector-os-nano',
          commitSha: 'cd7029aad15d6510c956f504e57181cbb6651996',
          role: 'Honest Verify Spine & Actor Causation Engine',
          coreInnovation: 'Anti-collusion verification ensuring verifier and actor operate under strict epistemic separation',
          verifiedSymbols: ['verifySpine', 'causalOverlapScore', 'ActorCausationVerdict'],
        },
      ],
    },
    'PortOS': {
      url: 'https://github.com/atomantic/PortOS',
      commitSha: 'b0b2128d5b4c5c1df886a9a04b41c14da5b0bd5a',
      description: 'Host-agnostic operating system for autonomous agents with 6-part delegation contracts and process watchdog supervision',
      artifacts: [
        {
          repository: 'atomantic/PortOS',
          commitSha: 'b0b2128d5b4c5c1df886a9a04b41c14da5b0bd5a',
          role: 'Process Supervisor & Sentinel Watchdog',
          coreInnovation: 'Heartbeat monitoring, stalled worker termination, and zombie process cleanup',
          verifiedSymbols: ['SentinelWatchdog', 'WorkerHeartbeat', 'checkHealth'],
        },
      ],
    },
    'agentic-systems-lab': {
      url: 'https://github.com/ranadhir19/agentic-systems-lab',
      commitSha: 'b504a1c734d5e5beeaf6dd49200b79f2a1fa0102',
      description: 'Meridian contextual multi-armed bandit and horizontal blackboard architecture for peer coordination',
      artifacts: [
        {
          repository: 'ranadhir19/agentic-systems-lab',
          commitSha: 'b504a1c734d5e5beeaf6dd49200b79f2a1fa0102',
          role: 'Adaptive Thompson Sampling Router & Horizontal Blackboard',
          coreInnovation: 'Contextual bandit reward updating and two-phase propose/request/commit blackboard coordination',
          verifiedSymbols: ['ContextualThompsonRouter', 'HorizontalBlackboard', 'proposeArtifact'],
        },
      ],
    },
    'DeepCode': {
      url: 'https://github.com/HKUDS/DeepCode',
      commitSha: 'f183965f59a47cd1d437ee871a0d32b956dc9cdb',
      description: 'Multi-turn deliberative problem-solving with rigorous text goal decomposition and role specialization',
      artifacts: [
        {
          repository: 'HKUDS/DeepCode',
          commitSha: 'f183965f59a47cd1d437ee871a0d32b956dc9cdb',
          role: 'Task Goal Coercion & Deliberation Pipeline',
          coreInnovation: 'Transforms unstructured prompts into structured declarative task specifications with strict acceptance predicates',
          verifiedSymbols: ['parseTaskSpec', 'coerceTextGoalToSpec', 'AcceptancePredicate'],
        },
      ],
    },
    'agency-swarm': {
      url: 'https://github.com/VRSEN/agency-swarm',
      commitSha: 'a86d657e12b693be64a8dcb8ead560a7b9a4ef01',
      description: 'Dynamic communication graph topology and role-tiered agent swarm orchestration',
      artifacts: [
        {
          repository: 'VRSEN/agency-swarm',
          commitSha: 'a86d657e12b693be64a8dcb8ead560a7b9a4ef01',
          role: 'Hierarchical & Lateral Communication Graph',
          coreInnovation: 'Structured agent-to-agent message passing with role tiers (architect, implementer, reviewer)',
          verifiedSymbols: ['TaskRoleAssignment', 'coordinatePeer'],
        },
      ],
    },
    'ax': {
      url: 'https://github.com/google/ax',
      commitSha: '8888435d7e275f1e7ad1c127af9048b2d97ebc13',
      description: 'Declarative YAML/JSON task specifications, capability schemas, and strict acceptance predicates',
      artifacts: [
        {
          repository: 'google/ax',
          commitSha: '8888435d7e275f1e7ad1c127af9048b2d97ebc13',
          role: 'Declarative Task Specification Schema',
          coreInnovation: 'Standardized task manifests with resource budgets and automated acceptance verification commands',
          verifiedSymbols: ['OrchestratedTaskSpec', 'AcceptancePredicate'],
        },
      ],
    },
    'substrate': {
      url: 'https://github.com/agent-substrate/substrate',
      commitSha: 'fd17a2fb16b8569c8a3d2a58345a5643d529dd02',
      description: 'Zero-trust isolated worktrees and compensating rollback recovery flow',
      artifacts: [
        {
          repository: 'agent-substrate/substrate',
          commitSha: 'fd17a2fb16b8569c8a3d2a58345a5643d529dd02',
          role: 'Compensating Rollback & Causal Failure Diagnosis',
          coreInnovation: 'Safe atomic worktree isolation and deterministic failure recovery via smallest-viable-repair triage',
          verifiedSymbols: ['HealFlowEngine', 'HealDiagnosis', 'executeCompensatingRollback'],
        },
      ],
    },
  },
};

