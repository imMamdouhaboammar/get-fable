# Fable Eco Hardening and Stable Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qualify production safety, curated capability adapters, performance, cross-platform behavior, diagnostics, documentation, release channels, and stable go/no-go gates

**Architecture:** This phase does not add broad new semantics. It attacks assumptions with adversarial tests, upstream adapter qualification, platform fixtures, and release gating. Stable catalog contains only capabilities proven by the qualification matrix

**Tech Stack:** Rust/Bun existing stack, CI matrices, local fixture servers, fuzz/property tools approved by repository, platform runners

**Spec:** `08-security-supply-chain.md`, `11-testing-quality-strategy.md`, `12-observability-doctor.md`, `13-curated-ecosystem.md`, `14-release-rollout.md`, `15-production-acceptance.md`

## Global Constraints

- Stable catalog support is earned per capability
- Public internet is not required for ordinary tests
- Security tests are release blocking
- Transaction ambiguity blocks mutation
- Stable channel does not include experimental capability adapters

---

### Task 1: Structured local event logging and redaction

**Files:**
- Create: `crates/fable-eco/src/observe/mod.rs`
- Create: `crates/fable-eco/src/observe/redact.rs`
- Test: redaction property tests

- [ ] Define event schema fields from observability spec
- [ ] Write sentinel-secret tests across nested errors and process metadata
- [ ] Implement size-bounded rotating JSONL log
- [ ] Ensure no full environment dumps
- [ ] Commit `feat(eco): add redacted local diagnostics`

### Task 2: Support bundle

**Files:**
- Create: `crates/fable-eco/src/doctor/support_bundle.rs`
- Test: bundle content allowlist test

- [ ] Build allowlist-based bundle, not denylist copy of user state root
- [ ] Normalize home/repository paths
- [ ] Test bundle excludes known secret sentinels and repository files
- [ ] Commit `feat(eco): create privacy-safe support bundles`

### Task 3: Security adversarial suite

**Files:** dedicated tests under `crates/fable-eco/tests/security/`

- [ ] Implement every case listed in `08-security-supply-chain.md`
- [ ] Add malicious catalog fixtures
- [ ] Add prompt-injection-looking tool output fixture and prove it is data
- [ ] Add active-security target-scope tests
- [ ] Make security suite a named CI gate
- [ ] Commit `test(eco): add adversarial security suite`

### Task 4: Fuzz and property targets

**Files:** repository-approved fuzz directory or separate crate

- [ ] Fuzz manifest decoding wrapper
- [ ] Fuzz lock/journal JSON parser
- [ ] Fuzz archive path sanitizer
- [ ] Fuzz managed text-block patcher
- [ ] Add deterministic property tests to normal CI even if long fuzz jobs are scheduled separately
- [ ] Commit `test(eco): fuzz critical parsers and path logic`

### Task 5: Cross-platform matrix

**Files:** `.github/workflows/...` existing CI integration

- [ ] Add macOS and Linux stable jobs
- [ ] Add Windows beta job until all path/locking/config tests pass
- [ ] Use temporary HOME and no real user config
- [ ] Save only sanitized failure artifacts
- [ ] Commit `ci(eco): add cross-platform qualification matrix`

### Task 6: Performance benchmarks

**Files:** `crates/fable-eco/benches/`

- [ ] Generate deterministic 250 and 1,000 entry catalogs
- [ ] Benchmark parse, resolve, lock serialization, runtime plan, doctor reconcile
- [ ] Add reference result report to docs without hard failing on noisy small regressions
- [ ] Add alert or threshold for catastrophic 2x regression in deterministic work units
- [ ] Commit `perf(eco): benchmark catalog and runtime planning`

### Task 7: Qualify core stable capabilities

**Files:** `eco/catalog/capabilities/*.toml`, adapter tests, qualification records

Qualification order:
1. Superpowers skill provider
2. guard-skills
3. Ponytail
4. MarkItDown
5. CodeGraph
6. RTK
7. agent-browser
8. Impeccable
9. agent-kernel if its install/runtime contract is stable
10. no-mistakes only after overlap with Fable gates is bounded

For each capability:
- [ ] verify source and license metadata
- [ ] implement exact version resolver fixture
- [ ] implement install/remove/health adapter tests
- [ ] declare permissions and conflicts
- [ ] test runtime selection role
- [ ] record qualified platform matrix
- [ ] add one atomic commit per capability

### Task 8: Qualify optional profiles

Candidates:
- Strix
- browser-use
- Agent-Reach
- gbrain
- reviewdog
- code-review-graph
- ui-ux-pro-max
- Scrapling

- [ ] Keep each optional until adapter qualification is complete
- [ ] Do not let one failing optional capability block Core stable profile
- [ ] Security profile cannot become stable before scoped active-testing policy passes

### Task 9: Documentation and migration

**Files:** README, docs, usage, architecture, changelog, migration notes

- [ ] Document first-run selector and plan-first guarantee
- [ ] Document ownership/removal behavior
- [ ] Document locks, offline, repair, recovery
- [ ] Document enforcement grades
- [ ] Document stable/optional/experimental tiers
- [ ] Document that existing third-party installations are external-unmanaged and are not silently adopted
- [ ] Commit `docs(eco): document provisioning and runtime contracts`

### Task 10: Release-channel gates

- [ ] Experimental: schemas and preview CLI available
- [ ] Beta: mutating transaction engine enabled for stable subset
- [ ] Stable: every item in `15-production-acceptance.md` resolved
- [ ] Add release automation check that catalog stable entries all have qualification records
- [ ] Add catalog deny-list mechanism test
- [ ] Commit `feat(eco): gate capability catalog by release channel`

### Task 11: Final release verification

Run and archive sanitized results for:

```bash
cargo fmt --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
bun run check
```

Then run:
- clean-machine profile install E2E
- no-op reinstall E2E
- update plan with pinned fixture
- interrupted install recovery E2E
- repair E2E
- uninstall restoration E2E
- runtime minimal-capability golden tasks
- security scoped-task E2E
- support-bundle redaction E2E

Release is blocked on any unresolved data-loss, secret-leak, ownership, mutable-version, recovery, or security-authorization defect
