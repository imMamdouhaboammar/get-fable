import fs from 'node:fs';
import path from 'node:path';
import { getCoreRepoRoot, getSkillEntry, loadSkillRegistry } from './skill-registry.js';
import { getSkillManifestPath, validateSkillPackage } from './skill-package.js';
import { loadFrozenRoutingHoldoutEvidence, loadFrozenSparkHoldoutEvidence, runEnterpriseRoutingBenchmark, runEnterpriseSparkBenchmark, runSkillKnownCases, runSparkBenchmark } from './eval-runner.js';
import { routeTask } from './task-router.js';
import { loadFrozenVerificationHoldoutEvidence, runEnterpriseVerificationBenchmark } from './verification-eval.js';
import { buildEnterpriseAgentBehaviorEvalPlan, loadAgentBehaviorEvidenceSnapshot, validateAgentBehaviorEvidenceSnapshot, type AgentBehaviorEvalResult } from './agent-behavior-eval.js';
import type { FableSkillId } from './types.js';

export type SkillMaturity = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5';
export type EvidenceStatus = 'PASS' | 'FAIL' | 'NOT_CHECKED';

export interface MaturityInputs {
  sourceAvailable: boolean;
  structured: boolean;
  contractValid: boolean;
  runtimeIntegrated: boolean;
  knownCases: number; knownPassRate: number;
  negativeCases: number; negativePassRate: number;
  ambiguousCases: number; ambiguousPassRate: number;
  adversarialCases: number; adversarialPassRate: number;
  holdoutCases: number; holdoutPassRate: number;
  enterpriseGatesPassed: boolean;
}

export interface EvidenceSlice {
  status: EvidenceStatus;
  total: number;
  passed: number;
  passRate: number | null;
}

export interface SkillMaturityEvidence {
  id: FableSkillId;
  maturity: SkillMaturity;
  sourceAvailable: boolean;
  structured: boolean;
  packageValid: boolean;
  runtimeIntegrated: boolean;
  behaviorallyProven: boolean;
  enterpriseReady: boolean;
  behavior: {
    known: EvidenceSlice;
    negative: EvidenceSlice;
    ambiguous: EvidenceSlice;
    adversarial: EvidenceSlice;
    holdout: EvidenceSlice;
  };
}

function slice(total: number, passed: number, threshold: number = 1): EvidenceSlice {
  return total === 0
    ? { status: 'NOT_CHECKED', total, passed, passRate: null }
    : { status: passed / total >= threshold ? 'PASS' : 'FAIL', total, passed, passRate: passed / total };
}

export function computeEvidenceBackedMaturity(input: MaturityInputs): SkillMaturity {
  if (!input.sourceAvailable) return 'M0';
  if (!input.structured) return 'M0';
  if (!input.contractValid) return 'M1';
  if (!input.runtimeIntegrated) return 'M2';
  const behaviorReady =
    input.knownCases > 0 && input.knownPassRate >= 0.9 &&
    input.negativeCases > 0 && input.negativePassRate >= 0.95 &&
    input.ambiguousCases > 0 && input.ambiguousPassRate >= 0.9 &&
    input.adversarialCases > 0 && input.adversarialPassRate >= 0.95 &&
    input.holdoutCases > 0 && input.holdoutPassRate >= 0.9;
  if (!behaviorReady) return 'M3';
  return input.enterpriseGatesPassed ? 'M5' : 'M4';
}

function proveRuntimeIntegration(id: FableSkillId, repoRoot: string, packageValid: boolean): boolean {
  if (!packageValid) return false;
  const registry = loadSkillRegistry(repoRoot);
  const entry = getSkillEntry(id, registry);
  if (!entry) return false;
  if (id === registry.entry) return true;
  const probes = [...entry.intents, ...entry.keywords]
    .map((probe) => probe.replace(/[-_]+/g, ' ').trim())
    .filter(Boolean);
  return probes.some((probe) => routeTask(probe, null, registry).selectedSkill === id);
}

export function evaluateSkillMaturity(
  id: FableSkillId,
  repoRoot: string = getCoreRepoRoot(),
  options: { agentBehaviorEvidence?: AgentBehaviorEvalResult | null } = {}
): SkillMaturityEvidence {
  const sourceAvailable = fs.existsSync(path.join(repoRoot, 'skills', id, 'SKILL.md'));
  const structured = fs.existsSync(getSkillManifestPath(id, repoRoot));
  const packageValidation = structured ? validateSkillPackage(id, repoRoot) : null;
  const packageValid = Boolean(packageValidation?.valid);
  const registryEntry = getSkillEntry(id, loadSkillRegistry(repoRoot));
  const known = packageValid ? runSkillKnownCases(id, repoRoot) : null;
  const spark = id === 'fable-spark' && packageValid ? runSparkBenchmark(repoRoot) : null;
  const enterpriseRouting = id === 'get-fable' && packageValid ? runEnterpriseRoutingBenchmark(repoRoot) : null;
  const enterpriseSpark = id === 'fable-spark' && packageValid ? runEnterpriseSparkBenchmark(repoRoot) : null;
  const frozenHoldout = id === 'get-fable' && packageValid ? loadFrozenRoutingHoldoutEvidence(repoRoot) : null;
  const frozenSparkHoldout = id === 'fable-spark' && packageValid ? loadFrozenSparkHoldoutEvidence(repoRoot) : null;
  const enterpriseVerification = id === 'fable-verify' && packageValid ? runEnterpriseVerificationBenchmark(repoRoot) : null;
  const frozenVerificationHoldout = id === 'fable-verify' && packageValid ? loadFrozenVerificationHoldoutEvidence(repoRoot) : null;
  const agentBehaviorPlan = packageValid && id !== 'get-fable' && id !== 'fable-spark' && id !== 'fable-verify'
    ? buildEnterpriseAgentBehaviorEvalPlan(repoRoot)
    : [];
  const hasInjectedAgentEvidence = Object.prototype.hasOwnProperty.call(options, 'agentBehaviorEvidence');
  const agentBehaviorValidation = agentBehaviorPlan.length > 0
    ? hasInjectedAgentEvidence
      ? validateAgentBehaviorEvidenceSnapshot(options.agentBehaviorEvidence, agentBehaviorPlan)
      : loadAgentBehaviorEvidenceSnapshot(repoRoot, agentBehaviorPlan)
    : null;
  const agentBehaviorCases = agentBehaviorValidation?.fresh && agentBehaviorValidation.snapshot
    ? agentBehaviorValidation.snapshot.cases.filter((item) => item.skillId === id)
    : [];
  const knownTotal = spark ? spark.total : known?.executable || 0;
  const knownPassed = spark ? spark.passed : known?.passed || 0;
  const runtimeIntegrated = Boolean(registryEntry && proveRuntimeIntegration(id, repoRoot, packageValid));
  const behavior = enterpriseRouting ? {
    known: slice(enterpriseRouting.categories.known.total, enterpriseRouting.categories.known.passed, 0.9),
    negative: slice(enterpriseRouting.categories.negative.total, enterpriseRouting.categories.negative.passed, 0.95),
    ambiguous: slice(enterpriseRouting.categories.ambiguous.total, enterpriseRouting.categories.ambiguous.passed, 0.9),
    adversarial: slice(enterpriseRouting.categories.adversarial.total, enterpriseRouting.categories.adversarial.passed, 0.95),
    holdout: frozenHoldout?.fresh && frozenHoldout.snapshot
      ? slice(frozenHoldout.snapshot.total, frozenHoldout.snapshot.passed, 0.9)
      : slice(0, 0),
  } : enterpriseSpark ? {
    known: slice(enterpriseSpark.categories.known.total, enterpriseSpark.categories.known.passed, 0.9),
    negative: slice(enterpriseSpark.categories.negative.total, enterpriseSpark.categories.negative.passed, 0.95),
    ambiguous: slice(enterpriseSpark.categories.ambiguous.total, enterpriseSpark.categories.ambiguous.passed, 0.9),
    adversarial: slice(enterpriseSpark.categories.adversarial.total, enterpriseSpark.categories.adversarial.passed, 0.95),
    holdout: frozenSparkHoldout?.fresh && frozenSparkHoldout.snapshot
      ? slice(frozenSparkHoldout.snapshot.total, frozenSparkHoldout.snapshot.passed, 0.9)
      : slice(0, 0),
  } : enterpriseVerification ? {
    known: slice(enterpriseVerification.categories.known.total, enterpriseVerification.categories.known.passed, 0.9),
    negative: slice(enterpriseVerification.categories.negative.total, enterpriseVerification.categories.negative.passed, 0.95),
    ambiguous: slice(enterpriseVerification.categories.ambiguous.total, enterpriseVerification.categories.ambiguous.passed, 0.9),
    adversarial: slice(enterpriseVerification.categories.adversarial.total, enterpriseVerification.categories.adversarial.passed, 0.95),
    holdout: frozenVerificationHoldout?.fresh && frozenVerificationHoldout.snapshot
      ? slice(frozenVerificationHoldout.snapshot.total, frozenVerificationHoldout.snapshot.passed, 0.9)
      : slice(0, 0),
  } : agentBehaviorCases.length > 0 ? {
    known: slice(agentBehaviorCases.filter((item) => item.category === 'known').length, agentBehaviorCases.filter((item) => item.category === 'known' && item.passed).length, 0.9),
    negative: slice(agentBehaviorCases.filter((item) => item.category === 'negative').length, agentBehaviorCases.filter((item) => item.category === 'negative' && item.passed).length, 0.95),
    ambiguous: slice(agentBehaviorCases.filter((item) => item.category === 'ambiguous').length, agentBehaviorCases.filter((item) => item.category === 'ambiguous' && item.passed).length, 0.9),
    adversarial: slice(agentBehaviorCases.filter((item) => item.category === 'adversarial').length, agentBehaviorCases.filter((item) => item.category === 'adversarial' && item.passed).length, 0.95),
    holdout: slice(agentBehaviorCases.filter((item) => item.category === 'holdout').length, agentBehaviorCases.filter((item) => item.category === 'holdout' && item.passed).length, 0.9),
  } : {
    known: slice(knownTotal, knownPassed),
    negative: slice(known?.negativeCases || 0, known?.negativePassed || 0),
    ambiguous: slice(0, 0),
    adversarial: slice(0, 0),
    holdout: slice(0, 0),
  };
  const maturity = computeEvidenceBackedMaturity({
    sourceAvailable, structured, contractValid: packageValid, runtimeIntegrated,
    knownCases: behavior.known.total, knownPassRate: behavior.known.passRate || 0,
    negativeCases: behavior.negative.total, negativePassRate: behavior.negative.passRate || 0,
    ambiguousCases: behavior.ambiguous.total, ambiguousPassRate: behavior.ambiguous.passRate || 0,
    adversarialCases: behavior.adversarial.total, adversarialPassRate: behavior.adversarial.passRate || 0,
    holdoutCases: behavior.holdout.total, holdoutPassRate: behavior.holdout.passRate || 0,
    enterpriseGatesPassed: false,
  });
  return {
    id, maturity, sourceAvailable, structured, packageValid, runtimeIntegrated,
    behaviorallyProven: maturity === 'M4' || maturity === 'M5',
    enterpriseReady: maturity === 'M5', behavior,
  };
}
