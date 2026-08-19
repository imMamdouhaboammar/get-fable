---
name: get-fable
description: Route substantial software work through get-fable's complete coding lifecycle. Use when the user requests Fable-style rigor, when a project has active .fable state, or when the next safe engineering step depends on discovery, research, planning, testing, delegation, verification, review, security, release, handoff, evaluation, or recovery.
version: 1.3.0
pack: core
inputs:
  - task_description
  - current_state
requires:
  - repo_access
produces:
  - routing_decision
gates:
  - state_schema_valid
fallback: null
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors: []
  continuations:
    - fable-discover
    - fable-research
    - fable-plan
  lateral_peers:
    - fable-spark
  recovery: fable-recover
---

# get-fable

Universal entry point and lifecycle orchestrator for the Fable coding discipline.

## Purpose
Guide engineering agents through deterministic lifecycle phases, enforcing evidence gates, mutation tracking, and phase-appropriate skill delegation.

## When to Use
- Starting a new coding task or feature request.
- Resuming an existing engineering session with `.fable` state.
- Routing ambiguous work to the correct specialized skill.

## When NOT to Use
- Implementing narrow, pre-planned code changes without re-routing (use `fable-execute`).
- Running standalone test commands (use `fable-verify`).

## Inputs
- **`task_description`**: User request or task specification.
- **`current_state`**: Optional `.fable/state.json` runtime state.

## Expected Outputs
- **`routing_decision`**: Selected skill, target pack, required gates, and reasons.

## Procedure
1. Inspect `.fable/state.json` and active work cards.
2. Evaluate Spark micro-policy and failure streak.
3. Compute matching scores across canonical skills.
4. Apply state transitions and dispatch the selected skill.

## Decision Rules
- If `failureStreak >= 2`, route immediately to `fable-recover`.
- If task contains explicit security concerns, route to `fable-security`.
- If workspace mutated and verification is stale, route to `fable-verify`.

## Tool Policy
- Read `.fable/state.json` and `skills/get-fable/registry.json`.
- Execute `get-fable route "<task>" --apply` to persist state.

## Evidence Requirements
- Schema version 2 conformity for `.fable/state.json`.

## Failure Handling
- On state corruption, run `get-fable doctor --fix` to repair core files.

## Completion Criteria
- Routing decision is produced and matching skill contract is activated.

## Progressive Resources
- Matrix: `references/lifecycle-routing-matrix.md`
- Example: `examples/lifecycle-walkthrough.md`
