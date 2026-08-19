export const FABLE_STATE_SCHEMA_VERSION = 2 as const;
export const FABLE_REGISTRY_SCHEMA_VERSION = 2 as const;

export type FableSkillId =
  | 'get-fable'
  | 'fable-discover'
  | 'fable-research'
  | 'fable-plan'
  | 'fable-tdd'
  | 'fable-delegate'
  | 'fable-execute'
  | 'fable-verify'
  | 'fable-review'
  | 'fable-security'
  | 'fable-release'
  | 'fable-handoff'
  | 'fable-eval'
  | 'fable-recover'
  | 'fable-dataviz'
  | 'fable-artifact'
  | 'fable-simplify'
  | 'fable-loop'
  | 'fable-run'
  | 'fable-memory'
  | 'fable-config'
  | 'fable-simulator'
  | 'fable-cowork'
  | 'fable-spark'
  | 'skill-creator';

export type FablePack =
  | 'core'
  | 'intelligence'
  | 'build'
  | 'proof'
  | 'delivery'
  | 'evolution'
  | 'system'
  | 'creator';

export type FablePhase =
  | 'idle'
  | 'discovering'
  | 'planned'
  | 'executing'
  | 'verifying'
  | 'recovering'
  | 'complete'
  | 'blocked';

export type FableTaskShape =
  | 'research'
  | 'architecture'
  | 'bug-fix'
  | 'feature'
  | 'delegation'
  | 'review'
  | 'security'
  | 'release'
  | 'handoff'
  | 'eval'
  | 'bounded-change'
  | 'unknown';

export type EvidenceResult = 'pass' | 'fail';
export type EvidenceKind =
  | 'test'
  | 'build'
  | 'runtime'
  | 'review'
  | 'observation'
  | 'security'
  | 'research'
  | 'receipt'
  | 'handoff';

export interface EvidenceRecord {
  kind: EvidenceKind;
  source: string;
  result: EvidenceResult;
  detail: string;
  generation: number;
  timestamp: string;
}

export interface SkillRegistryEntry {
  id: FableSkillId;
  order: number;
  phase: FablePhase;
  pack: FablePack;
  description: string;
  intents: string[];
  requires: string[];
  produces: string[];
  gates: string[];
  fallback: FableSkillId | null;
  mutatesWorkspace: boolean;
  parallelSafe: boolean;
  next: FableSkillId[];
  keywords: string[];
}

export interface SkillRegistry {
  schemaVersion: 2;
  entry: FableSkillId;
  skills: SkillRegistryEntry[];
}

export interface RoutingDecision {
  selectedSkill: FableSkillId;
  selectedPack: FablePack;
  taskShape: FableTaskShape;
  confidence: number;
  reasons: string[];
  requiresPlan: boolean;
  requiredGates: string[];
  fallbackSkill: FableSkillId | null;
  parallelCandidates: FableSkillId[];
  nextSkills: FableSkillId[];
  scores: Record<FableSkillId, number>;
}

export interface FableState {
  schemaVersion: 2;
  workspaceId: string;
  phase: FablePhase;
  currentSkill: FableSkillId | null;
  failureStreak: number;
  substantial: boolean;
  mutationGeneration: number;
  verifiedGeneration: number;
  activeCard: string | null;
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
