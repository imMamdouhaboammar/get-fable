---
name: fable-delegate
description: Split independent work across subagents or workers with explicit ownership, scope, and acceptance contracts. Use when parallelism can reduce latency without creating overlapping edits or hidden integration risk.
---

# Fable Delegate

Parallel work is allowed only when ownership is clear.

## Contract

1. Start from bounded cards, not a vague project goal.
2. Delegate only work that can proceed independently without shared mutable decisions.
3. Give every worker one explicit objective, owned files or product surface, constraints, and one acceptance condition.
4. Workers must report evidence and unresolved questions, not confidence statements.
5. The parent retains integration ownership and must inspect the resulting diff before accepting worker claims.
6. Do not delegate the final completion decision.
7. If work overlaps or depends on a shared architectural decision, return to `fable-plan` before spawning workers.

## Exit condition

Every delegated result is accounted for, conflicts are resolved by the parent, and the integrated behavior is ready for `fable-verify`.
