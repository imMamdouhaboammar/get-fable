/**
 * Feature Reconstruction: Three-Question Correctness Evaluator, 8-Row Decision Matrix & Cut-Boundary Verifier
 * Reverse-Engineered from: https://github.com/tt-a1i/test-value
 * Evidence Digest:
 *   - SKILL.md: sha256:a68cfc741104a6abb23d8b04354885c0c7360a7a3e65a09b194b7e121b2cc51e (Lines 10-59)
 *   - references/audit.md: sha256:982e568099c21e51d6f76ae8c2185acacac36f5bede87f05302249314b387757 (Lines 13-24)
 *   - references/decision-examples.md: sha256:a3c4228dbb5a42887842da09ecc0bfd8015d8828fec514a4af8e5edc792639f1 (Lines 35-58)
 */

import type {
  BrittleTestTrapKind,
  CutBoundaryRecord,
  CutBoundaryValidationResult,
  DecisionMatrixInput,
  DecisionMatrixResult,
  DiscriminationProbeInput,
  DiscriminationProbeResult,
  FailureDiagnosisInput,
  FailureDiagnosisResult,
  ProtectedBoundaryCategory,
  ThreeQuestionAssessment,
  ThreeQuestionInput,
} from './types.js';

export const HIGH_CONSEQUENCE_BOUNDARIES: ReadonlySet<ProtectedBoundaryCategory> = new Set([
  'data-integrity',
  'permissions-trust-boundary',
  'compatibility',
  'essential-accessibility',
  'resource-cleanup',
  'failure-recovery',
]);

const BOUNDARY_PROTECTION_WEIGHTS: Record<ProtectedBoundaryCategory, number> = {
  'data-integrity': 96,
  'permissions-trust-boundary': 95,
  'failure-recovery': 90,
  'resource-cleanup': 88,
  'compatibility': 86,
  'essential-accessibility': 85,
  'core-contract': 78,
  'incidental': 30,
};

export function isHighConsequenceBoundary(boundary: ProtectedBoundaryCategory): boolean {
  return HIGH_CONSEQUENCE_BOUNDARIES.has(boundary);
}

/**
 * Reconstructed from SKILL.md:20-31 ("Establish an independent basis for correctness")
 * Evaluates a test or proposed test against the 3 mandatory questions:
 *   1. Which concrete mistake fails this test, and what loss would it cause?
 *   2. Would an equivalent refactor or better valid result also fail?
 *   3. Which existing check already catches this mistake, and does added protection justify cost?
 */
export function evaluateThreeQuestions(input: ThreeQuestionInput): ThreeQuestionAssessment {
  const highConsequence = isHighConsequenceBoundary(input.protectedBoundary);
  const independentBasisVerified =
    input.oracleSource !== 'copied-implementation' &&
    input.oracleSource !== 'generated-self-snapshot' &&
    input.concreteMistake.trim().length > 0 &&
    input.userOrMaintainerLoss.trim().length > 0;

  const traps: BrittleTestTrapKind[] = [];
  if (!independentBasisVerified) {
    traps.push('shared-mistake-oracle');
  }
  if (input.freezesNonContractualOutput) {
    traps.push('noncontractual-snapshot');
  }
  if (input.breaksOnEquivalentRefactor && !input.freezesNonContractualOutput) {
    traps.push('private-implementation-coupling');
  }

  let protectionScore = BOUNDARY_PROTECTION_WEIGHTS[input.protectedBoundary] ?? 60;
  if (!independentBasisVerified) {
    protectionScore = Math.max(15, protectionScore - 40);
  }
  if (input.existingCoverage === 'full-same-path') {
    protectionScore = Math.max(10, protectionScore - 45);
  } else if (input.existingCoverage === 'partial') {
    protectionScore = Math.max(25, protectionScore - 15);
  }

  let refactorResilienceScore = 100;
  if (input.breaksOnEquivalentRefactor) refactorResilienceScore -= 45;
  if (input.freezesNonContractualOutput) refactorResilienceScore -= 35;
  refactorResilienceScore = Math.max(0, refactorResilienceScore);

  const frictionPenalty =
    input.maintenanceFriction === 'high' ? 55 : input.maintenanceFriction === 'medium' ? 28 : 10;
  const durationPenalty = Math.min(35, Math.round((input.executionCostMs ?? 25) / 100));
  const maintenanceCostScore = Math.min(100, frictionPenalty + durationPenalty);

  const netValueScore = Math.max(
    -100,
    Math.min(
      100,
      Math.round(protectionScore * 0.6 + refactorResilienceScore * 0.4 - maintenanceCostScore * 0.7)
    )
  );

  const justifiesMaintenanceCost =
    (highConsequence && input.existingCoverage !== 'full-same-path') || netValueScore >= 25;

  const decision = decideTestAction({
    uncoveredBoundary: input.existingCoverage === 'none',
    existingTestFailsForMistake: input.existingCoverage === 'partial' && !input.freezesNonContractualOutput,
    freezesNonContractualOutput: input.freezesNonContractualOutput || input.breaksOnEquivalentRefactor,
    duplicateSamePathCount: input.existingCoverage === 'full-same-path' ? 2 : 0,
    sharedRuleMatrixAcrossEntrypoints: false,
    isCostly: maintenanceCostScore >= 50,
    protectsDistinctRisk: input.existingCoverage !== 'full-same-path',
    contractEndedOrRemoved: false,
    ownershipOrExpectationUnclear: !independentBasisVerified,
    protectedBoundary: input.protectedBoundary,
  });

  const rationaleParts: string[] = [];
  if (!independentBasisVerified) {
    rationaleParts.push(
      'Expectation lacks an independent basis for correctness (derived from current implementation or self-snapshot).'
    );
  } else {
    rationaleParts.push(
      `Protects ${input.protectedBoundary} against "${input.concreteMistake}" via independent ${input.oracleSource}.`
    );
  }
  rationaleParts.push(decision.rationale);

  return {
    q1MistakeAndLoss: {
      concreteMistake: input.concreteMistake,
      userOrMaintainerLoss: input.userOrMaintainerLoss,
      protectedBoundary: input.protectedBoundary,
      highConsequenceBoundary: highConsequence,
    },
    q2RefactorAndContract: {
      independentBasisVerified,
      breaksOnEquivalentRefactor: input.breaksOnEquivalentRefactor,
      freezesNonContractualOutput: input.freezesNonContractualOutput,
    },
    q3IncrementalValue: {
      existingCoverage: input.existingCoverage,
      justifiesMaintenanceCost,
    },
    protectionScore,
    refactorResilienceScore,
    maintenanceCostScore,
    netValueScore,
    independentBasisVerified,
    traps,
    recommendedAction: decision.action,
    rationale: rationaleParts.join(' '),
  };
}

/**
 * Reconstructed from SKILL.md:32-52 ("Make the smallest effective testing decision")
 * Implements the 8-row deterministic decision table with high-consequence protection floors.
 */
export function decideTestAction(input: DecisionMatrixInput): DecisionMatrixResult {
  const highConsequence = isHighConsequenceBoundary(input.protectedBoundary);

  // Row 8: Unclear ownership or expectation -> retain and identify missing evidence
  if (input.ownershipOrExpectationUnclear) {
    return {
      action: 'RETAIN_AWAITING_EVIDENCE',
      highConsequenceFloorApplied: highConsequence,
      rationale:
        'Ownership of protection or correct contractual expectation is unclear; retain test and identify missing evidence rather than guessing.',
      requiredEvidence: ['independent-contract-or-requirement', 'call-path-trace'],
    };
  }

  // Row 7: Historical contract ended or capability removed -> retire only after checking remaining consumers
  if (input.contractEndedOrRemoved) {
    if ((input.remainingConsumersCount ?? 0) > 0) {
      return {
        action: 'RETAIN_AWAITING_EVIDENCE',
        highConsequenceFloorApplied: highConsequence,
        rationale: `Cannot retire obsolete test while ${input.remainingConsumersCount} remaining consumer(s) still depend on the contract.`,
        requiredEvidence: ['consumer-migration-verification'],
      };
    }
    return {
      action: 'RETIRE_OBSOLETE',
      highConsequenceFloorApplied: false,
      rationale:
        'Historical contract has explicitly ended with zero remaining consumers; retire obsolete test.',
      requiredEvidence: ['zero-remaining-consumers-verified', 'user-authorized-scope'],
    };
  }

  // Row 3: Test freezes noncontractual implementation or automatic output
  if (input.freezesNonContractualOutput) {
    return {
      action: 'RELAX_TO_CONTRACT_PROPERTIES',
      highConsequenceFloorApplied: highConsequence,
      rationale:
        'Test freezes noncontractual implementation details or algorithm-selected choices; assert outcome properties, tolerances, or boundaries while preserving explicit constraints.',
      requiredEvidence: ['valid-alternative-passes', 'original-mistake-fails'],
    };
  }

  // Row 5: Shared rule table repeated across entrypoints
  if (input.sharedRuleMatrixAcrossEntrypoints) {
    return {
      action: 'FACTOR_SHARED_RULE_MATRIX',
      highConsequenceFloorApplied: highConsequence,
      rationale:
        'Shared rule table is repeated across entrypoints; cover the full rule catalog through shared logic and verify each entrypoint integration and local overrides.',
      requiredEvidence: [
        'shared-catalog-test-passes',
        'entrypoint-integration-cases-retained',
        'removed-combinations-disclosed',
      ],
    };
  }

  // Row 4: Several tests protect the same failure through the same implementation path
  if (input.duplicateSamePathCount >= 2 && !input.uncoveredBoundary) {
    return {
      action: 'CONSOLIDATE_DUPLICATES',
      highConsequenceFloorApplied: highConsequence,
      rationale:
        'Multiple tests exercise the same failure through the identical implementation path; consolidate duplicates and record the surviving protection.',
      requiredEvidence: ['call-path-equivalence-trace', 'surviving-test-catches-mistake'],
    };
  }

  // Row 2: Existing test already fails for the mistake
  if (input.existingTestFailsForMistake) {
    return {
      action: 'REUSE_OR_EXTEND',
      highConsequenceFloorApplied: highConsequence,
      rationale:
        'An existing test already fails for this mistake; reuse or extend it instead of constructing a parallel fixture family.',
      requiredEvidence: ['reproduction-fails-before-fix', 'extended-test-passes-after-fix'],
    };
  }

  // Row 6: Costly test protects a distinct risk
  if (input.isCostly && input.protectsDistinctRisk) {
    return {
      action: 'PRESERVE_AND_TIER_BY_RISK',
      highConsequenceFloorApplied: highConsequence,
      rationale:
        'Costly test protects a distinct risk boundary; preserve coverage and optimize fixtures or schedule execution by risk tier.',
      requiredEvidence: ['fixture-isolation-preserved', 'risk-tier-scheduled'],
    };
  }

  // Row 1: Worthwhile failure boundary is uncovered
  if (input.uncoveredBoundary || input.protectsDistinctRisk || highConsequence) {
    return {
      action: 'ADD_CHEAPEST_REGRESSION',
      highConsequenceFloorApplied: highConsequence,
      rationale:
        'Worthwhile failure boundary is uncovered; add a regression at the cheapest layer that exposes the real fault while retaining required integration paths.',
      requiredEvidence: ['red-reproduction-observed', 'green-fix-observed'],
    };
  }

  return {
    action: 'RETAIN_AWAITING_EVIDENCE',
    highConsequenceFloorApplied: highConsequence,
    rationale: 'Retain current protection until concrete duplication or contract change evidence is established.',
    requiredEvidence: ['audit-evidence'],
  };
}

/**
 * Reconstructed from SKILL.md:16 & references/decision-examples.md:35-58 ("Diagnose a failure")
 */
export function diagnoseTestFailure(input: FailureDiagnosisInput): FailureDiagnosisResult {
  if (!input.environmentAvailable) {
    return {
      testName: input.testName,
      protectedOutcome: input.protectedOutcome,
      classification: 'environment-failure',
      allowRetryAsPass: false,
      allowMockSubstitute: false,
      remediation:
        'Environment or target binary is unavailable. Report as an explicit validation gap; simulated or mocked evidence cannot stand in for a real browser, OS, or package.',
    };
  }

  if (input.intermittentOnRetry) {
    return {
      testName: input.testName,
      protectedOutcome: input.protectedOutcome,
      classification: 'unstable-test',
      allowRetryAsPass: false,
      allowMockSubstitute: false,
      remediation:
        'Intermittent failure detected on retry. Inspect readiness signals, mutable fixture isolation, resource cleanup, and real product races rather than treating a green retry as a pass.',
    };
  }

  if (input.contractChanged) {
    return {
      testName: input.testName,
      protectedOutcome: input.protectedOutcome,
      classification: 'obsolete-assertion',
      allowRetryAsPass: false,
      allowMockSubstitute: true,
      remediation:
        'Authorized contract or noncontractual automatic output changed. Update the assertion to check contractual properties and verify discrimination against the original bad result.',
    };
  }

  return {
    testName: input.testName,
    protectedOutcome: input.protectedOutcome,
    classification: 'product-regression',
    allowRetryAsPass: false,
    allowMockSubstitute: false,
    remediation:
      'Product behavior regressed against an active contract. Repair the implementation without weakening the assertion.',
  };
}

/**
 * Reconstructed from SKILL.md:49-58 ("Check the test's ability to discriminate")
 */
export function verifyDiscrimination(input: DiscriminationProbeInput): DiscriminationProbeResult {
  if (!input.validAlternativeTested || !input.originalBadResultTested) {
    return {
      testId: input.testId,
      discriminates: false,
      reason:
        'Discrimination check incomplete: both a valid alternative and the original bad result must be exercised.',
    };
  }

  if (!input.validAlternativePassed) {
    return {
      testId: input.testId,
      discriminates: false,
      reason:
        'Assertion is overly restrictive: valid alternative / equivalent refactor failed the test.',
    };
  }

  if (!input.originalBadResultFailed) {
    return {
      testId: input.testId,
      discriminates: false,
      reason:
        'Assertion is over-relaxed: original bad result passed without triggering a failure.',
    };
  }

  return {
    testId: input.testId,
    discriminates: true,
    reason: 'Assertion cleanly discriminates: valid alternative passes and original bad result fails.',
  };
}

/**
 * Reconstructed from references/audit.md:13-22 ("Prove the boundary of a cut") & SKILL.md:47
 */
export function validateCutBoundaryRecord(record: Partial<CutBoundaryRecord>): CutBoundaryValidationResult {
  const errors: string[] = [];

  if (!record.burden || !record.burden.trim()) {
    errors.push('Missing "burden": must state measured execution/maintenance cost or concrete false alarm.');
  }
  if (!record.existingProtection || !record.existingProtection.trim()) {
    errors.push('Missing "existingProtection": must state the actual mistake, entrypoints, and implementation paths.');
  }
  if (!record.change || !record.change.trim()) {
    errors.push('Missing "change": must describe the deletion, consolidation, rewritten assertion, or tier shift.');
  }
  if (!record.survivingEvidence || !record.survivingEvidence.trim()) {
    errors.push('Missing "survivingEvidence": must prove how remaining tests detect the mistake.');
  }
  if (!record.verification || !record.verification.trim()) {
    errors.push('Missing "verification": must record executed commands, outcomes, and comparable timing.');
  }

  const combinedText = `${record.change || ''} ${record.survivingEvidence || ''}`.toLowerCase();
  const concealsRegression =
    /\b(?:test\.skip|describe\.skip|it\.skip|bulk skip|blind retry|retry until green|ignore failure)\b/.test(
      combinedText
    );

  if (concealsRegression) {
    errors.push(
      'Cut boundary violation (SKILL.md:47): bulk skips, blind retries, or ignored failures must not conceal regressions.'
    );
  }

  return {
    valid: errors.length === 0,
    concealsRegression,
    errors,
  };
}
