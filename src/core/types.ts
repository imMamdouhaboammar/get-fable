export const FABLE_STATE_SCHEMA_VERSION = 3 as const;
export const FABLE_REGISTRY_SCHEMA_VERSION = 2 as const;

import type { FablePack as CatalogFablePack, FableSkillId as CatalogFableSkillId } from '../generated/skill-catalog.js';

export type FableSkillId = CatalogFableSkillId;
export type FablePack = CatalogFablePack;

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

export type TaskShape = FableTaskShape;

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
  workspaceId?: string;
  repositoryRevision?: string;
  commandCategory?: string;
  scope?: string;
  receiptId?: string;
}

export type TypedEvidence = EvidenceRecord;

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
  schemaVersion: 3;
  stateRevision: number;
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
  status: 'PASS' | 'WARN' | 'ERROR' | 'NOT_APPLICABLE' | 'NOT_CHECKED';
  message: string;
}

export interface DoctorReport {
  schemaVersion: 1;
  ok: boolean;
  checks: DoctorCheck[];
}

export const FABLE_SKILL_PACKAGE_SCHEMA_VERSION = 2 as const;

export interface SkillPackageManifest {
  schemaVersion: 2;
  id: string;
  entry: string;
  agents: string[];
  references: string[];
  templates: string[];
  examples: string[];
  evals: string[];
  scripts: string[];
  scriptPolicy: 'data-only';
}

export type SkillResourceType =
  | 'entry'
  | 'agent'
  | 'reference'
  | 'template'
  | 'example'
  | 'eval'
  | 'script';

export interface SkillResourceEntry {
  type: SkillResourceType;
  path: string;
  relativePath: string;
  absolutePath: string;
  byteSize: number;
  sizeBytes: number;
  exists: boolean;
}

export interface SkillPackageSummary {
  id: string;
  valid: boolean;
  entryExists: boolean;
  agentCount: number;
  referenceCount: number;
  templateCount: number;
  exampleCount: number;
  evalCount: number;
  scriptCount: number;
  totalResources: number;
  resources: SkillResourceEntry[];
  errors: string[];
}

export interface SkillPackageValidationResult {
  id: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: SkillPackageManifest;
  resources: SkillResourceEntry[];
}
