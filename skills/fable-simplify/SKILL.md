---
name: fable-simplify
description: Clean up code quality, simplify logic, remove dead code, and improve altitude without changing runtime behavior. Use when refactoring complex functions, flattening nested branches, or deleting unused code.
version: 1.3.0
pack: system
inputs:
  - target_module
requires:
  - passing_tests
produces:
  - simplified_diff
gates:
  - behavior_preserved
  - tests_pass
fallback: fable-verify
mutatesWorkspace: true
parallelSafe: false
neural_links:
  precursors:
    - fable-execute
  continuations:
    - fable-verify
    - fable-review
  lateral_peers:
    - fable-execute
  recovery: fable-recover
---

# fable-simplify

Code simplification, deduplication, and altitude refactoring specialist.

## Purpose
Improve maintainability, flatten nested logic, and eliminate dead code while strictly preserving runtime behavior and passing test suites.

## When to Use
- Refactoring convoluted, deeply nested if-else blocks or switch statements.
- Removing unused functions, redundant variables, and obsolete comments.
- Extracting reusable helper functions from duplicated blocks.

## When NOT to Use
- Adding new feature functionality or changing API contracts (use `fable-execute` or `fable-tdd`).
- Modifying code without an existing automated test suite (use `fable-tdd` first).

## Inputs
- **`target_module`**: Source file or function to simplify.

## Expected Outputs
- **`simplified_diff`**: Cleaner, more readable code diff.

## Procedure
1. Run existing test suite to ensure green baseline.
2. Flatten control flow using early returns and guard clauses.
3. Remove dead code, redundant variables, and useless comments.
4. Re-run test suite and verify 100% passing tests.

## Decision Rules
- Never change external function signatures or behavior contracts during simplification.
- Every simplification edit must be verified against existing tests.

## Tool Policy
- Use `replace_file_content` for surgical refactoring.

## Evidence Requirements
- Passing test suite output proving zero behavioral divergence.

## Failure Handling
- If any test breaks, immediately revert the simplification step.

## Completion Criteria
- Code complexity reduced, dead code removed, all tests pass.

## Progressive Resources
- Patterns: `references/refactoring-patterns.md`
- Example: `examples/flatten-nested-logic.md`
