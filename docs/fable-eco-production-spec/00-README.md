# Fable Eco Production Specification Pack

Status: implementation-ready planning baseline
Target repository: `imMamdouhaboammar/get-fable`
Baseline reviewed: get-fable 1.9.0 architecture with Rust workspace members `fable-core` and `fable-cli`, Bun host runtime, canonical skill registry, deterministic router, durable state, evidence gates, and multi-host adapters
Feature name: `fable-eco`

## Purpose

Fable Eco is not a bulk installer. It is a curated capability distribution and execution-control subsystem for get-fable. It has two product surfaces:

1. Eco Provisioner: discovers the machine, resolves compatible capabilities and dependencies, produces a reviewable plan, installs transactionally, configures supported coding hosts, verifies health, records receipts, and can update, repair, remove, or roll back
2. Eco Capability Runtime: maps routed engineering work to installed capabilities through explicit contracts, policy, playbooks, permissions, evidence requirements, and host-specific enforcement grades

The key design rule is `install many, activate few`. Installed capabilities must never all be injected into agent context. The existing get-fable router remains the source of task intent. Eco resolves only the additional capabilities needed to execute that routed task safely and efficiently

## Recommended repository placement

```text
crates/
  fable-core/                  existing lifecycle semantics
  fable-cli/                   existing native CLI
  fable-eco/                   new Rust library for Eco
skills/
  fable-eco/
    SKILL.md                   new canonical skill contract
eco/
  catalog/                     official capability manifests
  profiles/                    curated install profiles
  playbooks/                   capability execution playbooks
  policies/                    machine and execution policies
schemas/
  eco/                         canonical JSON Schemas
src/
  eco/                         Bun host bridge and presentation layer
  hosts/                       existing host adapters extended for Eco
.fable/
  eco.example.json             project binding example
```

## Documents in this pack

- `01-product-spec.md`: product requirements, scope, UX, success metrics, non-goals
- `02-system-architecture.md`: component boundaries, trust boundaries, data flows, ownership
- `03-capability-model.md`: capability taxonomy, manifests, conflicts, permissions, enforcement grades
- `04-catalog-version-resolution.md`: official catalog, version strategy, compatibility, lock semantics
- `05-provisioner-transaction-model.md`: discovery, planning, install drivers, atomicity, rollback, repair
- `06-capability-runtime.md`: runtime planning, playbooks, execution contracts, evidence, fallbacks
- `07-host-adapters.md`: host discovery, configuration ownership, enforcement capability matrix
- `08-security-supply-chain.md`: threat model, artifact verification, permissions, secrets, network policy
- `09-state-lockfile-recovery.md`: global inventory, profile locks, project bindings, journals, crash recovery
- `10-cli-ux.md`: command surface, TUI behavior, machine-readable contracts, exit codes
- `11-testing-quality-strategy.md`: TDD, fixtures, property tests, integration tests, platform matrix, fault injection
- `12-observability-doctor.md`: structured events, diagnostics, doctor checks, support bundle redaction
- `13-curated-ecosystem.md`: initial capability shortlist, tiers, overlap and conflict policy
- `14-release-rollout.md`: milestones, release channels, migration, compatibility, go/no-go criteria
- `15-production-acceptance.md`: end-to-end release acceptance checklist and SLO targets
- `plans/`: detailed engineering implementation plans by subsystem
- `tasks/`: executable backlog, dependencies, acceptance criteria, traceability
- `schemas/`: 14 starter canonical schemas covering manifests, profiles, policies, project bindings, inventory, locks, plans, journals, receipts, host capability matrices, playbooks, execution contracts, capability results, and qualification records
- `examples/`: concrete examples for capability manifests and playbooks

## Architectural decisions locked by this pack

1. Add a dedicated Rust crate `crates/fable-eco`; do not put installation and supply-chain concerns into `fable-core`
2. `fable-core` remains owner of canonical lifecycle routing, task shape, durable work state, and completion semantics
3. Eco receives a routed task and chooses capabilities, not a second independent task interpretation
4. The official catalog is data-driven and schema-validated; Rust code must not hardcode third-party package behavior
5. Official catalog entries may use only built-in, allowlisted install drivers. Arbitrary shell install scripts are forbidden in the official catalog
6. Every mutating operation follows plan, stage, apply, verify, commit. Failure enters rollback or recoverable degraded state
7. Every resolved install is pinned into a lock with source identity, resolved version, immutable revision, artifact digest when applicable, driver, and dependency graph
8. Main or master is never treated as latest stable unless the manifest explicitly declares a commit-pinned source strategy
9. Host integrations expose an enforcement grade. Eco may not claim enforcement stronger than the host adapter can actually provide
10. No secret values are stored in Eco state, receipts, logs, support bundles, or lockfiles
11. A security capability may not silently receive authorization scope. Security actions require explicit routed security work plus bounded target scope
12. Completion remains governed by get-fable evidence semantics. Eco capabilities can produce typed evidence but cannot widen what counts as completion
13. Project-local files may select profiles or bind capabilities, but machine-global installation state lives outside the repository
14. Uninstall restores only Eco-owned mutations. Pre-existing user configuration is preserved unless an exact owned patch is reverted
15. Every official capability must pass adapter qualification before entering stable catalog

## Suggested implementation sequence

1. Contracts and schemas
2. Rust catalog loader and validator
3. Machine discovery and capability inventory
4. Deterministic resolver and lock generation
5. Transaction engine and install drivers
6. Host adapter mutation ownership and rollback
7. CLI and TUI
8. Capability runtime and execution contracts
9. Evidence bridge into get-fable lifecycle
10. Supply-chain hardening and fault injection
11. Cross-platform qualification
12. Curated capability qualification
13. Beta channel
14. Stable release

## Definition of production grade

Production grade here means a failed installation does not leave unexplained state, a rerun is idempotent, a crash can be recovered, third-party sources are pinned, host configuration ownership is explicit, security boundaries are testable, output is machine-readable, compatibility failures are explainable, and the runtime can prove why a capability was selected without exposing hidden model reasoning
