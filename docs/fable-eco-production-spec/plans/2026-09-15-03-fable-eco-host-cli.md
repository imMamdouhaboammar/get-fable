# Fable Eco Host Adapters and CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose Eco through native and Bun CLIs, build safe host configuration adapters, interactive selection, machine JSON, status, doctor, repair, remove, bind, and recovery commands

**Architecture:** Native Rust owns command semantics and JSON data. Bun may invoke native Eco and render compatibility output. Host adapters produce patch plans and ownership receipts. TUI is a presentation layer over the same selection and plan APIs

**Tech Stack:** clap, Rust terminal UI library chosen during implementation, serde JSON envelopes, existing Bun CLI bridge

**Spec:** `07-host-adapters.md`, `10-cli-ux.md`, `12-observability-doctor.md`

## Global Constraints

- No TUI path may bypass plan generation
- `--json-v1` emits no terminal control codes
- Host mutation ownership is exact and removable
- Unknown host enforcement is never promoted to enforceable
- Repair never changes resolved versions

---

### Task 1: Native Eco subcommand tree

**Files:**
- Modify: `crates/fable-cli/Cargo.toml`
- Modify: `crates/fable-cli/src/main.rs`
- Create: `crates/fable-cli/src/eco.rs` if current layout allows module split
- Test: CLI integration tests under `crates/fable-cli/tests/eco_cli.rs`

**Interfaces:** consumes `fable_eco` APIs, emits versioned JSON envelope

- [ ] Write CLI tests for `eco discover`, `catalog list`, `profiles`, `plan`, `status`
- [ ] Add `fable-eco` path dependency
- [ ] Implement subcommand parsing without mutation for preview commands
- [ ] Implement stable exit-code mapping from Eco error codes
- [ ] Commit `feat(cli): expose eco read-only commands`

### Task 2: JSON V1 envelope

**Files:**
- Create: `crates/fable-cli/src/json.rs` or extend existing machine JSON module
- Test: JSON golden fixtures

- [ ] Write golden fixture for success and resolution conflict error
- [ ] Ensure schema version, command, ok, result, warnings, errors always exist
- [ ] Ensure debug output goes to stderr and never corrupts JSON stdout
- [ ] Commit `feat(cli): add eco json v1 contract`

### Task 3: Host adapter model and discovery

**Files:**
- Create: `crates/fable-eco/src/model/host.rs`
- Create: `crates/fable-eco/src/host/mod.rs`
- Create: `crates/fable-eco/src/host/ownership.rs`
- Test: `crates/fable-eco/tests/host_model.rs`

- [ ] Write tests for feature state `supported|unsupported|unknown`
- [ ] Write enforcement grade tests for representative mechanisms
- [ ] Implement host binding receipt types
- [ ] Commit `feat(eco): model host integration capabilities`

### Task 4: Structural config patch engine

**Files:**
- Create: `crates/fable-eco/src/host/patch.rs`
- Test: `crates/fable-eco/tests/config_patch.rs`

- [ ] Add JSON object key ownership tests
- [ ] Add TOML/YAML fixture tests only for formats already safely parseable in repository dependency policy
- [ ] Add text managed-block test with stable markers and precondition digest
- [ ] Add concurrent edit test proving apply aborts on precondition mismatch
- [ ] Add install/remove idempotency tests
- [ ] Commit `feat(eco): add ownership-aware host config patches`

### Task 5: Qualify first two host adapters

**Files:**
- Create or modify host adapter paths according to existing get-fable host architecture
- Add fixtures under `crates/fable-eco/tests/fixtures/hosts/<host>/`

- [ ] Select two hosts already best represented in current get-fable assets
- [ ] For each, capture detection, config root, skill/plugin/MCP mechanisms as code, not assumptions
- [ ] Implement adapter qualification matrix from `07-host-adapters.md`
- [ ] Mark unsupported features as `unknown` or `unsupported`
- [ ] Commit one host per atomic commit

### Task 6: Mutating CLI commands

**Files:** `crates/fable-cli/src/eco.rs`, Eco transaction APIs

- [ ] Add CLI tests for `install`, `update`, `remove`, `repair`, `recover`
- [ ] Require same-invocation plan approval before mutation
- [ ] `--yes` skips ordinary confirmation only
- [ ] Block mutation when an unresolved journal exists except `recover` and safe `repair`
- [ ] Commit `feat(cli): add eco provisioning commands`

### Task 7: Interactive selector

**Files:**
- Create: `crates/fable-cli/src/eco_tui.rs`
- Test: pure state-machine tests for selection behavior

- [ ] Model selector state independently from terminal rendering
- [ ] Test Space, A, N, P, F, Enter, Esc behavior
- [ ] Ensure blocked and hard-conflicting items cannot be simultaneously selected by select-all
- [ ] Implement no-color and 80-column rendering snapshots
- [ ] Add numbered prompt fallback for non-TTY environments
- [ ] Commit `feat(cli): add eco interactive selector`

### Task 8: Project bind and unbind

**Files:**
- Create: `crates/fable-eco/src/model/binding.rs`
- Create: `crates/fable-eco/src/project.rs`
- CLI wiring
- Test: temporary repository fixtures

- [ ] Write schema and path-safety tests for `.fable/eco.json`
- [ ] Bind profile/IDs without copying machine inventory into repository
- [ ] Unbind removes only Eco binding file when safe
- [ ] Missing machine capability during bind produces plan suggestion, not implicit install
- [ ] Commit `feat(eco): bind curated capabilities to projects`

### Task 9: Doctor and repair plan

**Files:**
- Create: `crates/fable-eco/src/doctor/mod.rs`
- Create: `crates/fable-eco/src/doctor/checks.rs`
- Create: `crates/fable-eco/src/doctor/report.rs`
- Test: `crates/fable-eco/tests/doctor.rs`

- [ ] Implement PASS/WARN/FAIL/BLOCKED model
- [ ] Add state, capability, host, and project checks
- [ ] `doctor --repair-plan` produces no mutation
- [ ] `repair` only restores locked versions and owned config
- [ ] Commit `feat(eco): add doctor and safe repair`

### Task 10: Bun bridge

**Files:**
- Create: `src/eco/native-bridge.ts`
- Create: `src/eco/types.ts`
- Modify: `src/cli.ts`
- Test: Bun tests with fake native executable

- [ ] Write fake native process fixtures for success, unsupported version, malformed JSON, non-zero exit
- [ ] Validate JSON schema version before rendering
- [ ] Never reinterpret resolution or policy decisions in TypeScript
- [ ] Add clear error when native mutation feature is unavailable rather than weak fallback
- [ ] Commit `feat(eco): bridge bun cli to native eco engine`

### Task 11: Host and CLI verification gate

- [ ] run Rust workspace checks
- [ ] run Bun typecheck/tests/build
- [ ] run CLI JSON golden tests
- [ ] run TUI no-color snapshots
- [ ] run each qualified host adapter matrix
- [ ] perform no-op install/remove E2E in temporary HOME
