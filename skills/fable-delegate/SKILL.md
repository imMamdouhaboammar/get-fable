---
name: fable-delegate
description: Delegate independent work only through explicit ownership, scope, and acceptance contracts. Use when parallelism can reduce latency without creating overlapping edits or hidden integration risk.
version: 1.2.0
pack: build
inputs:
  - bounded_cards
requires:
  - disjoint_ownership
produces:
  - delegation_contracts
  - worker_results
gates:
  - ownership_explicit
  - acceptance_explicit
fallback: fable-plan
mutatesWorkspace: true
parallelSafe: true
neural_links:
  precursors:
    - fable-plan
  continuations:
    - fable-execute
    - fable-verify
  lateral_peers:
    - fable-tdd
  recovery: fable-recover
---

# fable-delegate

Parallel subagent coordinator and delegation contract manager.

## Purpose
Safely partition independent tasks across concurrent subagents with disjoint file ownership boundaries.

## When to Use
- Executing 2 or more independent work cards simultaneously.
- Generating parallel test suites or isolated adapters.
- Delegating distinct documentation and code tasks.

## When NOT to Use
- Executing tasks with shared mutable dependencies or shared files (use `fable-execute`).
- High-level architectural planning (use `fable-plan`).

## Inputs
- **`bounded_cards`**: Independent work cards from the planning phase.

## Expected Outputs
- **`delegation_contracts`**: Structured worker briefs specifying owned paths.
- **`worker_results`**: Verification receipts and diffs from completed workers.

## Procedure
1. Verify that worker task scopes do not overlap in file paths.
2. Issue explicit delegation contracts to subagents.
3. Collect worker outputs and inspect combined diffs.
4. Run integration verification on the merged workspace.

## Decision Rules
- Reject delegation if two workers must edit the same file.
- The parent orchestrator retains ultimate responsibility for integration verification.

## Tool Policy
- Spawn subagents using available host delegation tools (`invoke_subagent`).

## Evidence Requirements
- Passing acceptance checks from each worker plus parent integration pass.

## Failure Handling
- If a worker fails or hangs, terminate the worker and re-route the card to `fable-execute`.

## Completion Criteria
- All delegated tasks completed, verified, and integrated into workspace.

## Progressive Resources
- Contract: `references/subagent-contracts.md`
- Template: `templates/delegation-contract.template.md`
- Example: `examples/parallel-workers-walkthrough.md`
