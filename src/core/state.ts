import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { atomicWriteFileSync } from '../utils.js';
import {
  FABLE_STATE_SCHEMA_VERSION,
  type EvidenceKind,
  type EvidenceRecord,
  type FablePack,
  type FablePhase,
  type FableSkillId,
  type FableState,
  type FableTaskShape,
  type RoutingDecision,
} from './types.js';

const FABLE_SKILL_IDS: FableSkillId[] = [
  'get-fable',
  'fable-discover',
  'fable-research',
  'fable-plan',
  'fable-tdd',
  'fable-delegate',
  'fable-execute',
  'fable-verify',
  'fable-review',
  'fable-security',
  'fable-release',
  'fable-handoff',
  'fable-eval',
  'fable-recover',
  'fable-dataviz',
  'fable-artifact',
  'fable-simplify',
  'fable-loop',
  'fable-run',
  'fable-memory',
  'fable-config',
  'fable-simulator',
  'fable-cowork',
  'fable-spark',
];

const FABLE_PACKS: FablePack[] = [
  'core',
  'intelligence',
  'build',
  'proof',
  'delivery',
  'evolution',
  'system',
];
const TASK_SHAPES: FableTaskShape[] = [
  'research',
  'architecture',
  'bug-fix',
  'feature',
  'delegation',
  'review',
  'security',
  'release',
  'handoff',
  'eval',
  'bounded-change',
  'unknown',
];
const EVIDENCE_KINDS: EvidenceKind[] = [
  'test',
  'build',
  'runtime',
  'review',
  'observation',
  'security',
  'research',
  'receipt',
  'handoff',
];
const BEHAVIOR_COMPLETION_EVIDENCE_KINDS: EvidenceKind[] = [
  'test',
  'build',
  'runtime',
  'review',
  'observation',
];
const FAILURE_RELEVANT_EVIDENCE_KINDS: EvidenceKind[] = [
  ...BEHAVIOR_COMPLETION_EVIDENCE_KINDS,
  'security',
];
const EVIDENCE_RESULTS = ['pass', 'fail'] as const;

const ALLOWED_TRANSITIONS: Record<FablePhase, FablePhase[]> = {
  idle: ['discovering', 'planned', 'executing', 'verifying', 'recovering', 'blocked'],
  discovering: ['planned', 'executing', 'verifying', 'recovering', 'blocked'],
  planned: ['discovering', 'executing', 'verifying', 'recovering', 'blocked'],
  executing: ['verifying', 'recovering', 'blocked'],
  verifying: ['complete', 'recovering', 'executing', 'blocked'],
  recovering: ['discovering', 'planned', 'executing', 'verifying', 'blocked'],
  complete: ['idle', 'discovering', 'planned', 'executing', 'verifying', 'recovering'],
  blocked: ['idle', 'discovering', 'planned', 'executing', 'verifying', 'recovering'],
};

const PHASE_SKILL: Partial<Record<FablePhase, FableSkillId>> = {
  discovering: 'fable-discover',
  planned: 'fable-plan',
  executing: 'fable-execute',
  verifying: 'fable-verify',
  recovering: 'fable-recover',
};

const SKILL_PHASE: Record<Exclude<FableSkillId, 'get-fable'>, FablePhase> = {
  'fable-discover': 'discovering',
  'fable-research': 'discovering',
  'fable-plan': 'planned',
  'fable-tdd': 'executing',
  'fable-delegate': 'executing',
  'fable-execute': 'executing',
  'fable-verify': 'verifying',
  'fable-review': 'verifying',
  'fable-security': 'verifying',
  'fable-release': 'verifying',
  'fable-handoff': 'verifying',
  'fable-eval': 'verifying',
  'fable-recover': 'recovering',
  'fable-dataviz': 'executing',
  'fable-artifact': 'executing',
  'fable-simplify': 'executing',
  'fable-loop': 'executing',
  'fable-run': 'verifying',
  'fable-memory': 'discovering',
  'fable-config': 'planned',
  'fable-simulator': 'verifying',
  'fable-cowork': 'executing',
  'fable-spark': 'idle',
};

const SKILL_PACK: Record<FableSkillId, FablePack> = {
  'get-fable': 'core',
  'fable-discover': 'core',
  'fable-research': 'intelligence',
  'fable-plan': 'core',
  'fable-tdd': 'build',
  'fable-delegate': 'build',
  'fable-execute': 'core',
  'fable-verify': 'core',
  'fable-review': 'proof',
  'fable-security': 'proof',
  'fable-release': 'delivery',
  'fable-handoff': 'delivery',
  'fable-eval': 'evolution',
  'fable-recover': 'core',
  'fable-dataviz': 'system',
  'fable-artifact': 'system',
  'fable-simplify': 'system',
  'fable-loop': 'system',
  'fable-run': 'system',
  'fable-memory': 'system',
  'fable-config': 'system',
  'fable-simulator': 'system',
  'fable-cowork': 'system',
  'fable-spark': 'system',
};

export function workspaceIdForTarget(targetDir: string = process.cwd()): string {
  const resolved = path.resolve(targetDir);
  const canonical = fs.existsSync(resolved) ? fs.realpathSync.native(resolved) : resolved;
  return createHash('sha256').update(canonical).digest('hex').slice(0, 24);
}

export function createInitialState(
  now: string = new Date().toISOString(),
  targetDir: string = process.cwd()
): FableState {
  return {
    schemaVersion: FABLE_STATE_SCHEMA_VERSION,
    workspaceId: workspaceIdForTarget(targetDir),
    phase: 'idle',
    currentSkill: null,
    failureStreak: 0,
    substantial: false,
    mutationGeneration: 0,
    verifiedGeneration: -1,
    activeCard: null,
    lastDecision: null,
    evidence: [],
    updatedAt: now,
  };
}

export function isFablePhase(value: unknown): value is FablePhase {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(ALLOWED_TRANSITIONS, value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isNonEmptyString(item));
}

function isFableSkillId(value: unknown): value is FableSkillId {
  return typeof value === 'string' && FABLE_SKILL_IDS.includes(value as FableSkillId);
}

function isEvidenceKind(value: unknown): value is EvidenceKind {
  return typeof value === 'string' && EVIDENCE_KINDS.includes(value as EvidenceKind);
}

function isEvidenceResult(value: unknown): value is 'pass' | 'fail' {
  return typeof value === 'string' && EVIDENCE_RESULTS.includes(value as 'pass' | 'fail');
}

function isSecurityTask(state: Pick<FableState, 'currentSkill' | 'lastDecision'>): boolean {
  return (
    state.currentSkill === 'fable-security' ||
    state.lastDecision?.selectedSkill === 'fable-security' ||
    state.lastDecision?.taskShape === 'security'
  );
}

function completionEvidenceKinds(state: Pick<FableState, 'currentSkill' | 'lastDecision'>): EvidenceKind[] {
  return isSecurityTask(state)
    ? [...BEHAVIOR_COMPLETION_EVIDENCE_KINDS, 'security']
    : BEHAVIOR_COMPLETION_EVIDENCE_KINDS;
}

function validateEvidenceRecord(value: unknown, index: number): void {
  const field = `evidence[${index}]`;
  if (!isRecord(value)) throw new Error(`Fable state ${field} must be an object`);
  if (!isEvidenceKind(value.kind)) throw new Error(`Fable state ${field}.kind is invalid`);
  if (!isNonEmptyString(value.source)) throw new Error(`Fable state ${field}.source is required`);
  if (!isEvidenceResult(value.result)) throw new Error(`Fable state ${field}.result is invalid`);
  if (!isNonEmptyString(value.detail)) throw new Error(`Fable state ${field}.detail is required`);
  if (typeof value.generation !== 'number' || !Number.isInteger(value.generation) || value.generation < 0) {
    throw new Error(`Fable state ${field}.generation must be a non-negative integer`);
  }
  if (!isNonEmptyString(value.timestamp)) throw new Error(`Fable state ${field}.timestamp is required`);
}

function validateRoutingDecision(value: unknown): void {
  if (!isRecord(value)) throw new Error('Fable state lastDecision must be an object');
  if (!isFableSkillId(value.selectedSkill)) {
    throw new Error('Fable state lastDecision.selectedSkill is invalid');
  }
  if (typeof value.selectedPack !== 'string' || !FABLE_PACKS.includes(value.selectedPack as FablePack)) {
    throw new Error('Fable state lastDecision.selectedPack is invalid');
  }
  if (typeof value.taskShape !== 'string' || !TASK_SHAPES.includes(value.taskShape as FableTaskShape)) {
    throw new Error('Fable state lastDecision.taskShape is invalid');
  }
  if (
    typeof value.confidence !== 'number' ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1
  ) {
    throw new Error('Fable state lastDecision.confidence must be between 0 and 1');
  }
  if (!isStringArray(value.reasons)) {
    throw new Error('Fable state lastDecision.reasons must contain only non-empty strings');
  }
  if (typeof value.requiresPlan !== 'boolean') {
    throw new Error('Fable state lastDecision.requiresPlan must be boolean');
  }
  if (!isStringArray(value.requiredGates)) {
    throw new Error('Fable state lastDecision.requiredGates must contain only non-empty strings');
  }
  if (value.fallbackSkill !== null && !isFableSkillId(value.fallbackSkill)) {
    throw new Error('Fable state lastDecision.fallbackSkill is invalid');
  }
  if (!Array.isArray(value.parallelCandidates) || value.parallelCandidates.some((skill) => !isFableSkillId(skill))) {
    throw new Error('Fable state lastDecision.parallelCandidates contains an invalid skill');
  }
  if (!Array.isArray(value.nextSkills) || value.nextSkills.some((skill) => !isFableSkillId(skill))) {
    throw new Error('Fable state lastDecision.nextSkills contains an invalid skill');
  }
  if (!isRecord(value.scores)) {
    throw new Error('Fable state lastDecision.scores must be an object');
  }
  for (const skill of FABLE_SKILL_IDS) {
    const score = value.scores[skill];
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new Error(`Fable state lastDecision.scores.${skill} must be a finite number`);
    }
  }
}

function migrateRoutingDecision(value: unknown): RoutingDecision | null {
  if (!isRecord(value) || !isFableSkillId(value.selectedSkill)) return null;
  const selectedSkill = value.selectedSkill;
  const scores = Object.fromEntries(
    FABLE_SKILL_IDS.map((skill) => [
      skill,
      isRecord(value.scores) && typeof value.scores[skill] === 'number' ? value.scores[skill] : 0,
    ])
  ) as Record<FableSkillId, number>;

  return {
    selectedSkill,
    selectedPack: SKILL_PACK[selectedSkill],
    taskShape: 'unknown',
    confidence: typeof value.confidence === 'number' ? value.confidence : 0.51,
    reasons: isStringArray(value.reasons) ? value.reasons : ['migrated schema-v1 routing decision'],
    requiresPlan: value.requiresPlan === true,
    requiredGates: [],
    fallbackSkill: null,
    parallelCandidates: [],
    nextSkills: Array.isArray(value.nextSkills) ? value.nextSkills.filter(isFableSkillId) : [],
    scores,
  };
}

function migrateV1State(value: Record<string, unknown>, targetDir: string): FableState {
  if (!isFablePhase(value.phase)) throw new Error('Fable state phase is invalid');
  if (value.currentSkill !== null && !isFableSkillId(value.currentSkill)) {
    throw new Error('Fable state currentSkill is invalid');
  }
  if (typeof value.failureStreak !== 'number' || !Number.isInteger(value.failureStreak) || value.failureStreak < 0) {
    throw new Error('Fable state failureStreak must be a non-negative integer');
  }
  if (typeof value.substantial !== 'boolean') throw new Error('Fable state substantial must be boolean');
  if (!isNonEmptyString(value.updatedAt)) throw new Error('Fable state updatedAt is required');

  const rawEvidence = Array.isArray(value.evidence) ? value.evidence : [];
  const evidence: EvidenceRecord[] = rawEvidence.map((record, index) => {
    if (!isRecord(record)) throw new Error(`Fable state evidence[${index}] must be an object`);
    if (!isEvidenceKind(record.kind)) throw new Error(`Fable state evidence[${index}].kind is invalid`);
    if (!isNonEmptyString(record.source)) throw new Error(`Fable state evidence[${index}].source is required`);
    if (!isEvidenceResult(record.result)) throw new Error(`Fable state evidence[${index}].result is invalid`);
    if (!isNonEmptyString(record.detail)) throw new Error(`Fable state evidence[${index}].detail is required`);
    if (!isNonEmptyString(record.timestamp)) throw new Error(`Fable state evidence[${index}].timestamp is required`);
    return {
      kind: record.kind,
      source: record.source,
      result: record.result,
      detail: record.detail,
      generation: 0,
      timestamp: record.timestamp,
    };
  });

  const latestCompletion = [...evidence]
    .reverse()
    .find((record) => BEHAVIOR_COMPLETION_EVIDENCE_KINDS.includes(record.kind));

  return {
    schemaVersion: 2,
    workspaceId: workspaceIdForTarget(targetDir),
    phase: value.phase,
    currentSkill: value.currentSkill as FableSkillId | null,
    failureStreak: value.failureStreak,
    substantial: value.substantial,
    mutationGeneration: 0,
    verifiedGeneration: latestCompletion?.result === 'pass' ? 0 : -1,
    activeCard: null,
    lastDecision: migrateRoutingDecision(value.lastDecision),
    evidence,
    updatedAt: value.updatedAt,
  };
}

export function validateFableState(value: unknown, targetDir: string = process.cwd()): FableState {
  if (!isRecord(value)) throw new Error('Fable state must be an object');

  const migrated = value.schemaVersion === 1 ? migrateV1State(value, targetDir) : value;
  if (!isRecord(migrated) || migrated.schemaVersion !== FABLE_STATE_SCHEMA_VERSION) {
    throw new Error(`Unsupported Fable state schema: ${String(value.schemaVersion)}`);
  }

  const state = migrated;
  if (!isNonEmptyString(state.workspaceId)) throw new Error('Fable state workspaceId is required');
  const expectedWorkspaceId = workspaceIdForTarget(targetDir);
  if (state.workspaceId !== expectedWorkspaceId) {
    throw new Error('Fable state workspaceId does not match the current workspace');
  }
  if (!isFablePhase(state.phase)) throw new Error('Fable state phase is invalid');
  if (state.currentSkill !== null && !isFableSkillId(state.currentSkill)) {
    throw new Error('Fable state currentSkill is invalid');
  }
  if (typeof state.failureStreak !== 'number' || !Number.isInteger(state.failureStreak) || state.failureStreak < 0) {
    throw new Error('Fable state failureStreak must be a non-negative integer');
  }
  if (typeof state.substantial !== 'boolean') throw new Error('Fable state substantial must be boolean');
  if (typeof state.mutationGeneration !== 'number' || !Number.isInteger(state.mutationGeneration) || state.mutationGeneration < 0) {
    throw new Error('Fable state mutationGeneration must be a non-negative integer');
  }
  if (typeof state.verifiedGeneration !== 'number' || !Number.isInteger(state.verifiedGeneration) || state.verifiedGeneration < -1) {
    throw new Error('Fable state verifiedGeneration must be an integer greater than or equal to -1');
  }
  if (state.verifiedGeneration > state.mutationGeneration) {
    throw new Error('Fable state verifiedGeneration cannot exceed mutationGeneration');
  }
  if (state.activeCard !== null && !isNonEmptyString(state.activeCard)) {
    throw new Error('Fable state activeCard must be null or a non-empty string');
  }
  if (!Array.isArray(state.evidence)) throw new Error('Fable state evidence must be an array');
  state.evidence.forEach((record, index) => validateEvidenceRecord(record, index));
  const mutationGeneration = Number(state.mutationGeneration);
  if (state.evidence.some((record) => (record as EvidenceRecord).generation > mutationGeneration)) {
    throw new Error('Fable state evidence generation cannot exceed mutationGeneration');
  }
  if (state.lastDecision !== null) validateRoutingDecision(state.lastDecision);
  if (!isNonEmptyString(state.updatedAt)) throw new Error('Fable state updatedAt is required');
  return state as unknown as FableState;
}

export function statePath(targetDir: string = process.cwd()): string {
  return path.join(targetDir, '.fable', 'state.json');
}

export function readFableState(targetDir: string = process.cwd()): FableState | null {
  const filePath = statePath(targetDir);
  if (!fs.existsSync(filePath)) return null;
  return validateFableState(JSON.parse(fs.readFileSync(filePath, 'utf-8')), targetDir);
}

export function writeFableState(targetDir: string, state: FableState): void {
  const filePath = statePath(targetDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  atomicWriteFileSync(filePath, `${JSON.stringify(validateFableState(state, targetDir), null, 2)}\n`);
}

export function phaseForSkill(skill: FableSkillId): FablePhase {
  return skill === 'get-fable' ? 'idle' : SKILL_PHASE[skill];
}

export function setRoutingDecision(
  state: FableState,
  decision: RoutingDecision,
  substantial: boolean = state.substantial,
  now: string = new Date().toISOString()
): FableState {
  return {
    ...state,
    currentSkill: decision.selectedSkill,
    substantial,
    lastDecision: decision,
    updatedAt: now,
  };
}

export function applyRoutingDecision(
  state: FableState,
  decision: RoutingDecision,
  now: string = new Date().toISOString()
): FableState {
  const substantial =
    state.substantial ||
    decision.requiresPlan ||
    decision.selectedSkill === 'fable-recover' ||
    decision.selectedSkill === 'fable-verify' ||
    decision.selectedSkill === 'fable-review' ||
    decision.selectedSkill === 'fable-security' ||
    decision.selectedSkill === 'fable-release';
  const routed = setRoutingDecision(state, decision, substantial, now);
  return transitionState(routed, phaseForSkill(decision.selectedSkill), now);
}

export function recordMutation(
  state: FableState,
  now: string = new Date().toISOString()
): FableState {
  return {
    ...state,
    substantial: true,
    mutationGeneration: state.mutationGeneration + 1,
    updatedAt: now,
  };
}

export function setActiveCard(
  state: FableState,
  activeCard: string | null,
  now: string = new Date().toISOString()
): FableState {
  if (activeCard !== null && !activeCard.trim()) throw new Error('Active card must be non-empty when provided');
  return { ...state, activeCard, updatedAt: now };
}

export function addEvidence(
  state: FableState,
  evidence: Omit<EvidenceRecord, 'timestamp' | 'generation'> & { timestamp?: string; generation?: number }
): FableState {
  const timestamp = evidence.timestamp || new Date().toISOString();
  const generation = evidence.generation ?? state.mutationGeneration;
  if (!Number.isInteger(generation) || generation < 0 || generation > state.mutationGeneration) {
    throw new Error('Evidence generation must refer to the current or an earlier workspace generation');
  }

  const countsTowardFailure = FAILURE_RELEVANT_EVIDENCE_KINDS.includes(evidence.kind);
  const nextFailureStreak = countsTowardFailure
    ? evidence.result === 'fail'
      ? state.failureStreak + 1
      : 0
    : state.failureStreak;
  let phase = state.phase;
  let currentSkill = state.currentSkill;

  if (nextFailureStreak >= 2 && state.phase !== 'complete') {
    phase = 'recovering';
    currentSkill = 'fable-recover';
  }

  const advancesVerification =
    evidence.result === 'pass' &&
    completionEvidenceKinds(state).includes(evidence.kind) &&
    generation === state.mutationGeneration;

  return {
    ...state,
    phase,
    currentSkill,
    substantial: state.substantial || (countsTowardFailure && evidence.result === 'fail'),
    verifiedGeneration: advancesVerification
      ? Math.max(state.verifiedGeneration, generation)
      : state.verifiedGeneration,
    evidence: [
      ...state.evidence,
      {
        ...evidence,
        generation,
        timestamp,
      },
    ],
    failureStreak: nextFailureStreak,
    updatedAt: timestamp,
  };
}

export function hasPassingEvidence(state: FableState): boolean {
  return state.evidence.some((record) => record.result === 'pass' && record.detail.trim().length > 0);
}

export function hasFreshPassingEvidence(state: FableState): boolean {
  if (state.verifiedGeneration < state.mutationGeneration) return false;
  const acceptedKinds = completionEvidenceKinds(state);
  const latestCurrentCompletion = [...state.evidence]
    .reverse()
    .find(
      (record) =>
        record.generation === state.mutationGeneration &&
        acceptedKinds.includes(record.kind)
    );
  return latestCurrentCompletion?.result === 'pass' && latestCurrentCompletion.detail.trim().length > 0;
}

function skillMatchesPhase(skill: FableSkillId | null, phase: FablePhase): boolean {
  return Boolean(skill && phaseForSkill(skill) === phase);
}

export function transitionState(
  state: FableState,
  nextPhase: FablePhase,
  now: string = new Date().toISOString()
): FableState {
  if (nextPhase === state.phase) {
    return {
      ...state,
      currentSkill: skillMatchesPhase(state.currentSkill, nextPhase)
        ? state.currentSkill
        : PHASE_SKILL[nextPhase] || state.currentSkill,
      updatedAt: now,
    };
  }
  if (!ALLOWED_TRANSITIONS[state.phase].includes(nextPhase)) {
    throw new Error(`Invalid Fable state transition: ${state.phase} -> ${nextPhase}`);
  }
  if (nextPhase === 'complete' && state.substantial && !hasFreshPassingEvidence(state)) {
    throw new Error('Substantial work cannot complete without passing evidence for the current mutation generation');
  }

  return {
    ...state,
    phase: nextPhase,
    currentSkill:
      nextPhase === 'complete' || nextPhase === 'idle' || nextPhase === 'blocked'
        ? null
        : skillMatchesPhase(state.currentSkill, nextPhase)
          ? state.currentSkill
          : PHASE_SKILL[nextPhase] || null,
    failureStreak: nextPhase === 'complete' ? 0 : state.failureStreak,
    updatedAt: now,
  };
}

export function allowedTransitions(phase: FablePhase): FablePhase[] {
  return [...ALLOWED_TRANSITIONS[phase]];
}
