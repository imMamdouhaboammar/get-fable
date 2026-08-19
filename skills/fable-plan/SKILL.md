---
name: fable-plan
description: Convert evidence into bounded work cards with explicit acceptance criteria. Use for architecture, migrations, broad refactors, or multi-file design after load-bearing unknowns are resolved.
version: 1.3.0
pack: core
inputs:
  - requirements
  - evidence
requires:
  - load_bearing_unknowns_resolved
produces:
  - accepted_card
  - acceptance_condition
gates:
  - bounded_scope
  - named_acceptance
fallback: fable-discover
mutatesWorkspace: false
parallelSafe: false
neural_links:
  precursors:
    - fable-discover
    - fable-research
  continuations:
    - fable-tdd
    - fable-delegate
    - fable-execute
  lateral_peers:
    - fable-config
  recovery: fable-recover
---

# Fable Plan

Architectural decomposition and work card planning engine.

## Purpose
Convert grounded requirements into atomic, non-overlapping work cards with machine-checkable acceptance tests.

## When to Use
- Designing multi-file architectural changes or subsystem refactors.
- Planning migrations, database schema updates, or new feature additions.
- Decomposing large tasks for parallel subagent execution.

## When NOT to Use
- Trivially simple, single-line edits with obvious scope (use `fable-execute`).
- Investigating unknown codebase behavior (use `fable-discover`).

## Inputs
- **`requirements`**: Functional and non-functional specifications.
- **`evidence`**: Grounded facts from discovery and research.

## Expected Outputs
- **`accepted_card`**: Structured work card with scope boundaries and file lists.
- **`acceptance_condition`**: Automated test or CLI command that proves card completion.

## Procedure
1. Review gathered evidence and confirm all load-bearing unknowns are settled.
2. Partition work into independent cards touching disjoint files.
3. Define exact acceptance verification commands for each card.
4. Record active card in `.fable/LEDGER.md` or `.fable/state.json`.

## Decision Rules
- If an architectural unknown emerges, route back to `fable-discover` before finalizing the plan.
- Never include two conflicting modifications in the same card.

## Tool Policy
- Update `docs/SPEC.md` and `.fable/LEDGER.md` without modifying application source code.

## Evidence Requirements
- Every card must specify a concrete command (e.g. `bun test <file>`).

## Failure Handling
- If planning reveals excessive complexity (>5 interdependent cards), split into phased milestones.

## Completion Criteria
- Work cards are bounded, ordered, and ready for execution.

## Progressive Resources
- Rules: `references/decomposition-rules.md`
- Template: `templates/work-card.template.md`
- Example: `examples/multi-file-migration-plan.md`
