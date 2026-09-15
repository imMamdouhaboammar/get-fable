# Fable Eco Contracts and Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the new Rust crate, canonical skill, schemas, data model, catalog loader, and deterministic validation layer without mutating the machine

**Architecture:** `fable-eco` is a new Rust library crate. It owns capability/catalog/profile/policy data and pure validation. Existing `fable-core` remains lifecycle authority. `fable-cli` will consume Eco later. This phase has no installation side effects

**Tech Stack:** Rust 2021 workspace, serde, serde_json, serde_yaml where already accepted, TOML parser, semver, sha2, thiserror, Bun for existing repository checks

**Spec:** `00-README.md`, `01-product-spec.md`, `02-system-architecture.md`, `03-capability-model.md`, `04-catalog-version-resolution.md`

## Global Constraints

- Add `crates/fable-eco`; do not move third-party provisioning into `fable-core`
- No arbitrary shell execution from manifests
- Canonical capability IDs use `<namespace>/<name>`
- Unknown critical schema fields must fail validation
- Stable resolved versions must be immutable
- `fable-core` remains owner of task routing and completion semantics
- New code is test-first and warning-free under clippy

---

### Task 1: Add the `fable-eco` workspace crate

**Files:**
- Modify: `Cargo.toml`
- Create: `crates/fable-eco/Cargo.toml`
- Create: `crates/fable-eco/src/lib.rs`
- Create: `crates/fable-eco/src/error.rs`
- Test: `crates/fable-eco/tests/smoke.rs`

**Interfaces:**
- Produces: library crate `fable_eco`
- Produces: `EcoError` and `EcoResult<T>`

- [ ] **Step 1: Write the failing smoke test**

```rust
use fable_eco::schema_version;

#[test]
fn exposes_v1_schema_version() {
    assert_eq!(schema_version(), 1);
}
```

- [ ] **Step 2: Run the focused test and verify failure**

```bash
cargo test -p fable-eco --test smoke
```

Expected: failure because workspace member or function does not exist

- [ ] **Step 3: Add the workspace member and minimal crate**

`crates/fable-eco/src/lib.rs`:

```rust
pub mod error;

pub const fn schema_version() -> u32 {
    1
}
```

`crates/fable-eco/src/error.rs`:

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum EcoError {
    #[error("invalid eco data: {0}")]
    InvalidData(String),
}

pub type EcoResult<T> = Result<T, EcoError>;
```

- [ ] **Step 4: Run formatting and tests**

```bash
cargo fmt --all
cargo test -p fable-eco --test smoke
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Cargo.toml crates/fable-eco
git commit -m "feat(eco): add native eco crate"
```

### Task 2: Define capability identity and manifest types

**Files:**
- Create: `crates/fable-eco/src/model/mod.rs`
- Create: `crates/fable-eco/src/model/capability.rs`
- Create: `crates/fable-eco/tests/capability_manifest.rs`

**Interfaces:**
- Produces: `CapabilityId`, `CapabilityManifest`, `CapabilityKind`, `SupportTier`, `Permission`, `ConflictKind`

- [ ] **Step 1: Write parsing tests for valid and invalid IDs**

```rust
#[test]
fn capability_id_requires_namespace_and_name() {
    assert!("fable/rtk".parse::<CapabilityId>().is_ok());
    assert!("rtk".parse::<CapabilityId>().is_err());
    assert!("fable/../rtk".parse::<CapabilityId>().is_err());
}
```

- [ ] **Step 2: Add a round-trip manifest test using a minimal valid TOML fixture**

The fixture must include schema version, ID, kind, classes, source, version strategy, install driver, platforms, permissions, health, hosts, runtime, and governance

- [ ] **Step 3: Run tests to verify failure**

```bash
cargo test -p fable-eco --test capability_manifest
```

- [ ] **Step 4: Implement strongly typed enums and validated `FromStr` for `CapabilityId`**

Do not represent permission or support tier as arbitrary strings after parsing

- [ ] **Step 5: Re-run tests and clippy**

```bash
cargo test -p fable-eco --test capability_manifest
cargo clippy -p fable-eco --all-targets -- -D warnings
```

- [ ] **Step 6: Commit**

```bash
git add crates/fable-eco
git commit -m "feat(eco): define capability manifest model"
```

### Task 3: Implement canonical schema files and Rust validation parity

**Files:**
- Create: `schemas/eco/capability-manifest.schema.json`
- Create: `schemas/eco/profile.schema.json`
- Create: `schemas/eco/policy.schema.json`
- Create: `schemas/eco/lockfile.schema.json`
- Create: `schemas/eco/install-plan.schema.json`
- Create: `schemas/eco/execution-contract.schema.json`
- Create: `schemas/eco/project-binding.schema.json`
- Create: `schemas/eco/playbook.schema.json`
- Create: `schemas/eco/inventory.schema.json`
- Create: `schemas/eco/transaction-journal.schema.json`
- Create: `schemas/eco/receipt.schema.json`
- Create: `schemas/eco/capability-result.schema.json`
- Create: `schemas/eco/host-capability-matrix.schema.json`
- Create: `schemas/eco/qualification-record.schema.json`
- Create: `crates/fable-eco/src/catalog/validate.rs`
- Test: `crates/fable-eco/tests/schema_fixtures.rs`

**Interfaces:**
- Consumes: manifest model from Task 2
- Produces: `validate_manifest(&CapabilityManifest) -> EcoResult<()>`

- [ ] **Step 1: Copy the approved starter schemas from this specification pack into repository paths**

- [ ] **Step 2: Add valid and invalid fixture files under `crates/fable-eco/tests/fixtures/manifests/`**

Required invalid fixtures include unknown install driver, mutable stable branch, malformed capability ID, duplicate provided feature, invalid permission, empty platform list, and missing health check

- [ ] **Step 3: Write fixture tests that parse and semantically validate each file**

- [ ] **Step 4: Implement semantic checks not expressible cleanly in JSON Schema**

Examples: stable Git source requires exact revision strategy, conflicts cannot target self, required dependency cannot target self, source URL scheme allowlist, unique host IDs

- [ ] **Step 5: Run the complete Eco test suite**

```bash
cargo test -p fable-eco
```

- [ ] **Step 6: Commit**

```bash
git add schemas/eco crates/fable-eco
git commit -m "feat(eco): add canonical schemas and validation"
```

### Task 4: Implement catalog loading and merge precedence

**Files:**
- Create: `crates/fable-eco/src/catalog/mod.rs`
- Create: `crates/fable-eco/src/catalog/load.rs`
- Create: `crates/fable-eco/src/catalog/merge.rs`
- Test: `crates/fable-eco/tests/catalog_merge.rs`

**Interfaces:**
- Produces: `Catalog`, `CatalogLayer`, `load_catalog_dir(path)`, `merge_catalogs(layers)`

- [ ] **Step 1: Write tests for deterministic ordering and duplicate ID rejection**

- [ ] **Step 2: Add a test proving a local catalog cannot silently replace official source identity for `fable/*`**

- [ ] **Step 3: Implement sorted directory loading and strict UTF-8/TOML parsing with bounded file sizes**

- [ ] **Step 4: Implement precedence rules: official, enterprise, local, project-local if policy permits**

- [ ] **Step 5: Run tests twice and compare serialized catalog digest**

```bash
cargo test -p fable-eco --test catalog_merge
```

- [ ] **Step 6: Commit**

```bash
git add crates/fable-eco
git commit -m "feat(eco): load and merge capability catalogs"
```

### Task 5: Add profile model and expansion

**Files:**
- Create: `crates/fable-eco/src/model/profile.rs`
- Create: `crates/fable-eco/src/catalog/profile.rs`
- Create: `eco/profiles/core.toml`
- Create: `eco/profiles/frontend.toml`
- Create: `eco/profiles/research.toml`
- Create: `eco/profiles/security.toml`
- Test: `crates/fable-eco/tests/profile_expansion.rs`

**Interfaces:**
- Produces: `expand_profile(profile_id, catalog) -> ResolvedSelectionRequest`

- [ ] **Step 1: Write tests for profile inheritance, duplicates, excluded experimental items, and missing capability IDs**

- [ ] **Step 2: Implement stable ordered expansion with cycle detection**

- [ ] **Step 3: Seed profiles with IDs only for catalog entries added during qualification; keep unsupported candidates out of stable files**

- [ ] **Step 4: Run tests and inspect serialized expansion**

- [ ] **Step 5: Commit**

```bash
git add eco/profiles crates/fable-eco
git commit -m "feat(eco): add curated capability profiles"
```

### Task 6: Add the canonical `fable-eco` skill

**Files:**
- Create: `skills/fable-eco/SKILL.md`
- Modify: `skills/get-fable/registry.json`
- Modify: generated catalog inputs required by existing get-fable generation flow
- Test: existing registry and generated catalog tests

**Interfaces:**
- Produces: canonical skill ID `fable-eco`
- Consumes: existing registry fields and routing conventions

- [ ] **Step 1: Add a registry test or fixture that expects `fable-eco` to load and validate**

- [ ] **Step 2: Write the skill contract with intents limited to ecosystem provisioning, capability status, repair, and capability-aware execution preparation**

- [ ] **Step 3: Register it in the existing System pack unless a reviewed registry change creates a dedicated Ecosystem pack**

- [ ] **Step 4: Regenerate repository-generated catalog files using existing scripts**

```bash
bun run generate:catalog
bun run check:generated
```

- [ ] **Step 5: Run existing get-fable registry tests and full Bun typecheck**

```bash
bun run typecheck
bun test
```

- [ ] **Step 6: Commit**

```bash
git add skills registry packs scripts data
 git commit -m "feat(eco): register fable eco skill"
```

### Task 7: Foundation verification gate

**Files:** no production change unless a failure is discovered

**Interfaces:** produces a green foundation suitable for Plan 02

- [ ] **Step 1: Run Rust workspace quality checks**

```bash
cargo fmt --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
```

- [ ] **Step 2: Run existing repository checks**

```bash
bun run check
```

- [ ] **Step 3: Search the new Eco files for forbidden placeholder markers and mutable stable branch behavior**

```bash
rg -n "TB[D]|TO[D]O|implement[ ]later|branch *= *\"(main|master)\"" crates/fable-eco eco schemas/eco skills/fable-eco
```

Expected: no unresolved implementation placeholders and no manifest treating a mutable branch as a stable locked version

- [ ] **Step 4: Commit any verification-only fixture corrections separately**
