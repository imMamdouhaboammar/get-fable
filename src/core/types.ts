export const FABLE_STATE_SCHEMA_VERSION = 1 as const;
export const FABLE_REGISTRY_SCHEMA_VERSION = 1 as const;

export type FableSkillId =
  | 'get-fable'
  | 'fable-discover'
  | 'fable-plan'
  | 'fable-execute'
  | 'fable-verify'
  | 'fable-recover';

export type FablePhase =
  | 'idle'
  | 'discovering'
  | 'planned'
  | 'executing'
  | 'verifying'
  | 'recovering'
  | 'complete'
  | 'blocked';

export type EvidenceResult = 'pass' | 'fail';
export type EvidenceKind = 'test' | 'build' | 'runtime' | 'review' | 'observation';

export interface EvidenceRecord {
  kind: EvidenceKind;
  source: string;
  result: EvidenceResult;
  detail: string;
  timestamp: string;
}

export interface SkillRegistryEntry {
  id: FableSkillId;
  order: number;
  phase: FablePhase;
  description: string;
  next: FableSkillId[];
  keywords: string[];
}

export interface SkillRegistry {
  schemaVersion: 1;
  entry: FableSkillId;
  skills: SkillRegistryEntry[];
}

export interface RoutingDecision {
  selectedSkill: FableSkillId;
  confidence: number;
  reasons: string[];
  requiresPlan: boolean;
  nextSkills: FableSkillId[];
  scores: Record<FableSkillId, number>;
}

export interface FableState {
  schemaVersion: 1;
  phase: FablePhase;
  currentSkill: FableSkillId | null;
  failureStreak: number;
  substantial: boolean;
  lastDecision: RoutingDecision | null;
  evidence: EvidenceRecord[];
  updatedAt: string;
}

export interface DoctorCheck {
  id: string;
  status: 'pass' | 'warn' | 'error';
  message: string;
}

export interface DoctorReport {
  schemaVersion: 1;
  ok: boolean;
  checks: DoctorCheck[];
}
