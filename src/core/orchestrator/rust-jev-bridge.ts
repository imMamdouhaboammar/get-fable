import { spawnSync } from 'node:child_process';
import { getCoreRepoRoot } from '../skill-registry.js';
import { findNativeBinary } from '../../eco/native-bridge.js';

export interface JevCalibrationReceipt {
  model: string;
  primitive: string;
  probabilities: Record<string, number>;
  shannonEntropy: number;
  normalizedEntropy: number;
  calibratedConfidence: number;
  usedLiveApi: boolean;
  cacheHit: boolean;
}

export interface SubtaskSpec {
  id: string;
  title: string;
  description: string;
  readScope: string[];
  writeScope: string[];
  sharedContracts: string[];
  verificationCmd: string;
  phaseHint: string;
  wave: number;
}

export interface IndependenceProof {
  writeIndependent: boolean;
  semanticIndependent: boolean;
  verificationIndependent: boolean;
  conflicts: string[];
  jevSemanticOverlapScore: number;
}

export interface SkillMatchScore {
  skillId: string;
  pack: string;
  totalScore: number;
  lexicalScore: number;
  jevChoiceProb: number;
  jevRubricScore: number;
  mythosMoeScore: number;
  agentAffinityScore: number;
  phaseGateScore: number;
  reasons: string[];
}

export interface CoArmedSkill {
  skillId: string;
  role: string;
  jevScore: number;
  directive: string;
}

export interface ArmedSubagentBundle {
  subtask: SubtaskSpec;
  subagentId: string;
  subagentRole: string;
  primarySkill: SkillMatchScore;
  coArmedSkills: CoArmedSkill[];
  armedTools: string[];
  armedEngines: string[];
  failureLessons: string[];
  requiredGates: string[];
  compiledSkillExcerpt: string;
  toonContract: string;
  calibration: JevCalibrationReceipt;
}

export interface DelegationWave {
  waveIndex: number;
  parallel: boolean;
  independenceProof: IndependenceProof;
  bundles: ArmedSubagentBundle[];
}

export interface DelegationWavePlan {
  task: string;
  totalSubtasks: number;
  totalWaves: number;
  overallAccuracyScore: number;
  waves: DelegationWave[];
  toonSummary: string;
}

export interface SubagentExecutionReceipt {
  subtaskId: string;
  subagentId: string;
  primarySkillId: string;
  coArmedSkills: string[];
  waveIndex: number;
  status: 'completed' | 'failed' | 'cancelled';
  eventsCount: number;
  durationMs: number;
  returnPacketToon: string;
}

export interface WaveExecutionReport {
  task: string;
  workerAddress: string;
  ephemeralServerSpawned: boolean;
  totalWavesExecuted: number;
  totalSubtasksExecuted: number;
  allSucceeded: boolean;
  receipts: SubagentExecutionReceipt[];
  toonReport: string;
}

/**
 * Attempts to execute `get-fable-native jev-orchestrate --task <task> --json`
 * when the compiled Rust binary is present and supports the `jev-orchestrate` subcommand.
 * Returns null if the binary is unavailable or does not yet expose `jev-orchestrate`,
 * allowing the caller to fall back cleanly to the TypeScript Jev + OpenMythos orchestrator.
 */
export function tryNativeJevOrchestrate(
  task: string,
  options?: {
    repoRoot?: string;
    cwd?: string;
    timeoutMs?: number;
  }
): DelegationWavePlan | null {
  const repoRoot = options?.repoRoot || getCoreRepoRoot();
  const binary = findNativeBinary(repoRoot);
  if (!binary) {
    return null;
  }

  try {
    const proc = spawnSync(binary, ['jev-orchestrate', '--task', task, '--json'], {
      cwd: options?.cwd || process.cwd(),
      encoding: 'utf-8',
      timeout: options?.timeoutMs ?? 5000,
    });

    if (proc.error || proc.status !== 0 || !proc.stdout || !proc.stdout.trim()) {
      return null;
    }

    const parsed = JSON.parse(proc.stdout.trim()) as DelegationWavePlan;
    if (
      parsed &&
      typeof parsed.task === 'string' &&
      Array.isArray(parsed.waves) &&
      parsed.waves.length > 0
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
