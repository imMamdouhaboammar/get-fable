# Fable Eco Resolver and Provisioner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build deterministic machine discovery, dependency/version resolution, install planning, transaction journaling, safe staging, built-in drivers, health checks, rollback, inventory, and reproducible locks

**Architecture:** Pure discovery and resolver code generate an immutable plan. Mutation begins only after a journal is durable. Drivers are compiled allowlisted implementations and cannot execute manifest-provided shell. Inventory and lock are committed only after health success

**Tech Stack:** Rust, serde, semver, sha2, fs2 or existing locking convention, tempfile, reqwest or repository-approved HTTP client, archive libraries selected with security tests

**Spec:** `04-catalog-version-resolution.md`, `05-provisioner-transaction-model.md`, `08-security-supply-chain.md`, `09-state-lockfile-recovery.md`

## Global Constraints

- Discovery is side-effect free
- Stable lock state contains immutable revisions
- Official drivers are allowlisted Rust implementations
- All writes are journaled and ownership-aware
- User-local install is default; privilege escalation is not a stable V1 requirement
- Failed verification cannot commit inventory or lock

---

### Task 1: Machine discovery model and bounded probes

**Files:**
- Create: `crates/fable-eco/src/model/machine.rs`
- Create: `crates/fable-eco/src/discover/mod.rs`
- Create: `crates/fable-eco/src/discover/platform.rs`
- Create: `crates/fable-eco/src/discover/runtime.rs`
- Create: `crates/fable-eco/src/discover/host.rs`
- Test: `crates/fable-eco/tests/discovery.rs`

**Interfaces:** produces `MachineFacts` with `Fact<T> = Present(T) | Absent | Unknown | Error(FactError)`

- [ ] Write tests proving timeout/error never becomes `Absent`
- [ ] Write fixture tests for macOS, Linux, and Windows path models
- [ ] Implement subprocess probes with individual timeouts and sanitized arguments
- [ ] Implement environment and filesystem probes without mutation
- [ ] Run `cargo test -p fable-eco --test discovery`
- [ ] Commit `feat(eco): add bounded machine discovery`

### Task 2: Compatibility and dependency graph resolver

**Files:**
- Create: `crates/fable-eco/src/resolve/mod.rs`
- Create: `crates/fable-eco/src/resolve/compatibility.rs`
- Create: `crates/fable-eco/src/resolve/dependency.rs`
- Create: `crates/fable-eco/src/resolve/conflict.rs`
- Test: `crates/fable-eco/tests/resolver_graph.rs`

**Interfaces:**
- Consumes: Catalog, MachineFacts, requested capability IDs
- Produces: `ResolutionSet { selected, skipped, blocked, conflicts }`

- [ ] Write failing tests for required dependency expansion, cycle rejection, OS mismatch, architecture mismatch, primary-provider selection, hard conflict, context-overlap coexistence
- [ ] Implement deterministic graph traversal sorted by capability ID
- [ ] Ensure hard conflicts never survive selected set
- [ ] Add property test: output is independent of input manifest file order
- [ ] Run focused tests and clippy
- [ ] Commit `feat(eco): resolve compatibility and capability graph`

### Task 3: Version resolver and immutable source identity

**Files:**
- Create: `crates/fable-eco/src/resolve/version.rs`
- Create: `crates/fable-eco/src/model/source.rs`
- Test: `crates/fable-eco/tests/version_resolution.rs`
- Fixtures: `crates/fable-eco/tests/fixtures/releases/*.json`

**Interfaces:** produces `ResolvedSource`

- [ ] Write tests: drafts excluded, prerelease excluded on stable, highest semver selected, exact pin respected, `main` rejected as committed stable revision, registry identity mismatch rejected
- [ ] Implement source-specific resolvers against injected metadata provider trait rather than direct network calls
- [ ] Record exact commit revision when tag metadata supplies it
- [ ] Add offline metadata provider fixture
- [ ] Run tests
- [ ] Commit `feat(eco): add immutable version resolution`

### Task 4: Install plan model and topological operation graph

**Files:**
- Create: `crates/fable-eco/src/model/plan.rs`
- Create: `crates/fable-eco/src/resolve/planner.rs`
- Test: `crates/fable-eco/tests/install_plan.rs`

**Interfaces:** produces `InstallPlan` matching `schemas/eco/install-plan.schema.json`

- [ ] Write tests for operation ordering, host patches after package stage, health before commit, no mutation during plan generation
- [ ] Implement operation DAG and topological sort with cycle rejection
- [ ] Include network destinations, target paths, privilege class, reversibility, and health operations in plan
- [ ] Serialize canonical JSON fixture
- [ ] Commit `feat(eco): build deterministic install plans`

### Task 5: Transaction journal and exclusive mutation lock

**Files:**
- Create: `crates/fable-eco/src/install/transaction.rs`
- Create: `crates/fable-eco/src/install/journal.rs`
- Create: `crates/fable-eco/src/model/receipt.rs`
- Test: `crates/fable-eco/tests/transaction_journal.rs`

**Interfaces:**
- Produces: `TransactionGuard`, `Journal`, `OperationState`, `TransactionReceipt`

- [ ] Write tests for lock contention, durable journal creation, operation state transition validation, foreign/corrupt journal rejection
- [ ] Implement one writer lock under Eco state root
- [ ] Write journal before first externally visible mutation
- [ ] Use exclusive temp file and atomic replace for journal updates where supported
- [ ] Commit `feat(eco): add durable transaction journal`

### Task 6: Secure artifact cache and staging

**Files:**
- Create: `crates/fable-eco/src/install/cache.rs`
- Create: `crates/fable-eco/src/install/stage.rs`
- Test: `crates/fable-eco/tests/artifact_security.rs`

**Interfaces:** produces verified content-addressed `StagedArtifact`

- [ ] Write traversal, absolute-path, symlink escape, wrong digest, and size-limit tests first
- [ ] Implement SHA-256 addressed cache
- [ ] Reverify cache bytes before use
- [ ] Implement secure extraction into transaction staging root
- [ ] Confirm executable content is not invoked before verification
- [ ] Commit `feat(eco): secure artifact staging and cache`

### Task 7: Built-in driver interface and first low-risk drivers

**Files:**
- Create: `crates/fable-eco/src/install/driver.rs`
- Create: `crates/fable-eco/src/install/drivers/mod.rs`
- Create: `crates/fable-eco/src/install/drivers/copy_skill.rs`
- Create: `crates/fable-eco/src/install/drivers/github_release.rs`
- Test: `crates/fable-eco/tests/drivers.rs`

**Interfaces:**

```rust
pub trait InstallDriver {
    fn plan(&self, ctx: &DriverContext, capability: &ResolvedCapability) -> EcoResult<Vec<Operation>>;
    fn apply(&self, ctx: &TransactionContext, operation: &Operation) -> EcoResult<OperationReceipt>;
    fn verify(&self, ctx: &TransactionContext, operation: &Operation) -> EcoResult<Verification>;
    fn rollback(&self, ctx: &TransactionContext, receipt: &OperationReceipt) -> EcoResult<()>;
}
```

- [ ] Write a compile test that official manifests cannot name an unregistered driver
- [ ] Implement `copy_skill` with owned target paths and atomic file writes
- [ ] Implement `github_release` against fixture metadata and local HTTP server in tests
- [ ] Verify digest and platform asset mapping before apply
- [ ] Commit `feat(eco): add allowlisted install drivers`

### Task 8: Add exact package drivers

**Files:**
- Create: `crates/fable-eco/src/install/drivers/git_checkout.rs`
- Create: `crates/fable-eco/src/install/drivers/bun_package.rs`
- Create: `crates/fable-eco/src/install/drivers/uv_tool.rs`
- Create: `crates/fable-eco/src/install/drivers/cargo_package.rs`
- Test: driver-specific fixtures using fake executables on PATH

**Interfaces:** same `InstallDriver`

- [ ] For each driver, write command-construction tests proving exact version or revision is always passed
- [ ] Use test fixture executables that record argv instead of hitting real registries
- [ ] Reject ambiguous package identity
- [ ] Add removal plan behavior and ownership rules
- [ ] Commit each driver independently so review can reject one without blocking the others

### Task 9: Health checks, inventory, lock commit

**Files:**
- Create: `crates/fable-eco/src/install/health.rs`
- Create: `crates/fable-eco/src/model/inventory.rs`
- Create: `crates/fable-eco/src/model/lock.rs`
- Create: `crates/fable-eco/src/install/commit.rs`
- Test: `crates/fable-eco/tests/commit_state.rs`

**Interfaces:** produces committed inventory and profile lock only after all required health checks pass

- [ ] Write test proving failed health leaves old inventory and old lock unchanged
- [ ] Write canonical lock ordering test
- [ ] Implement health command adapters with bounded timeout and no shell interpolation
- [ ] Commit inventory and lock using temp + replace under transaction lock
- [ ] Commit `feat(eco): commit verified inventory and locks`

### Task 10: Rollback and crash recovery

**Files:**
- Create: `crates/fable-eco/src/install/recover.rs`
- Test: `crates/fable-eco/tests/fault_injection.rs`

**Interfaces:** produces `RecoveryDecision` and `RecoveryReport`

- [ ] Build a fault-injection harness capable of terminating after each operation boundary
- [ ] Add required injection cases from `11-testing-quality-strategy.md`
- [ ] Implement reverse-order rollback for reversible operations
- [ ] Detect before/after/foreign state by digest rather than assumptions
- [ ] Mark ambiguous state `RECOVERY_REQUIRED`
- [ ] Run the entire fault suite repeatedly
- [ ] Commit `feat(eco): recover interrupted provisioning transactions`

### Task 11: Provisioner verification gate

- [ ] `cargo fmt --check`
- [ ] `cargo clippy --workspace --all-targets --all-features -- -D warnings`
- [ ] `cargo test -p fable-eco`
- [ ] run artifact security tests independently
- [ ] run fault injection tests independently
- [ ] verify no test requires public internet
- [ ] commit only test-fixture corrections if needed
