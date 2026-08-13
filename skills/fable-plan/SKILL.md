---
name: fable-plan
description: Plan substantial coding work before implementation. Use for ambiguous requirements, multi-file changes, migrations, architectural decisions, or tasks where wrong assumptions would cause rework.
---

# Fable Plan

Turn the request into an executable contract before implementation.

## Procedure

1. Inspect the relevant code and repository instructions.
2. Identify the load-bearing unknowns that could change the solution.
3. Resolve those unknowns with targeted evidence when possible.
4. Define scope, non-goals, constraints, and affected boundaries.
5. Break work into small cards with explicit dependencies.
6. Give every card a machine-checkable acceptance command or observable acceptance condition.
7. Mark assumptions that remain unverified instead of disguising them as facts.

For an initialized get-fable project, write or update the task-specific sections of `docs/SPEC.md` and `.fable/LEDGER.md` without replacing unrelated project-owned content.

## Handoff

Implementation begins only when the next card has a stable target and acceptance condition. Route that card to `$fable-execute` or follow that skill inline.
