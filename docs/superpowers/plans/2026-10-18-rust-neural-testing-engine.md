# Rust Core Neural Testing Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native Rust Core Neural Engine (`crates/fable-neural-test`) that accelerates `get-fable`'s test selection, execution, and verification pipelines by adapting quantized systolic array tensor math from FeSens/openTPU and multi-slot gated tournament evaluation from FeSens/auto-arch-tournament.

**Architecture:** A native Rust crate implementing a quantized int8/int4 change-impact tensor engine, a virtual systolic array dot-product multiplier, a 5-stage short-circuiting gated verification pipeline, Pareto tournament test ranking, an append-only test lessons scribe, and an anti-slop assertion integrity sandbox, seamlessly bridged to the `get-fable` CLI and `doctor` diagnostic suite.

**Tech Stack:** Rust 2021 (Cargo, `clap`, `serde`, `serde_json`, `sha2`, `rayon`, `chrono`, `regex`), TypeScript, Bun runtime (`bun:test`, `tsc`).

## Global Constraints
- Bun is the mandatory JavaScript/TypeScript package manager and test runner (npm and yarn are prohibited).
- Preserve existing contracts and commands (`bun test`, `get-fable test`, `frontier-test`, `anti-slop`).
- Enforce the Direct Payload & Zero Affordance Narration Invariant: zero conversational preambles, zero affordance narration, zero obviousness comments.
- Clean-room REA reconstruction with verified upstream SHA-256 digests and provenance headers.
- Zero mock data or weakened assertions allowed in tests.

---

### Task 1: Cargo Workspace & Crate Scaffolding

**Files:**
- Modify: `Cargo.toml:1-12`
- Create: `crates/fable-neural-test/Cargo.toml`
- Create: `crates/fable-neural-test/src/lib.rs`

**Interfaces:**
- Consumes: Standard Rust toolchain (edition 2021)
- Produces: Library crate `fable-neural-test` in the root cargo workspace

- [ ] **Step 1: Write crate manifest**
Create `crates/fable-neural-test/Cargo.toml` declaring package metadata and dependencies (`clap`, `serde`, `serde_json`, `sha2`, `regex`, `thiserror`, `chrono`, `rayon`).

- [ ] **Step 2: Add member to root Cargo.toml**
Add `"crates/fable-neural-test"` to `[workspace.members]` in `Cargo.toml`.

- [ ] **Step 3: Create initial lib.rs with smoke test**
Write basic module declarations and a unit test in `crates/fable-neural-test/src/lib.rs`.

- [ ] **Step 4: Run cargo test to verify**
Run: `cargo test -p fable-neural-test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add Cargo.toml crates/fable-neural-test
git commit -m "feat(neural-test): scaffold crates/fable-neural-test cargo workspace crate"
```

---

### Task 2: REA Evidence Ledger & Provenance Contract

**Files:**
- Create: `crates/fable-neural-test/src/rea_ledger.rs`
- Modify: `crates/fable-neural-test/src/lib.rs`

**Interfaces:**
- Consumes: Nothing
- Produces: `pub const REA_LEDGER: &[UpstreamArtifact]`, `pub fn verify_rea_ledger() -> Result<LedgerStats, LedgerError>`

- [ ] **Step 1: Write failing test for REA ledger validation**
Write unit test verifying that `verify_rea_ledger()` validates both `FeSens/openTPU` and `FeSens/auto-arch-tournament` with 64-char hex SHA-256 hashes and non-empty verified symbols.

- [ ] **Step 2: Run test to verify failure**
Run: `cargo test -p fable-neural-test -- test_rea_ledger`
Expected: FAIL (unresolved module or function)

- [ ] **Step 3: Implement rea_ledger.rs**
Implement `UpstreamArtifact`, `LedgerStats`, and `verify_rea_ledger()` with full SHA-256 and commit SHAs for `FeSens/openTPU` and `FeSens/auto-arch-tournament`.

- [ ] **Step 4: Run test to verify pass**
Run: `cargo test -p fable-neural-test -- test_rea_ledger`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add crates/fable-neural-test/src/rea_ledger.rs crates/fable-neural-test/src/lib.rs
git commit -m "feat(neural-test): implement REA evidence ledger for openTPU and auto-arch-tournament"
```

---

### Task 3: TPU Core — Quantized Tensor & Systolic Array

**Files:**
- Create: `crates/fable-neural-test/src/tpu_core/tensor.rs`
- Create: `crates/fable-neural-test/src/tpu_core/systolic.rs`
- Create: `crates/fable-neural-test/src/tpu_core/mod.rs`
- Modify: `crates/fable-neural-test/src/lib.rs`

**Interfaces:**
- Consumes: `rayon` for parallel processing
- Produces: `QuantizedVector`, `QuantizedMatrix`, `SystolicArray::multiply`, `SystolicArray::dot_product`

- [ ] **Step 1: Write failing unit test for quantized tensor dot-product**
Test quantization of float vectors to int8 with block scaling, and bit-exact systolic array matrix multiplication.

- [ ] **Step 2: Run test to verify failure**
Run: `cargo test -p fable-neural-test -- test_systolic_multiply`
Expected: FAIL

- [ ] **Step 3: Implement tensor.rs and systolic.rs**
Implement:
- `QuantizedVector`: `values: Vec<i8>`, `scale: f32`, `zero_point: i8`.
- `QuantizedMatrix`: `rows: usize`, `cols: usize`, `data: Vec<i8>`, `scales: Vec<f32>`.
- `SystolicArray`: Block-partitioned matrix multiplication with autovectorized SIMD and `rayon` parallel chunks.

- [ ] **Step 4: Run test to verify pass**
Run: `cargo test -p fable-neural-test -- test_systolic_multiply`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add crates/fable-neural-test/src/tpu_core
git commit -m "feat(neural-test): implement quantized tensor and systolic array SIMD engine"
```

---

### Task 4: Tournament Engine — Pareto Fitness & Selector

**Files:**
- Create: `crates/fable-neural-test/src/tournament/pareto.rs`
- Create: `crates/fable-neural-test/src/tournament/selector.rs`
- Create: `crates/fable-neural-test/src/tournament/mod.rs`
- Modify: `crates/fable-neural-test/src/lib.rs`

**Interfaces:**
- Consumes: `tpu_core::systolic::SystolicArray`
- Produces: `CandidateTest`, `ParetoFitnessScorer::evaluate`, `TournamentSelector::select_top_k`

- [ ] **Step 1: Write failing test for Pareto tournament ranking**
Verify that candidate tests with high fault discrimination and low execution latency rank at the top, while zero-discrimination or bloated tests are flagged for pruning.

- [ ] **Step 2: Run test to verify failure**
Run: `cargo test -p fable-neural-test -- test_pareto_ranking`
Expected: FAIL

- [ ] **Step 3: Implement pareto.rs and selector.rs**
Implement multi-objective optimization:
- Compute Pareto dominance frontiers.
- Score candidate tests with formula $F = (D^{1.5} \times R) / (\log_2(L + 2) \times \sqrt{M + 1})$.
- Select top-k champion tests and return pruning candidates.

- [ ] **Step 4: Run test to verify pass**
Run: `cargo test -p fable-neural-test -- test_pareto_ranking`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add crates/fable-neural-test/src/tournament
git commit -m "feat(neural-test): implement Pareto fitness scorer and tournament test selector"
```

---

### Task 5: Gated Pipeline & Append-Only Scribe

**Files:**
- Create: `crates/fable-neural-test/src/tournament/pipeline.rs`
- Create: `crates/fable-neural-test/src/tournament/scribe.rs`
- Create: `crates/fable-neural-test/src/tournament/sandbox.rs`
- Modify: `crates/fable-neural-test/src/tournament/mod.rs`

**Interfaces:**
- Consumes: `CandidateTest`, `TournamentSelector`
- Produces: `GatedPipeline::run`, `TestScribe::record_lesson`, `AntiSlopSandbox::verify_integrity`

- [ ] **Step 1: Write failing test for gated short-circuiting and scribe recording**
Verify that the pipeline immediately halts on Phase 1 (syntax/lint) failure without executing Phase 2-5, and records the failure lesson to `.fable/test-lessons.jsonl`.

- [ ] **Step 2: Run test to verify failure**
Run: `cargo test -p fable-neural-test -- test_gated_short_circuit`
Expected: FAIL

- [ ] **Step 3: Implement pipeline.rs, scribe.rs, and sandbox.rs**
Implement:
- `GatedPipeline`: 5 execution gates (`Syntax`, `Typecheck`, `HighRiskUnit`, `MutationKill`, `Integration`).
- `TestScribe`: Append-only atomic writes to `.fable/test-lessons.jsonl`.
- `AntiSlopSandbox`: Checks AST diffs for assertion count reductions or skip annotations.

- [ ] **Step 4: Run test to verify pass**
Run: `cargo test -p fable-neural-test -- test_gated_short_circuit`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add crates/fable-neural-test/src/tournament
git commit -m "feat(neural-test): implement gated short-circuiting pipeline and test lessons scribe"
```

---

### Task 6: Native CLI Binary Entrypoint

**Files:**
- Create: `crates/fable-neural-test/src/main.rs`

**Interfaces:**
- Consumes: `fable_neural_test` library crate
- Produces: `target/release/fable-neural-test` binary with subcommands: `scan`, `rank`, `eval`, `prune`, `doctor`

- [ ] **Step 1: Implement CLI argument parsing and commands in main.rs**
Add `clap` command structure supporting `--json`, `--json-v1`, and subcommands.

- [ ] **Step 2: Build release binary**
Run: `cargo build --release -p fable-neural-test`
Expected: Exit code 0, binary present at `target/release/fable-neural-test`.

- [ ] **Step 3: Verify CLI output**
Run: `./target/release/fable-neural-test doctor --json-v1`
Expected: Valid JSON envelope with `schema_version: 1`, `ok: true`.

- [ ] **Step 4: Commit**
```bash
git add crates/fable-neural-test/src/main.rs
git commit -m "feat(neural-test): implement fable-neural-test CLI binary"
```

---

### Task 7: TypeScript Native Bridge & CLI Command

**Files:**
- Modify: `src/eco/native-bridge.ts:250-319`
- Create: `src/cli/commands/neural-test.ts`
- Modify: `src/cli.ts` (or `src/cli/index.ts`)
- Modify: `src/core/doctor.ts`

**Interfaces:**
- Consumes: `target/release/fable-neural-test`
- Produces: `runNeuralTestCommand(args: string[]): number`, Doctor check `'neural-test-engine'`

- [ ] **Step 1: Add native discovery helpers in native-bridge.ts**
Add `findNeuralTestBinary(repoRoot: string): string | null` and `runNativeNeuralTest(...)`.

- [ ] **Step 2: Create CLI command handler in src/cli/commands/neural-test.ts**
Implement argument dispatch and fallback execution if cargo is available.

- [ ] **Step 3: Register subcommand in CLI dispatcher**
Register `neural-test` in `src/cli.ts` (or main CLI runner).

- [ ] **Step 4: Add doctor check in src/core/doctor.ts**
Add check `neural-test-engine` testing binary availability and REA ledger integrity.

- [ ] **Step 5: Run typecheck**
Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add src/eco/native-bridge.ts src/cli/commands/neural-test.ts src/cli.ts src/core/doctor.ts
git commit -m "feat(neural-test): bridge native neural engine to TypeScript CLI and doctor"
```

---

### Task 8: End-to-End Test Suite & Verification

**Files:**
- Create: `test/neural-test-engine.test.ts`

**Interfaces:**
- Consumes: All components from Tasks 1-7
- Produces: Complete Bun E2E verification

- [ ] **Step 1: Write comprehensive Bun test suite**
Cover:
1. REA Ledger integrity and upstream attestation check.
2. Tensor quantization and SIMD systolic multiplication accuracy.
3. Tournament selection and Pareto ranking.
4. Gated pipeline short-circuiting on blocker failure.
5. Scribe append-only ledger formatting.
6. Anti-slop assertion integrity check.
7. Full CLI invocation (`get-fable neural-test doctor --json-v1`).

- [ ] **Step 2: Run test suite**
Run: `bun test test/neural-test-engine.test.ts`
Expected: PASS

- [ ] **Step 3: Run full repository verification**
Run: `bun run typecheck && bun test && bun ./bin/get-fable.js doctor --json-v1`
Expected: All PASS, zero doctor errors.

- [ ] **Step 4: Commit**
```bash
git add test/neural-test-engine.test.ts
git commit -m "test(neural-test): add comprehensive E2E test suite for neural testing engine"
```
