# REA Reconstruction: Fable Test-Value Spearhead Engine (`tt-a1i/test-value`)

## 1. Mission & Core Question

Under the Reverse Engineering & Decompilation (`rea`) Evidence-First methodology, we reconstructed [`https://github.com/tt-a1i/test-value`](https://github.com/tt-a1i/test-value) (`git-tree:e3fb8a7f0950b661fab0993a06306096797dca3f`) into a first-class TypeScript subsystem and CLI verification engine (`src/core/test-value/` and `src/cli/commands/test-value.ts`) acting as the **spearhead of the `get-fable` verification system**.

Every evaluation, audit, test-selection, and failure-diagnosis decision is governed by one canonical question:

> **"Which concrete mistake does this test catch — and what maintenance cost is that protection worth?"**

---

## 2. REA Evidence Ledger

All five upstream artifacts were retrieved, inspected line-by-line, and cryptographically hashed beforeclean-room TypeScript synthesis:

| Upstream Artifact | Git Blob SHA | SHA-256 Digest | Size / Lines | Reconstructed Subsystem |
| :--- | :--- | :--- | :--- | :--- |
| `SKILL.md` | `67a37da56a4bec8b912410d04e43e99395dc33b5` | `sha256:a68cfc741104a6abb23d8b04354885c0c7360a7a3e65a09b194b7e121b2cc51e` | 9,644 B / 91 lines | Core 3-question calculus, 8-row decision matrix, 4-archetype failure classifier, differential discrimination, cut-boundary proof, zero-selection & timing guard |
| `references/audit.md` | `5907e075f507d4147d7679a18d32232ac6fffa30` | `sha256:982e568099c21e51d6f76ae8c2185acacac36f5bede87f05302249314b387757` | 4,946 B / 53 lines | Static & AST-pattern test suite auditor, responsibility group aggregator, risk-proportional selector, shard union/disjointness verifier |
| `references/decision-examples.md` | `fbcc5f39d43db7166ab40f7c0efc848b7067f65f` | `sha256:a3c4228dbb5a42887842da09ecc0bfd8015d8828fec514a4af8e5edc792639f1` | 6,574 B / 74 lines | 6 canonical brittle-trap detectors & supply-chain/packaging static check exemption |
| `README_EN.md` | `0aa636dc08215fe4bfff0eefe7b5492373b41897` | `sha256:6591c5bdf9273bdf81abbbb80e3f8427593698371f0776b085dc54ceb62f8544` | 6,716 B / 116 lines | High-level workflow taxonomy and human-facing CLI reporting |
| `agents/openai.yaml` | `7835abcc99cce79f1d8053daa829afa719066b9d` | `sha256:6eea9b5e5d25af57f8473312e15790c54623b5a1fe30aa1371144bcceeed5cb8` | 320 B / 10 lines | Agent trigger metadata and default invocation surface |

---

## 3. Architectural Subsystems (`src/core/test-value/`)

1. **`types.ts` — REA Evidence Ledger & Domain Contracts**:
   - Exports `TEST_VALUE_REA_EVIDENCE_LEDGER`, `ProtectedBoundaryCategory`, `OracleSourceKind`, `BrittleTrapKind`, `TestDecisionAction` (8 canonical actions), `FailureDiagnosisKind`, `RiskTier`, and `SpearheadPipelineResult`.
2. **`evaluator.ts` — 3-Question Calculus, 8-Row Decision Matrix, Failure Classifier & Differential Discrimination**:
   - `evaluateThreeQuestions(input)`: Evaluates Q1 (Independent Correctness & Oracle Grounding — flagging AI shared-mistake risk when expectations are copied from the implementation under test), Q2 (Real Failure Mode & Blast Radius across 10 protected boundary categories), and Q3 (Signal-to-Cost Ratio).
   - `decideTestAction(state)`: Implements the 8-row decision matrix (`FIX_PRODUCT_CODE`, `RETAIN_AS_REGRESSION_GUARD`, `MIGRATE_AND_RECORD_EQUIVALENCE`, `RETIRE_OBSOLETE`, `KEEP_EXTERNAL_REPLACE_INTERNAL`, `COLLAPSE_TO_PARAMETERIZED_CASES`, `STRENGTHEN_ORACLE`, `RELAX_TO_CONTRACT_PROPERTIES`) with high-consequence boundary protection floors.
   - `diagnoseTestFailure(input)`: Classifies test failures into `PRODUCT_REGRESSION`, `OBSOLETE_OR_OVERFIT_ASSERTION`, `ENVIRONMENT_DEPENDENCY_FAILURE`, or `UNSTABLE_TEST`, blocking blind test weakening.
   - `verifyDiscrimination(input)` & `validateCutBoundaryRecord(record)`: Enforces differential discrimination (`brokenOutputPasses === false && validVariantOutputPasses === true`) and fails closed when test cuts omit surviving evidence or conceal product bugs via bulk skips.
3. **`auditor.ts` — Static & AST-Pattern Brittle Trap Detector**:
   - `analyzeTestFileContent(filePath, content)` & `auditTestSuite(targetDir)`: Detects all 6 brittle traps (`source-text-inspection`, `internal-call-count`, `exact-log-wording`, `incidental-ordering-snapshot`, `duplicate-permutation`, `shared-mistake-oracle`, `sleep-driven-timing`, `over-mocked-collaborator`) while explicitly honoring static supply-chain/packaging/CI policy checks (`decision-examples.md:57-66`).
4. **`selector.ts` — Risk-Proportional Test Selector & Shard Coverage Verifier**:
   - `selectTestsByRisk(options)`: Maps changed files across `smoke-and-fast`, `targeted-unit-integration`, `expanded-checks`, and `complete-verification`, failing closed (`failClosedReason`) if any changed code path has no mapped test coverage.
   - `verifyShardCoverage(shards, fullSuiteFiles)`: Proves set-union completeness and pairwise disjointness across parallel CI shards (`audit.md:39`).
5. **`runner.ts` — Zero-Selection Guard, Timing Attribution, Evidence Reuse & Spearhead Pipeline**:
   - `parseTestRunnerOutput`: Fails closed when `selectedTestCount === 0` or `executedTestCount === 0` even if `exitCode === 0` (`SKILL.md:64`), and separates critical-path wall time from total compute time across workers (`SKILL.md:69`).
   - `canReuseVerificationEvidence`: Verifies whether prior verification evidence matches the current `mutationGeneration`, git revision, command, and runtime environment (`SKILL.md:65`).
   - `runSpearheadPipeline`: Orchestrates risk-proportional selection, static suite audit, optional runner execution, and automatic `.fable/state.json` evidence stamping.

---

## 4. Verification & Prevention Rules

- Never weaken or delete a failing test before classifying whether it caught a `PRODUCT_REGRESSION`.
- Never treat an exit code of `0` with `0` executed tests as passing verification.
- Never modify files governed by frozen holdout SHA-256 digests (`src/core/task-router.ts`, `src/core/spark.ts`, `src/core/state.ts`, `src/core/eval-runner.ts`, `src/core/verification-eval.ts`) when adding orthogonal subsystems unless intentionally regenerating holdout proofs.
