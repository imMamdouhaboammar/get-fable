---
name: fable-execute
description: Implement one bounded work card with immediate acceptance checks and no scope drift. Use only when scope is stable enough that implementation does not need a new architecture decision.
version: 1.3.0
pack: core
inputs:
  - accepted_card
requires:
  - bounded_scope
produces:
  - implementation_diff
  - card_completion
gates:
  - invariants_preserved
  - acceptance_checked
fallback: fable-plan
mutatesWorkspace: true
parallelSafe: false
neural_links:
  precursors:
    - fable-plan
    - fable-tdd
    - fable-delegate
  continuations:
    - fable-verify
  lateral_peers:
    - fable-simplify
  recovery: fable-recover
---

# fable-execute

Bounded code implementation and invariant-preserving execution engine.

## Purpose
Implement changes specified by an accepted work card with minimal footprint and immediate validation.

## When to Use
- Executing an accepted work card with stable requirements.
- Making direct, bounded code modifications without architectural uncertainty.
- Applying targeted bug fixes or configuration changes.

## When NOT to Use
- Designing multi-file architectures from scratch (use `fable-plan`).
- Exploring unknown repository behavior (use `fable-discover`).

## Inputs
- **`accepted_card`**: The active work card containing target files and acceptance commands.

## Expected Outputs
- **`implementation_diff`**: High-quality, minimal code changes.
- **`card_completion`**: Passing acceptance check and updated work card state.

## Procedure
1. Read active card requirements and target file contents.
2. Apply minimal edits strictly within the card's owned file paths.
3. Execute the card acceptance command immediately.
4. Record workspace mutation generation advancement.

## Decision Rules
- Touch only the files explicitly listed in the active card.
- If unexpected architectural changes are required, stop and return to `fable-plan`.

## Tool Policy
- Use precise file editing tools (`replace_file_content`, `write_to_file`).

## Evidence Requirements
- Passing execution receipt for the card's acceptance check command.

## Failure Handling
- If the acceptance command fails twice, stop and route to `fable-recover`.

## Completion Criteria
- Card acceptance command passes cleanly with 0 errors.

## Progressive Resources
- Containment: `references/mutation-containment.md`
- Example: `examples/bounded-card-execution.md`
