# Fable Eco Product Specification

## 1. Problem

Engineers using coding agents increasingly assemble a personal stack of skills, CLIs, browser tools, code graph tools, quality gates, review helpers, research tools, and orchestration add-ons. Installation is fragmented across package managers and repositories. Configuration differs by coding host. Dependency and version drift is common. Even after installation, agents often do not know when to use a tool, use too many tools at once, invoke them in the wrong order, or treat advisory instructions as if they were hard enforcement

Fable Eco addresses both halves of the problem:

- Distribution: make a curated engineering capability set discoverable, installable, configurable, verifiable, updateable, removable, and reproducible
- Consumption: make those capabilities available to get-fable through contracts and playbooks so the router can request the right capability at the right time under explicit policy

## 2. Product statement

`fable-eco` is a Rust-first subsystem and canonical get-fable skill that provisions a curated AI engineering environment and coordinates installed capabilities through deterministic contracts, host-aware enforcement, and evidence-backed execution

## 3. Primary users

### Individual engineer

Wants one command to prepare a machine without manually reading dozens of installation guides. Needs safe defaults, visible plans, reliable updates, and a way to understand what is installed and why

### Power user

Wants to customize profiles, pin versions, disable capabilities, add a local catalog, and choose which hosts are modified

### Team or enterprise maintainer

Wants a signed or reviewed internal catalog, approved versions, network and permission policy, predictable project bindings, and auditable installation receipts

### Coding agent

Needs a compact description of available capabilities, explicit invocation contracts, bounded permissions, and evidence expectations. It must not receive the full catalog in every prompt

## 4. User journeys

### First run

1. User runs `get-fable eco`
2. Eco discovers OS, architecture, runtimes, package managers, installed hosts, existing capability footprints, write permissions, and network availability
3. Eco loads official catalog and any configured local catalogs
4. TUI presents curated profile recommendations plus individual capabilities
5. User selects a profile, individual items, or `select all compatible`
6. Eco resolves dependencies and conflicts
7. Eco prints a deterministic change plan before mutation
8. User approves
9. Eco stages downloads and verifies artifacts
10. Eco applies installations and configuration mutations transactionally
11. Eco runs health checks
12. Eco writes inventory, lock, receipts, and host ownership metadata
13. Eco prints installed, skipped, degraded, and next-action results

### Project activation

1. User runs `get-fable eco bind` in a repository or chooses binding during `get-fable init`
2. Eco detects the project stack and existing get-fable state
3. User selects a machine profile or explicit capability set
4. Eco writes a project binding file containing capability IDs, profile reference, policy reference, and minimum contract versions
5. No machine-global install occurs unless a required capability is missing and the user explicitly approves installation

### Agent runtime

1. Existing get-fable task router selects a canonical skill and task shape
2. Eco receives the routing decision, project binding, machine inventory, host capability matrix, and policy
3. Eco selects the smallest compatible capability set
4. Eco emits an execution contract with ordered actions, permissions, gates, expected evidence, fallback behavior, and enforcement grades
5. Host adapter exposes only selected instructions or tools
6. Results are translated into typed evidence or receipts
7. Existing get-fable completion gate decides whether the work can close

### Update

1. `get-fable eco update --plan` refreshes metadata and computes candidate updates
2. Stable resolution excludes prereleases unless a capability is pinned to a prerelease channel
3. User sees compatibility impact and host mutations before approval
4. Updates are applied transactionally
5. Health checks run before the new lock becomes committed state
6. On failure, Eco restores the previous committed state or records an explicit recovery requirement

## 5. Functional requirements

### FR-01 Environment discovery

Detect at minimum OS, architecture, shell, PATH entries, writable configuration roots, Bun, Node when relevant, Rust/Cargo, Python, uv/pipx where relevant, Git, GitHub CLI if present, browser availability, and supported coding hosts. Detection must be bounded by timeouts and must never mutate state

### FR-02 Catalog

Provide an official curated catalog. Each entry must declare immutable identity, source, version strategy, install driver, dependencies, conflicts, capabilities, supported platforms, host integrations, permissions, health checks, and execution metadata

### FR-03 Selection

Support TUI selection, explicit CLI IDs, profiles, non-interactive JSON input, and `--all-compatible`. `--all-compatible` means all non-conflicting compatible entries in the chosen profile or catalog scope, not literally every catalog item

### FR-04 Resolution

Resolution must be deterministic for the same catalog metadata, host facts, project facts, policy, and lock constraints. It must return selected, skipped, blocked, downgraded, and conflict decisions with reason codes

### FR-05 Plan

No mutation occurs before an install or update plan exists. Plan output includes operations, target paths, package manager actions, network sources, privileges required, configuration patches, restarts, health checks, rollback strategy, and unresolved risks

### FR-06 Transactional install

Mutating operations are journaled. Eco stages where possible, snapshots owned config fragments, applies changes, verifies, and only then commits new inventory and lock state

### FR-07 Idempotency

Running an already satisfied install request produces no destructive change. Repeated host configuration must not duplicate entries, hooks, MCP definitions, skill references, or PATH fragments

### FR-08 Removal

Removal is ownership-aware. Eco may remove artifacts it installed or exact config mutations it owns. It must not delete shared dependencies or user-authored config still required by non-Eco consumers without explicit confirmation

### FR-09 Repair

`eco repair` reconciles inventory against actual machine state, repairs missing owned files, re-runs health checks, and can restore host configuration from receipts. Repair must never silently reinstall a different version than the lock

### FR-10 Offline behavior

With a valid lock and cached artifacts, installation may run offline. Without required cached artifacts or metadata, Eco fails with a precise reason rather than falling back to mutable branches

### FR-11 Capability runtime

Runtime selection consumes the existing Fable routing decision. It must not independently reinterpret the full task and override canonical routing. Runtime may narrow or augment execution using installed capability contracts

### FR-12 Playbooks

Playbooks declare ordered or conditional capability use for task shapes such as bug fix, feature, UI implementation, code review, security assessment, repository discovery, research, documentation, and release verification

### FR-13 Host enforcement

Each host integration reports actual supported enforcement mechanisms such as pre-tool hook, post-tool hook, wrapped executable, MCP binding, plugin command, injected instruction, or none. Policy decisions must use that matrix

### FR-14 Evidence

Capability outputs can be translated into Fable evidence only through an adapter with a defined evidence type, freshness semantics, success criteria, and provenance. A capability may not self-declare completion authority

### FR-15 Machine-readable interface

Every command with material state or plan output supports a versioned JSON format suitable for other agents and automation

## 6. Non-functional requirements

### Performance

- Warm `eco status`: p95 under 250 ms on a normal developer machine excluding intentionally probed external tools
- Local plan generation after metadata is loaded: p95 under 500 ms for 250 catalog entries
- Discovery: default p95 under 3 seconds, with slow external probes isolated and separately reported
- Runtime capability resolution: p95 under 50 ms for 250 entries and 50 installed capabilities

### Reliability

- No committed inventory references an install that failed verification
- Interrupted transaction must be detected on next Eco invocation
- Idempotency test suite must cover every official install driver and host adapter
- A failed host patch must either roll back or leave a recoverable journal with exact next action

### Security

- No arbitrary shell scripts in official manifests
- No secret values persisted
- Downloads use TLS sources and artifact digest verification when an upstream immutable artifact is available
- Security tools require explicit scoped security work
- Configuration mutation paths are constrained to declared roots
- Symlink and special-file checks match or exceed existing get-fable lifecycle safety conventions

### Portability

Stable target platforms:
- macOS arm64
- macOS x86_64 where upstream capability supports it
- Linux x86_64
- Linux arm64 where upstream capability supports it
- Windows x86_64 in stable only after host path and transaction semantics pass qualification

Unsupported capability and platform combinations must be skipped with a structured explanation rather than forcing installation

## 7. Non-goals for V1

- Becoming a general-purpose OS package manager
- Installing system packages with unrestricted root access
- Replacing Homebrew, apt, winget, npm, Cargo, uv, or other upstream managers
- Guaranteeing identical host enforcement across hosts with different extension APIs
- Executing every installed capability for every task
- Allowing arbitrary community manifest code to execute during resolution
- Managing paid subscriptions or vendor authentication secrets
- Sandboxing arbitrary third-party binaries at the operating-system security boundary
- Replacing the existing get-fable router or completion gate

## 8. Product success criteria

V1 is successful when a clean supported machine can select an approved profile, receive an accurate plan, install all compatible profile capabilities, configure detected hosts without duplicate mutations, pass health checks, produce a deterministic lock, and run a sample Fable task where only the required capabilities are exposed. The same machine must then pass no-op reinstall, update plan, repair simulation, uninstall restoration, and interrupted-transaction recovery tests

## 9. Product telemetry policy

Default behavior is local-only diagnostics. No network telemetry is required for core operation. If future anonymous metrics are added, they must be opt-in, documented, stripped of repository paths, command content, usernames, secrets, host prompts, and project identifiers
