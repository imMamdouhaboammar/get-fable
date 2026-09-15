# Fable Eco Production Acceptance Criteria

This is the final release gate for stable V1

## A. Architecture

- [ ] `fable-eco` exists as an isolated Rust crate in workspace
- [ ] `fable-core` remains lifecycle and completion authority
- [ ] Bun bridge consumes versioned native JSON rather than reimplementing resolver semantics
- [ ] `skills/fable-eco/SKILL.md` is canonical and registered
- [ ] official manifests are data-driven and schema-validated

## B. Provisioning

- [ ] clean supported machine discovery completes without mutation
- [ ] plan is generated before all mutation
- [ ] plan lists network, files, package operations, host config, permissions, health checks, and rollback class
- [ ] repeated install is idempotent
- [ ] exact version lock is written only after health success
- [ ] remove preserves non-owned configuration
- [ ] repair does not silently change versions
- [ ] offline reinstall works when lock and cache are complete

## C. Transactions and recovery

- [ ] one mutating transaction per user state root
- [ ] write-ahead journal exists before externally visible mutations
- [ ] fault injection after each stage has deterministic next-run result
- [ ] successful rollback verifies restored state
- [ ] rollback ambiguity results in `RECOVERY_REQUIRED`
- [ ] additional mutation is blocked during recovery-required state

## D. Supply chain

- [ ] stable sources are immutable or exact revision pinned
- [ ] `main` and `master` are rejected as resolved stable revisions
- [ ] package identities include registry/source identity
- [ ] downloaded bytes are digest-verified when digest is available
- [ ] cached artifacts are reverified
- [ ] malicious archive fixtures are rejected
- [ ] official catalog has no arbitrary script driver

## E. Host safety

- [ ] every stable host adapter has ownership receipts
- [ ] install and remove are idempotent
- [ ] malformed config cannot be overwritten silently
- [ ] config precondition changes abort apply
- [ ] enforcement grade is reported per capability binding
- [ ] advisory integration is never labeled enforceable

## F. Runtime

- [ ] runtime consumes existing Fable routing decision
- [ ] only required capabilities are exposed for a task
- [ ] conflicts are resolved deterministically or reported
- [ ] permissions are deny-by-default
- [ ] fallback cannot reduce required enforcement grade
- [ ] explain-run reports selection reasons without hidden chain-of-thought

## G. Evidence

- [ ] capability adapters produce typed results
- [ ] evidence translation is implemented in code for stable capabilities
- [ ] security pass cannot close unrelated feature work
- [ ] research output cannot be widened into functional verification
- [ ] workspace mutation still invalidates stale verification according to existing Fable state semantics

## H. Security

- [ ] no secrets persisted in state, lock, receipt, journal, logs, JSON output, or support bundle
- [ ] active security testing requires scoped authorized security task
- [ ] path and archive escape tests pass
- [ ] unsafe state-root symlinks and special files are rejected
- [ ] untrusted tool text is treated as data

## I. Quality

- [ ] `cargo fmt --check` passes
- [ ] `cargo clippy --workspace --all-targets --all-features -- -D warnings` passes
- [ ] `cargo test --workspace` passes
- [ ] existing Bun typecheck/tests/build pass
- [ ] schema fixtures pass
- [ ] resolver property tests pass
- [ ] fault injection suite passes
- [ ] security suite passes
- [ ] official stable capability contract tests pass
- [ ] supported platform matrix passes

## J. Performance targets

- [ ] warm local status p95 under 250 ms on reference development machine
- [ ] local plan p95 under 500 ms for 250 entries after metadata load
- [ ] standard discovery p95 under 3 seconds excluding isolated slow probes
- [ ] runtime capability selection p95 under 50 ms for 250 catalog entries

## K. Documentation

- [ ] user guide describes plan-first behavior
- [ ] install and uninstall ownership documented
- [ ] stable vs optional vs experimental catalog status documented
- [ ] host enforcement grade semantics documented
- [ ] enterprise/local catalog trust difference documented
- [ ] recovery procedure documented
- [ ] support bundle privacy documented

## Stable release decision

Stable V1 is ready only when every unchecked item has an explicit release-blocking issue or has been removed from V1 scope through a reviewed spec amendment. There is no silent acceptance of partial transaction safety, secret leakage, or ambiguous ownership
