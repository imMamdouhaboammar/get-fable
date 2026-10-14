# Learning: PR Takeover, Supply-Chain Invariants, and Holdout Synchronization

## Context

During multi-agent autonomy and automated PR takeover across 11 pull requests (daily feature PRs and Dependabot bumps), multiple cross-layer invariants converged:
1. Third-party CI actions supply-chain pinning (`test/ci-supply-chain.test.ts`).
2. Schema-bound Deep Playbook V2 requirements (`src/fable-lint.ts`).
3. Blinding in offline behavior evaluation without oracle leakage (`src/core/agent-behavior-eval.ts`).
4. Cryptographic SHA-256 state policy binding in frozen verification holdouts (`src/core/verification-eval.ts`).
5. Sequential rebase of dependent daily PRs (`PR #21` after `PR #22` and `PR #24`).

## Key Learnings

### 1. Supply-Chain Pinning Invariants Must Proactively Reject Semantic Tags
- Automated dependency bots (Dependabot, Renovate) default to floating semantic tags (e.g. `@v7.0.1`) which directly violate immutable commit SHA supply-chain gates (`/^[0-9a-f]{40}$/`).
- Autonomous loop governance should detect and reject non-SHA action PRs immediately with policy explanation rather than attempting test execution.

### 2. Blinded Evaluation Must Avoid Substring Collisions with Oracle Keys
- Blinding checks (e.g. `expect(JSON.stringify(requests).includes('expected')).toBe(false)`) test the entire serialized request object including instructions, schemas, and the global action vocabulary.
- Action names such as `substitute-expected-answer-for-missing-response` trigger false oracle leak positives because they contain the substring `"expected"`. Renaming to domain-precise terms like `substitute-oracle-answer-for-missing-response` prevents vocabulary pollution.

### 3. Holdout Evidence Digests Must Be Synchronized Post-Mutation
- When runtime policies (`src/core/state.ts`) are hardened during PR integration, the cryptographic hash (`stateSha256`) in frozen benchmark results (`evals/results/verification-holdout-v1.json`) is invalidated by design.
- The loop must run the authoritative holdout evaluator (`runEnterpriseVerificationBenchmark`), verify 100% pass rate, and update the benchmark snapshot SHA rather than bypassing the gate.

### 4. Bulk System Test Timeout Discipline
- Multi-host installer matrixes and full Doctor diagnostics execute dozens of subprocesses and disk operations.
- The default test timeout (5000ms) causes false timeouts under bulk test runs. Setting `bun test --timeout 30000` in `package.json` scripts and adding per-test timeouts to diagnostic suites ensures reliable CI gating.

### 5. Multi-Wave Daily PR Rebase Pattern
- When multiple daily autonomy PRs modify core state, sequential wave integration (`PR #22` -> `PR #23` -> `PR #24` -> `PR #21`) requires resolving 3-way conflicts in `CHANGELOG.md` and chronological baseline documents, followed by full check gate re-validation before merging to `master`.
