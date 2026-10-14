# Fable Eco Capability Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make installed capabilities consumable by get-fable through minimal capability selection, declarative playbooks, execution contracts, host-aware enforcement, structured results, and evidence adapters

**Architecture:** Existing `fable-core` routing decision is input. Eco filters and orders installed capabilities but cannot replace the selected Fable skill or completion semantics. Host exposure contains only selected capability contracts

**Tech Stack:** Rust data model and resolver, existing fable-core routing types or a stable serialized bridge, Bun host adapters, versioned JSON/YAML playbooks

**Spec:** `06-capability-runtime.md`, `03-capability-model.md`, `07-host-adapters.md`, existing get-fable architecture

## Global Constraints

- No second task router
- Minimal capability activation
- Permission deny-by-default
- No silent enforcement downgrade
- Evidence adapters cannot widen completion semantics
- Delegated agents are executors, not peer routing authorities

---

### Task 1: Define the routing-decision input boundary

**Files:**
- Modify or expose stable types from `fable-core`
- Create: `crates/fable-eco/src/runtime/input.rs`
- Test: routing input compatibility fixture

- [ ] Identify the smallest stable subset of existing `RoutingDecision` needed by Eco: selected skill, selected pack, task shape, required gates, fallback, decision provenance digest
- [ ] Write serialization fixture from existing fable-core route
- [ ] Implement adapter type without duplicating routing logic
- [ ] Commit `feat(eco): consume canonical fable routing decisions`

### Task 2: Playbook schema and parser

**Files:**
- Create: `crates/fable-eco/src/runtime/playbook.rs`
- Create: `eco/playbooks/bug-fix.yaml`
- Create: `eco/playbooks/ui-implementation.yaml`
- Create: `eco/playbooks/code-review.yaml`
- Create: `eco/playbooks/security-assessment.yaml`
- Test: `crates/fable-eco/tests/playbooks.rs`

- [ ] Write parser tests for ordered steps, conditional steps, provider feature requirements, minimum enforcement grade, evidence expectation, fallback
- [ ] Reject shell commands and arbitrary expressions
- [ ] Implement a small typed condition vocabulary based on task shape and project facts
- [ ] Commit `feat(eco): add declarative execution playbooks`

### Task 3: Candidate filtering and minimal provider selection

**Files:**
- Create: `crates/fable-eco/src/runtime/planner.rs`
- Test: `crates/fable-eco/tests/runtime_selection.rs`

- [ ] Test installed-only filter
- [ ] Test unhealthy capability rejection
- [ ] Test host Grade N rejection
- [ ] Test lower-permission deterministic provider wins when both satisfy same feature
- [ ] Test context-overlap providers are not both activated unless playbook requires both
- [ ] Test output independent of catalog file ordering
- [ ] Commit `feat(eco): select minimal runtime capability set`

### Task 4: Permission policy evaluation

**Files:**
- Create: `crates/fable-eco/src/model/policy.rs`
- Create: `crates/fable-eco/src/policy/evaluate.rs`
- Create: `crates/fable-eco/src/policy/permission.rs`
- Test: `crates/fable-eco/tests/runtime_policy.rs`

- [ ] Write deny-by-default tests for network, workspace write, host config, credentials, active security testing
- [ ] Add policy layers global, enterprise, user, project with monotonic restriction rules for protected enterprise policy
- [ ] Ensure project policy cannot grant a permission forbidden by a higher protected layer
- [ ] Commit `feat(eco): enforce runtime capability permissions`

### Task 5: Execution contract model

**Files:**
- Create: `crates/fable-eco/src/model/contract.rs`
- Create: `crates/fable-eco/src/runtime/contract.rs`
- Test: `crates/fable-eco/tests/execution_contract.rs`

- [ ] Generate contract matching canonical schema
- [ ] Include routing decision digest, selected versions, steps, enforcement grades, permissions, evidence expectations, timeouts, retries, fallbacks, stop conditions
- [ ] Canonicalize contract for digest and reproducible diagnostics
- [ ] Commit `feat(eco): generate execution contracts`

### Task 6: Host exposure compiler

**Files:**
- Create: `src/eco/contract-compiler.ts` or Rust equivalent per existing host architecture
- Modify selected host adapters
- Test: host-specific exposure snapshots

- [ ] Compile only selected capability instructions/tools
- [ ] Ensure unrelated installed capabilities are absent from prompt/tool exposure
- [ ] Mark Grade C steps as advisory in compiled text
- [ ] Ensure permission/stop rules cannot be omitted by an adapter template
- [ ] Commit one host exposure implementation per commit

### Task 7: Structured capability result protocol

**Files:**
- Create: `crates/fable-eco/src/runtime/result.rs`
- Test: `crates/fable-eco/tests/capability_result.rs`

- [ ] Define status, timestamps, exit code, structured output, artifact refs, mutation flag, network flag, warnings, raw-output digest, adapter version
- [ ] Bound structured output size stored inline
- [ ] Keep large raw output outside lifecycle state
- [ ] Commit `feat(eco): normalize capability execution results`

### Task 8: Evidence adapter framework

**Files:**
- Create: `crates/fable-eco/src/runtime/evidence.rs`
- Integrate with existing fable-core evidence types
- Test: `crates/fable-eco/tests/evidence_bridge.rs`

- [ ] Test research result maps only to research evidence
- [ ] Test browser observation requires explicit assertions
- [ ] Test security pass does not close normal feature
- [ ] Test mutation after evidence keeps existing stale-generation behavior
- [ ] Implement code-owned adapters for first qualified capabilities
- [ ] Commit `feat(eco): bridge capability results to typed fable evidence`

### Task 9: Delegated agent provider contract

**Files:**
- Create: `crates/fable-eco/src/runtime/delegate.rs`
- Add adapter for `delegate-team` only after provider interface tests pass

- [ ] Define bounded subtask contract with input scope, allowed paths, permissions, expected output, mutation policy, deadline
- [ ] Ensure delegated result cannot mutate Fable routing state directly
- [ ] Add parallel-safety checks inherited from playbook and canonical skill
- [ ] Commit `feat(eco): add bounded delegated agent provider`

### Task 10: Explain-run

**Files:** native CLI + runtime explanation model

- [ ] Persist or reconstruct safe contract explanation metadata
- [ ] Report selected provider, rejected alternatives with reason codes, enforcement grade, permissions, required evidence, fallbacks
- [ ] Do not print hidden model reasoning
- [ ] Commit `feat(cli): explain eco runtime decisions`

### Task 11: Runtime regression gate

- [ ] run existing task-router golden tests unchanged
- [ ] prove adding Eco does not change canonical skill selection for existing fixtures
- [ ] run runtime selection golden tests
- [ ] run evidence completion tests
- [ ] run host exposure snapshots
- [ ] run full Bun and Rust checks
