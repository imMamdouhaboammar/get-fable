import { getSkillEntry, loadSkillRegistry } from '../skill-registry.js';
import type { FableSkillId, RoutingDecision, SkillRegistry } from '../types.js';
import { calculateProbabilityMargin } from './disambiguation.js';
import { isHardPolicyViolation } from './policy-snapshot.js';
import type {
  HardPolicySnapshot,
  ReflexAdvice,
  ReflexConfig,
  ReflexMode,
  RouteResolution,
} from './types.js';

export type SkillRiskTier = 'low' | 'medium' | 'high';

export const HIGH_RISK_SKILLS: ReadonlySet<FableSkillId> = new Set<FableSkillId>([
  'fable-recover',
  'fable-security',
  'fable-redteam',
  'fable-heal',
  'fable-release',
  'fable-handoff',
  'fable-run',
  'fable-cowork',
  'fable-loop',
  'fable-config',
  'fable-architecture',
  'fable-eco',
]);

export const MEDIUM_RISK_SKILLS: ReadonlySet<FableSkillId> = new Set<FableSkillId>([
  'fable-tdd',
  'fable-delegate',
  'fable-review',
  'fable-verify',
  'fable-simplify',
]);

/**
 * Returns the risk tier for a given Fable skill.
 */
export function getSkillRiskTier(skill: FableSkillId): SkillRiskTier {
  if (HIGH_RISK_SKILLS.has(skill)) return 'high';
  if (MEDIUM_RISK_SKILLS.has(skill)) return 'medium';
  return 'low';
}

/**
 * Minimum confidence required by risk tier.
 */
export function getRequiredConfidence(tier: SkillRiskTier): number {
  switch (tier) {
    case 'high':
      return 0.88;
    case 'medium':
      return 0.8;
    case 'low':
      return 0.72;
  }
}

/**
 * Pure Route Fusion Policy. Combines deterministic route, hard policy snapshot, and optional Jev advice.
 */
export function fuseRoute(params: {
  deterministic: RoutingDecision;
  policy: HardPolicySnapshot;
  mode: ReflexMode;
  config: ReflexConfig;
  advice?: ReflexAdvice;
  registry?: SkillRegistry;
}): RouteResolution {
  const { deterministic, policy, mode, config, advice } = params;
  const registry = params.registry || loadSkillRegistry();

  // Mode: off -> purely deterministic
  if (mode === 'off' || !advice) {
    return {
      decision: deterministic,
      mode,
      deterministicDecision: deterministic,
      policySnapshot: policy,
    };
  }

  // Mode: shadow -> deterministic output, but advice preserved in resolution
  if (mode === 'shadow') {
    return {
      decision: deterministic,
      mode,
      deterministicDecision: deterministic,
      advice,
      policySnapshot: policy,
    };
  }

  // Mode: recommend -> deterministic output with advisory diagnosis attached
  if (mode === 'recommend') {
    return {
      decision: deterministic,
      mode,
      deterministicDecision: deterministic,
      advice,
      policySnapshot: policy,
    };
  }

  // Mode: guarded / authority
  const proposedSkill = advice.selectedSkill;
  if (!proposedSkill) {
    return {
      decision: deterministic,
      mode,
      deterministicDecision: deterministic,
      advice,
      fallbackReason: 'Reflex advice did not select a skill; falling back to deterministic route',
      policySnapshot: policy,
    };
  }

  // 1. Verify proposed skill exists in canonical registry
  try {
    getSkillEntry(proposedSkill, registry);
  } catch {
    return {
      decision: deterministic,
      mode,
      deterministicDecision: deterministic,
      advice,
      fallbackReason: `Reflex proposed unknown skill '${proposedSkill}'; falling back to deterministic route`,
      policySnapshot: policy,
    };
  }

  // 2. Verify hard policy invariants (locks & suppressions)
  const violation = isHardPolicyViolation(policy, deterministic, proposedSkill);
  if (violation.violated) {
    return {
      decision: deterministic,
      mode,
      deterministicDecision: deterministic,
      advice,
      fallbackReason: violation.reason,
      policySnapshot: policy,
    };
  }

  // 3. Evaluate Confidence and Margin against Risk Tiers
  const tier = getSkillRiskTier(proposedSkill);
  const requiredConfidence = getRequiredConfidence(tier);
  const confidence = advice.confidence ?? 0;

  if (confidence < requiredConfidence) {
    return {
      decision: deterministic,
      mode,
      deterministicDecision: deterministic,
      advice,
      fallbackReason: `Reflex confidence ${confidence.toFixed(2)} does not meet ${tier}-risk threshold ${requiredConfidence}`,
      policySnapshot: policy,
    };
  }

  const { margin } = calculateProbabilityMargin(advice.probabilities);
  if (margin < config.minMargin) {
    return {
      decision: deterministic,
      mode,
      deterministicDecision: deterministic,
      advice,
      fallbackReason: `Reflex candidate margin ${margin.toFixed(2)} is below minimum margin ${config.minMargin}`,
      policySnapshot: policy,
    };
  }

  // In guarded mode, high-risk skills cannot be overridden unless deterministic was already in that family
  if (mode === 'guarded' && tier === 'high' && deterministic.selectedSkill !== proposedSkill) {
    return {
      decision: deterministic,
      mode,
      deterministicDecision: deterministic,
      advice,
      fallbackReason: `Guarded mode prohibits override to high-risk skill '${proposedSkill}'`,
      policySnapshot: policy,
    };
  }

  // All invariants and thresholds cleared: construct canonical fused RoutingDecision
  const entry = getSkillEntry(proposedSkill, registry);
  const fusedDecision: RoutingDecision = {
    selectedSkill: proposedSkill,
    selectedPack: entry.pack,
    taskShape: advice.taskShape || deterministic.taskShape,
    confidence,
    reasons: [
      `[reflex-fuse] semantic override by ${advice.provider} (${advice.model}) with confidence ${confidence.toFixed(2)} (margin ${margin.toFixed(2)})`,
      ...deterministic.reasons,
    ],
    requiresPlan: entry.requires.includes('plan') || entry.gates.includes('plan'),
    requiredGates: entry.gates,
    fallbackSkill: entry.fallback,
    parallelCandidates: deterministic.parallelCandidates,
    nextSkills: entry.next,
    scores: deterministic.scores,
  };

  return {
    decision: fusedDecision,
    mode,
    deterministicDecision: deterministic,
    advice,
    policySnapshot: policy,
  };
}
