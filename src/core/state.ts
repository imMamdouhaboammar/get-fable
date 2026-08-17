import fs from 'node:fs';
import path from 'node:path';
import { atomicWriteFileSync } from '../utils.js';
import {
  FABLE_STATE_SCHEMA_VERSION,
  type EvidenceRecord,
  type FablePhase,
  type FableSkillId,
  type FableState,
  type RoutingDecision,
} from './types.js';

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
  'fable-plan': 'planned',
  'fable-execute': 'executing',
  'fable-verify': 'verifying',
  'fable-recover': 'recovering',
};

export function createInitialState(now: string = new Date().toISOString()): FableState {
  return {
    schemaVersion: FABLE_STATE_SCHEMA_VERSION,
    phase: 'idle',
    currentSkill: null,
    failureStreak: 0,
    substantial: false,
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

function isFableSkillId(value: unknown): value is FableSkillId {
  return (
    value === 'get-fable' ||
    value === 'fable-discover' ||
    value === 'fable-plan' ||
    value === 'fable-execute' ||
    value === 'fable-verify' ||
    value === 'fable-recover'
  );
}

export function validateFableState(value: unknown): FableState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Fable state must be an object');
  }
  const state = value as Record<string, unknown>;
  if (state.schemaVersion !== FABLE_STATE_SCHEMA_VERSION) {
    throw new Error(`Unsupported Fable state schema: ${String(state.schemaVersion)}`);
  }
  if (!isFablePhase(state.phase)) throw new Error('Fable state phase is invalid');
  if (state.currentSkill !== null && !isFableSkillId(state.currentSkill)) {
    throw new Error('Fable state currentSkill is invalid');
  }
  if (typeof state.failureStreak !== 'number' || !Number.isInteger(state.failureStreak) || state.failureStreak < 0) {
    throw new Error('Fable state failureStreak must be a non-negative integer');
  }
  if (typeof state.substantial !== 'boolean') throw new Error('Fable state substantial must be boolean');
  if (!Array.isArray(state.evidence)) throw new Error('Fable state evidence must be an array');
  if (typeof state.updatedAt !== 'string' || !state.updatedAt) throw new Error('Fable state updatedAt is required');
  return state as unknown as FableState;
}

export function statePath(targetDir: string = process.cwd()): string {
  return path.join(targetDir, '.fable', 'state.json');
}

export function readFableState(targetDir: string = process.cwd()): FableState | null {
  const filePath = statePath(targetDir);
  if (!fs.existsSync(filePath)) return null;
  return validateFableState(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
}

export function writeFableState(targetDir: string, state: FableState): void {
  const filePath = statePath(targetDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  atomicWriteFileSync(filePath, `${JSON.stringify(validateFableState(state), null, 2)}\n`);
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
    decision.selectedSkill === 'fable-verify';
  const routed = setRoutingDecision(state, decision, substantial, now);
  return transitionState(routed, phaseForSkill(decision.selectedSkill), now);
}

export function addEvidence(
  state: FableState,
  evidence: Omit<EvidenceRecord, 'timestamp'> & { timestamp?: string }
): FableState {
  const timestamp = evidence.timestamp || new Date().toISOString();
  const nextFailureStreak = evidence.result === 'fail' ? state.failureStreak + 1 : 0;
  let phase = state.phase;
  let currentSkill = state.currentSkill;

  if (nextFailureStreak >= 2 && state.phase !== 'complete') {
    phase = 'recovering';
    currentSkill = 'fable-recover';
  }

  return {
    ...state,
    phase,
    currentSkill,
    substantial: state.substantial || evidence.result === 'fail',
    evidence: [
      ...state.evidence,
      {
        ...evidence,
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
  const latestEvidence = state.evidence[state.evidence.length - 1];
  return latestEvidence?.result === 'pass' && latestEvidence.detail.trim().length > 0;
}

export function transitionState(
  state: FableState,
  nextPhase: FablePhase,
  now: string = new Date().toISOString()
): FableState {
  if (nextPhase === state.phase) return { ...state, currentSkill: PHASE_SKILL[nextPhase] || state.currentSkill, updatedAt: now };
  if (!ALLOWED_TRANSITIONS[state.phase].includes(nextPhase)) {
    throw new Error(`Invalid Fable state transition: ${state.phase} -> ${nextPhase}`);
  }
  if (nextPhase === 'complete' && state.substantial && !hasFreshPassingEvidence(state)) {
    throw new Error('Substantial work cannot complete without passing evidence that is fresh');
  }

  return {
    ...state,
    phase: nextPhase,
    currentSkill: PHASE_SKILL[nextPhase] || null,
    failureStreak: nextPhase === 'complete' ? 0 : state.failureStreak,
    updatedAt: now,
  };
}

export function allowedTransitions(phase: FablePhase): FablePhase[] {
  return [...ALLOWED_TRANSITIONS[phase]];
}
