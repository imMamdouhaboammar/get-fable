import type {
  FablePack,
  FablePhase,
  FableSkillId,
  FableTaskShape,
  RoutingDecision,
} from '../types.js';

export type ReflexProviderId = 'typesafe-jev';

export type ReflexMode = 'off' | 'shadow' | 'recommend' | 'guarded' | 'authority';

export interface ReflexStateEnvelopeV1 {
  schemaVersion: 1;
  task: string;
  lifecycle: {
    phase: FablePhase;
    currentSkill: FableSkillId | null;
    failureState: 'none' | 'single-failure' | 'repeated-failure';
    substantial: boolean;
    hasActiveCard: boolean;
    verificationFreshness: 'fresh' | 'stale' | 'none';
  };
  deterministic: {
    selectedSkill: FableSkillId;
    selectedPack: FablePack;
    reasons: string[];
    requiresPlan: boolean;
    topCandidates: Array<{
      skill: FableSkillId;
      scoreBucket: 'strong' | 'moderate' | 'weak';
    }>;
  };
  constraints: {
    suppressResearch: boolean;
    suppressRelease: boolean;
    suppressSecurity: boolean;
    suppressTdd: boolean;
    suppressPlan: boolean;
    suppressReview: boolean;
    suppressDelegation: boolean;
  };
}

export interface ReflexAdvice {
  provider: ReflexProviderId;
  model: string;
  requestId?: string;
  selectedSkill: FableSkillId | null;
  probabilities: Partial<Record<FableSkillId, number>>;
  confidence: number | null;
  taskShape?: FableTaskShape;
  signals: Record<string, number>;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  latencyMs: number;
  stage: 1 | 2;
}

export type ReflexErrorKind =
  | 'disabled'
  | 'missing-credential'
  | 'timeout'
  | 'rate-limit'
  | 'authentication'
  | 'network'
  | 'bad-response'
  | 'unsupported-runtime'
  | 'aborted'
  | 'unknown';

export interface ReflexProviderError {
  kind: ReflexErrorKind;
  retryable: boolean;
  message: string;
}

export interface SecondStageAdvice {
  bestCandidate: FableSkillId | 'none_of_these';
  confidence: number | null;
  probabilities: Partial<Record<string, number>>;
  candidateFits: number;
  latencyMs: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface ReflexAdvisor {
  readonly id: ReflexProviderId;
  advise(input: ReflexStateEnvelopeV1, signal?: AbortSignal): Promise<ReflexAdvice>;
  adviseSecondStage?(
    input: ReflexStateEnvelopeV1,
    candidates: FableSkillId[],
    signal?: AbortSignal
  ): Promise<SecondStageAdvice>;
}

export interface ReflexConfig {
  mode: ReflexMode;
  provider: ReflexProviderId;
  model: string;
  timeoutMs: number;
  minMargin: number;
  telemetry: 'local' | 'off';
  apiKey?: string;
}

export interface HardPolicySnapshot {
  recoveryLocked: boolean;
  securityLocked: boolean;
  releaseLocked: boolean;
  handoffLocked: boolean;
  evalLocked: boolean;
  reasons: string[];
  suppressions: {
    suppressResearch: boolean;
    suppressRelease: boolean;
    suppressSecurity: boolean;
    suppressTdd: boolean;
    suppressPlan: boolean;
    suppressReview: boolean;
    suppressDelegation: boolean;
  };
}

export interface RouteResolution {
  decision: RoutingDecision;
  mode: ReflexMode;
  deterministicDecision: RoutingDecision;
  advice?: ReflexAdvice;
  fallbackReason?: string;
  policySnapshot: HardPolicySnapshot;
}
