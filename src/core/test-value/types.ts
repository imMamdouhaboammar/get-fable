/**
 * Feature Reconstruction: Fable Test-Value Spearhead Engine — Types & REA Evidence Ledger
 * Reverse-Engineered from: https://github.com/tt-a1i/test-value
 * Tree Digest: git-tree:e3fb8a7f0950b661fab0993a06306096797dca3f
 * Evidence Digests:
 *   - SKILL.md: sha256:a68cfc741104a6abb23d8b04354885c0c7360a7a3e65a09b194b7e121b2cc51e (blob: 67a37da56a4bec8b912410d04e43e99395dc33b5)
 *   - references/audit.md: sha256:982e568099c21e51d6f76ae8c2185acacac36f5bede87f05302249314b387757 (blob: 5907e075f507d4147d7679a18d32232ac6fffa30)
 *   - references/decision-examples.md: sha256:a3c4228dbb5a42887842da09ecc0bfd8015d8828fec514a4af8e5edc792639f1 (blob: fbcc5f39d43db7166ab40f7c0efc848b7067f65f)
 *   - README_EN.md: sha256:6591c5bdf9273bdf81abbbb80e3f8427593698371f0776b085dc54ceb62f8544 (blob: 0aa636dc08215fe4bfff0eefe7b5492373b41897)
 *   - agents/openai.yaml: sha256:6eea9b5e5d25af57f8473312e15790c54623b5a1fe30aa1371144bcceeed5cb8 (blob: 7835abcc99cce79f1d8053daa829afa719066b9d)
 */

export interface ReaArtifactDigest {
  path: string;
  gitBlobSha: string;
  sha256: string;
  bytes: number;
  lines: number;
  role: string;
}

export interface ReaEvidenceLedger {
  featureName: string;
  sourceRepository: string;
  treeSha: string;
  reconstructedAt: string;
  coreQuestion: string;
  artifacts: Record<string, ReaArtifactDigest>;
  locations: Array<{
    artifact: string;
    lineRange: string;
    subsystem: string;
  }>;
  symbols: string[];
  limitations: string[];
  unknowns: string[];
}

export const TEST_VALUE_REA_EVIDENCE_LEDGER: ReaEvidenceLedger = {
  featureName: 'Fable Test-Value Spearhead Engine',
  sourceRepository: 'https://github.com/tt-a1i/test-value',
  treeSha: 'e3fb8a7f0950b661fab0993a06306096797dca3f',
  reconstructedAt: '2026-10-10T12:25:00.000Z',
  coreQuestion: 'Which concrete mistake does this test catch — and what maintenance cost is that protection worth?',
  artifacts: {
    'SKILL.md': {
      path: 'SKILL.md',
      gitBlobSha: '67a37da56a4bec8b912410d04e43e99395dc33b5',
      sha256: 'a68cfc741104a6abb23d8b04354885c0c7360a7a3e65a09b194b7e121b2cc51e',
      bytes: 9644,
      lines: 91,
      role: 'Core 3-question correctness calculus, 8-row decision table, discrimination verification, and feedback cost control',
    },
    'references/audit.md': {
      path: 'references/audit.md',
      gitBlobSha: '5907e075f507d4147d7679a18d32232ac6fffa30',
      sha256: '982e568099c21e51d6f76ae8c2185acacac36f5bede87f05302249314b387757',
      bytes: 4946,
      lines: 53,
      role: 'Responsibility grouping, cut-boundary proof ledger, 4-tier risk selection, and shard coverage invariants',
    },
    'references/decision-examples.md': {
      path: 'references/decision-examples.md',
      gitBlobSha: 'fbcc5f39d43db7166ab40f7c0efc848b7067f65f',
      sha256: 'a3c4228dbb5a42887842da09ecc0bfd8015d8828fec514a4af8e5edc792639f1',
      bytes: 6574,
      lines: 74,
      role: 'Brittle test trap taxonomy: automatic-layout snapshots, shared rule matrices, source assertions, semantic identity, and unstable waits',
    },
    'README_EN.md': {
      path: 'README_EN.md',
      gitBlobSha: '0aa636dc08215fe4bfff0eefe7b5492373b41897',
      sha256: '6591c5bdf9273bdf81abbbb80e3f8427593698371f0776b085dc54ceb62f8544',
      bytes: 6716,
      lines: 116,
      role: 'Problem-to-decision value matrix, copyable workflow prompts, and 5 foundational principles',
    },
    'agents/openai.yaml': {
      path: 'agents/openai.yaml',
      gitBlobSha: '7835abcc99cce79f1d8053daa829afa719066b9d',
      sha256: '6eea9b5e5d25af57f8473312e15790c54623b5a1fe30aa1371144bcceeed5cb8',
      bytes: 320,
      lines: 10,
      role: 'Agent UI metadata and invocation prompt contract',
    },
  },
  locations: [
    { artifact: 'SKILL.md', lineRange: 'L10-L18', subsystem: 'Scope & Authorization Classifier' },
    { artifact: 'SKILL.md', lineRange: 'L20-L31', subsystem: 'Three-Question Independent Correctness Evaluator' },
    { artifact: 'SKILL.md', lineRange: 'L32-L52', subsystem: '8-Row Test Decision Matrix & High-Severity Protection Floor' },
    { artifact: 'SKILL.md', lineRange: 'L49-L59', subsystem: 'Differential Discrimination Verifier' },
    { artifact: 'SKILL.md', lineRange: 'L60-L69', subsystem: 'Feedback Cost Controller, Zero-Selection Guard & Timing Attribution' },
    { artifact: 'references/audit.md', lineRange: 'L13-L24', subsystem: 'Cut-Boundary Proof Validator' },
    { artifact: 'references/audit.md', lineRange: 'L25-L45', subsystem: 'Risk-Tiered Execution Selector & Shard Coverage Verifier' },
    { artifact: 'references/decision-examples.md', lineRange: 'L5-L64', subsystem: 'Brittle Test Trap Detector' },
  ],
  symbols: [
    'evaluateThreeQuestions',
    'decideTestAction',
    'diagnoseTestFailure',
    'verifyDiscrimination',
    'validateCutBoundaryRecord',
    'analyzeTestFileContent',
    'auditTestSuite',
    'selectTestsByRisk',
    'verifyShardCoverage',
    'parseTestRunnerOutput',
    'canReuseVerificationEvidence',
    'runSpearheadPipeline',
  ],
  limitations: [
    'Static test-file pattern analysis inspects AST/regex idioms without executing dynamic cross-process call graphs unless --execute is passed.',
    'Simulated or mocked environments cannot stand in for real browser layout, OS path casing, or packaged distribution checks (SKILL.md:58, decision-examples.md:63).',
  ],
  unknowns: [
    'External browser/OS target matrix availability at runtime depends on host CI runners and installed Playwright/Cypress binaries.',
    'Historical failure rates outside local git/telemetry history require external CI log ingestion when available.',
  ],
};

export type TestValueScope =
  | 'audit'
  | 'implementation-review'
  | 'diagnose-failure'
  | 'spearhead';

export type FailureClassification =
  | 'product-regression'
  | 'obsolete-assertion'
  | 'environment-failure'
  | 'unstable-test';

export type ProtectedBoundaryCategory =
  | 'data-integrity'
  | 'permissions-trust-boundary'
  | 'compatibility'
  | 'essential-accessibility'
  | 'resource-cleanup'
  | 'failure-recovery'
  | 'core-contract'
  | 'incidental';

export type BrittleTestTrapKind =
  | 'source-spelling-assertion'
  | 'private-implementation-coupling'
  | 'noncontractual-snapshot'
  | 'shared-mistake-oracle'
  | 'sleep-timing-assumption'
  | 'cross-product-matrix-bloat'
  | 'mock-only-verification'
  | 'incidental-representation-equality';

export type TestValueDecisionAction =
  | 'ADD_CHEAPEST_REGRESSION'
  | 'REUSE_OR_EXTEND'
  | 'RELAX_TO_CONTRACT_PROPERTIES'
  | 'CONSOLIDATE_DUPLICATES'
  | 'FACTOR_SHARED_RULE_MATRIX'
  | 'PRESERVE_AND_TIER_BY_RISK'
  | 'RETIRE_OBSOLETE'
  | 'RETAIN_AWAITING_EVIDENCE';

export type RiskExecutionTier =
  | 'daily-feedback'
  | 'expanded-checks'
  | 'platform-delivery'
  | 'complete-verification';

export type TestResponsibilityGroup =
  | 'core-behavior'
  | 'shared-algorithms'
  | 'entrypoint-integration'
  | 'browser-platform'
  | 'filesystem-process-safety'
  | 'distribution-installation'
  | 'generated-artifacts'
  | 'ci-selection';

export type OracleSourceKind =
  | 'user-requirement'
  | 'public-contract'
  | 'compatibility-commitment'
  | 'observed-real-failure'
  | 'copied-implementation'
  | 'generated-self-snapshot';

export interface ThreeQuestionInput {
  concreteMistake: string;
  userOrMaintainerLoss: string;
  protectedBoundary: ProtectedBoundaryCategory;
  oracleSource: OracleSourceKind;
  breaksOnEquivalentRefactor: boolean;
  freezesNonContractualOutput: boolean;
  existingCoverage: 'none' | 'partial' | 'full-same-path';
  executionCostMs?: number;
  maintenanceFriction?: 'low' | 'medium' | 'high';
}

export interface ThreeQuestionAssessment {
  q1MistakeAndLoss: {
    concreteMistake: string;
    userOrMaintainerLoss: string;
    protectedBoundary: ProtectedBoundaryCategory;
    highConsequenceBoundary: boolean;
  };
  q2RefactorAndContract: {
    independentBasisVerified: boolean;
    breaksOnEquivalentRefactor: boolean;
    freezesNonContractualOutput: boolean;
  };
  q3IncrementalValue: {
    existingCoverage: 'none' | 'partial' | 'full-same-path';
    justifiesMaintenanceCost: boolean;
  };
  protectionScore: number;
  refactorResilienceScore: number;
  maintenanceCostScore: number;
  netValueScore: number;
  independentBasisVerified: boolean;
  traps: BrittleTestTrapKind[];
  recommendedAction: TestValueDecisionAction;
  rationale: string;
}

export interface DecisionMatrixInput {
  uncoveredBoundary: boolean;
  existingTestFailsForMistake: boolean;
  freezesNonContractualOutput: boolean;
  duplicateSamePathCount: number;
  sharedRuleMatrixAcrossEntrypoints: boolean;
  isCostly: boolean;
  protectsDistinctRisk: boolean;
  contractEndedOrRemoved: boolean;
  remainingConsumersCount?: number;
  ownershipOrExpectationUnclear: boolean;
  protectedBoundary: ProtectedBoundaryCategory;
}

export interface DecisionMatrixResult {
  action: TestValueDecisionAction;
  highConsequenceFloorApplied: boolean;
  rationale: string;
  requiredEvidence: string[];
}

export interface FailureDiagnosisInput {
  testName: string;
  errorMessage: string;
  protectedOutcome: string;
  contractChanged: boolean;
  environmentAvailable: boolean;
  intermittentOnRetry: boolean;
}

export interface FailureDiagnosisResult {
  testName: string;
  protectedOutcome: string;
  classification: FailureClassification;
  allowRetryAsPass: false;
  allowMockSubstitute: boolean;
  remediation: string;
}

export interface DiscriminationProbeInput {
  testId: string;
  validAlternativeTested: boolean;
  validAlternativePassed: boolean;
  originalBadResultTested: boolean;
  originalBadResultFailed: boolean;
}

export interface DiscriminationProbeResult {
  testId: string;
  discriminates: boolean;
  reason: string;
}

export interface CutBoundaryRecord {
  burden: string;
  existingProtection: string;
  change: string;
  survivingEvidence: string;
  intentionallyRemovedCombinations?: string[];
  verification: string;
}

export interface CutBoundaryValidationResult {
  valid: boolean;
  concealsRegression: boolean;
  errors: string[];
}

export interface DetectedTestTrap {
  kind: BrittleTestTrapKind;
  line: number;
  snippet: string;
  remediation: string;
}

export interface TestFileAuditReport {
  filePath: string;
  responsibilityGroup: TestResponsibilityGroup;
  testCount: number;
  assertionCount: number;
  protectedBoundaries: ProtectedBoundaryCategory[];
  traps: DetectedTestTrap[];
  protectionScore: number;
  refactorResilienceScore: number;
  maintenanceCostScore: number;
  netValueScore: number;
  recommendedAction: TestValueDecisionAction;
}

export interface TestSuiteAuditSummary {
  projectDir: string;
  totalFiles: number;
  totalTests: number;
  totalAssertions: number;
  totalTraps: number;
  averageProtectionScore: number;
  averageRefactorResilienceScore: number;
  averageNetValueScore: number;
  byResponsibility: Record<TestResponsibilityGroup, string[]>;
  files: TestFileAuditReport[];
  highValueCandidates: TestFileAuditReport[];
}

export interface BlastRadiusSelectionReport {
  projectDir: string;
  changedFiles: string[];
  riskTier: RiskExecutionTier;
  requiresCompleteSuite: boolean;
  zeroSelectionJustified: boolean;
  zeroSelectionReason: string | null;
  affectedTestFiles: string[];
  directDependents: string[];
  unmappedPaths: string[];
  recommendedCommand: string;
  rationale: string[];
}

export interface ShardDefinition {
  shardId: string;
  files: string[];
  measuredDurationMs?: number;
}

export interface ShardCoverageVerification {
  valid: boolean;
  totalInventory: number;
  coveredCount: number;
  missingFiles: string[];
  duplicateFiles: string[];
  maxShardDurationMs: number;
  minShardDurationMs: number;
  imbalanceRatio: number;
}

export interface ParsedTestTiming {
  caseTimeMs: number;
  fileTimeMs: number;
  wallClockCriticalPathMs: number;
  totalComputeMs: number;
}

export type TestRunVerdict =
  | 'PASS'
  | 'FAIL'
  | 'INVALID_ZERO_SELECTION'
  | 'ZERO_SELECTION_JUSTIFIED'
  | 'BULK_SKIP_REJECTED';

export interface ParsedTestExecutionResult {
  passed: boolean;
  verdict: TestRunVerdict;
  exitCode: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  totalExecuted: number;
  filesExecuted: number;
  timing: ParsedTestTiming;
  reason: string;
}

export interface EvidenceReuseCheck {
  reusable: boolean;
  reason: string;
  disclosedReuseSummary: string | null;
}

export interface SpearheadPipelineOptions {
  projectDir?: string;
  changedFiles?: string[];
  execute?: boolean;
  reuseEvidence?: boolean;
  recordFableEvidence?: boolean;
}

export interface SpearheadExecutionReport {
  reaProvenance: Pick<ReaEvidenceLedger, 'featureName' | 'sourceRepository' | 'treeSha' | 'coreQuestion'>;
  selection: BlastRadiusSelectionReport;
  audit: TestSuiteAuditSummary;
  reusedEvidence: EvidenceReuseCheck | null;
  execution: ParsedTestExecutionResult | null;
  evidenceRecorded: boolean;
}
