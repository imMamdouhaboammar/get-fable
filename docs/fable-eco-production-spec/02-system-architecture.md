# Fable Eco System Architecture

## 1. Context

get-fable already has a deterministic task router, canonical skill registry, durable state, mutation-aware verification, evidence semantics, and host adapters. Fable Eco extends that architecture with machine capability provisioning and capability-aware execution

The design must avoid two independent orchestrators. `fable-core` decides the lifecycle route. `fable-eco` decides which installed external capabilities satisfy the routed work under policy

## 2. Component ownership

### `fable-core`

Owns:
- canonical task route
- selected skill and task shape
- lifecycle state
- evidence acceptance rules
- mutation and completion semantics
- fallback between canonical Fable skills

Does not own:
- third-party installation
- third-party version resolution
- host-specific package installation
- capability download cache

### `fable-eco`

New Rust crate. Owns:
- catalog schemas and validation
- machine discovery model
- capability inventory
- compatibility evaluation
- dependency and conflict resolution
- version resolution
- install plan construction
- transaction journal and rollback coordination
- built-in install drivers
- host configuration patch plans
- profile locks and receipts
- capability execution contracts
- playbook evaluation
- capability-level policy checks
- adapter qualification metadata

### `fable-cli`

Owns:
- native command parsing
- human and JSON output selection
- TUI entry points
- confirmation boundaries
- translating CLI inputs into `fable-eco` library calls

It does not own resolution rules

### Bun/TypeScript host layer

Owns:
- current JavaScript CLI compatibility
- host-specific integrations already implemented in TypeScript
- bridge to native Eco commands where native binary is available
- rendering and compatibility fallback while native coverage is being rolled out

It must not fork Eco policy semantics. Shared golden fixtures verify TypeScript presentation against Rust machine output

## 3. Proposed Rust workspace

```toml
[workspace]
members = [
  "crates/fable-core",
  "crates/fable-cli",
  "crates/fable-eco",
]
resolver = "2"
```

Suggested module structure:

```text
crates/fable-eco/src/
  lib.rs
  error.rs
  model/
    capability.rs
    catalog.rs
    profile.rs
    machine.rs
    inventory.rs
    lock.rs
    plan.rs
    receipt.rs
    contract.rs
    policy.rs
    host.rs
  catalog/
    load.rs
    validate.rs
    merge.rs
  discover/
    platform.rs
    runtime.rs
    package_manager.rs
    host.rs
    installed.rs
  resolve/
    dependency.rs
    conflict.rs
    version.rs
    compatibility.rs
    planner.rs
  install/
    engine.rs
    transaction.rs
    journal.rs
    cache.rs
    driver.rs
    drivers/
      github_release.rs
      git_checkout.rs
      bun_package.rs
      npm_package.rs
      cargo_package.rs
      uv_tool.rs
      binary_archive.rs
      copy_skill.rs
  host/
    patch.rs
    ownership.rs
    adapters/
  runtime/
    planner.rs
    playbook.rs
    contract.rs
    evidence.rs
  policy/
    evaluate.rs
    permission.rs
  doctor/
    checks.rs
    report.rs
```

## 4. Primary data flow

### Provisioning

```text
CLI request
  -> Machine Discovery
  -> Catalog Load + Schema Validation
  -> Policy Load
  -> Existing Inventory Load
  -> Dependency/Conflict Resolver
  -> Version Resolver
  -> Install Plan
  -> User Approval Boundary
  -> Transaction Journal Open
  -> Stage Artifacts
  -> Verify Artifacts
  -> Apply Package Operations
  -> Apply Host Patches
  -> Health Checks
  -> Commit Inventory + Lock + Receipts
  -> Close Journal
```

### Runtime

```text
Fable RoutingDecision
  + Project Eco Binding
  + Machine Inventory
  + Host Capability Matrix
  + Eco Policy
  -> Candidate Capabilities
  -> Compatibility + Permission Filter
  -> Playbook Match
  -> Minimal Capability Set
  -> Execution Contract
  -> Host Exposure / Invocation
  -> Adapter Result
  -> Evidence Translation
  -> fable-core Completion Gate
```

## 5. Trust boundaries

### Trusted code

- get-fable Rust crates
- get-fable Bun/TypeScript code shipped in the package
- schemas and manifests committed to the official get-fable repository after review

### Data trusted only after validation

- official catalog files
- local or enterprise catalog files
- project bindings
- profile lockfiles
- transaction journals
- tool outputs translated by adapters

### Untrusted external inputs

- GitHub API metadata
- release assets
- package registry metadata
- third-party repositories
- third-party CLI output
- host configuration already present on disk
- environment variables
- PATH-resolved binaries

All untrusted inputs must be parsed through bounded decoders and size limits

## 6. State locations

Default machine state:

```text
~/.fable/eco/
  inventory.json
  catalogs/
    metadata-cache/
  locks/
    default.lock.json
  receipts/
    <transaction-id>.json
  journals/
    active.json
    history/
  cache/
    artifacts/
  host-ownership/
    <host>.json
```

Project state:

```text
<repo>/.fable/eco.json
```

Project binding contains IDs and policy references only. It does not copy global inventory into the repository

## 7. Failure model

Every failure belongs to one class:

- DiscoveryFailure: fact could not be determined
- CatalogInvalid: schema or semantic validation failed
- Incompatible: capability cannot run on machine or host
- Conflict: selected capabilities cannot coexist under current policy
- ResolutionFailure: a stable or pinned version cannot be resolved
- ArtifactVerificationFailure: downloaded bytes cannot be trusted against expected metadata
- ApplyFailure: an install or config operation failed
- HealthFailure: installation completed but health check failed
- RollbackFailure: one or more owned operations could not be restored
- RecoveryRequired: previous process ended with an open journal
- PolicyDenied: requested action violates explicit policy
- HostUnsupported: host exists but required integration mechanism is unavailable

Errors must include stable machine codes, human explanation, affected capability, operation ID when applicable, and suggested safe next command

## 8. Concurrency

Only one mutating Eco transaction may run per user state root. Use a file lock on `~/.fable/eco/.lock` with bounded waiting. Read-only commands may run concurrently if they can read a committed snapshot. Runtime planning is read-only and must not wait on network metadata refresh

Project binding mutations use the existing get-fable workspace safety conventions and a separate workspace-local lock to avoid coupling machine install lock duration to repository operations

## 9. Rust/Bun boundary

V1 uses process and JSON contracts rather than native FFI

Recommended boundary:

```text
bun get-fable CLI
  -> spawn get-fable-native eco <command> --json-v1
  -> validate JSON envelope version
  -> render or pass through
```

Reasons:
- simpler release compatibility
- no N-API ABI surface
- native crash isolation
- easy golden testing
- language-independent automation interface

When native binary is unavailable, commands that require Eco mutation fail explicitly unless a TypeScript parity implementation exists. Do not silently use weaker semantics

## 10. Compatibility strategy

Catalog schema, lock schema, execution contract schema, and JSON CLI envelopes each have independent schema versions. Readers support a bounded compatibility window. Writers emit only the latest schema for the running get-fable release. Migrations are explicit and tested with fixtures
