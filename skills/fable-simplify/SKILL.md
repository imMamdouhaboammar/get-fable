---
name: fable-simplify
description: Review changed code for reuse, simplification, efficiency, altitude cleanups, dead code elimination, and apply the fixes without changing behavior.
---

# fable-simplify

Specialist skill focused on code quality, simplification, deduplication, and architectural altitude cleanups.

## When to Use
- After a feature or bug fix passes all tests, to clean up redundant abstractions, dead code, or overly complex logic.
- When refactoring deep nested conditionals into clean early-return guard clauses.
- Finding opportunities to reuse existing utilities across the codebase.

## Core Rules & Invariants
1. **Behavior Preservation**:
   - Simplification must NOT alter functional behavior or API contracts.
   - All tests must pass before and after the simplification pass.
2. **Minimal Indirection**:
   - Eliminate single-use wrapper functions that do not add abstraction value.
   - Inline trivial one-liners where clarity is improved.
3. **Altitude Discipline**:
   - Ensure functions operate at a single level of abstraction.
   - Keep domain logic separate from I/O and low-level parsing.
