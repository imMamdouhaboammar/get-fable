---
name: fable-tdd
description: Drive testable behavior changes through red, minimal implementation, green, and focused cleanup. Use for bug fixes, new features, or behavior changes with verifiable assertions.
version: 1.2.0
pack: build
inputs:
  - behavior_contract
requires:
  - test_harness
produces:
  - regression_test
  - behavior_change
gates:
  - red_observed
  - green_observed
fallback: fable-recover
mutatesWorkspace: true
parallelSafe: false
neural_links:
  precursors:
    - fable-plan
  continuations:
    - fable-execute
    - fable-verify
  lateral_peers:
    - fable-execute
  recovery: fable-recover
---

# fable-tdd

Test-Driven Development engine enforcing red-green-refactor discipline.

## Purpose
Ensure all behavior changes are anchored by explicit reproduction tests before modifying production code.

## When to Use
- Implementing bug fixes by reproducing the issue in a test first.
- Developing testable features, API endpoints, or business logic.
- Adding regression test coverage for existing capabilities.

## When NOT to Use
- Modifying non-executable documentation or static markdown assets (use `fable-execute`).
- Exploring unknown repository behavior (use `fable-discover`).

## Inputs
- **`behavior_contract`**: Expected input/output behavior and error cases.

## Expected Outputs
- **`regression_test`**: Executable test file asserting the behavior contract.
- **`behavior_change`**: Production code implementation satisfying the test.

## Procedure
1. Write a failing test in the appropriate test directory.
2. Run the test and explicitly observe the red failure state.
3. Implement minimal production code to turn the test green.
4. Refactor cleanly while preserving green status.

## Decision Rules
- Never write production implementation without first observing a red test.
- If a test fails for an unexpected reason (e.g. syntax error vs assertion failure), fix the test first.

## Tool Policy
- Edit test files and source files; run `bun test <file>`.

## Evidence Requirements
- Recorded test failure (red) followed by recorded test pass (green).

## Failure Handling
- If implementation cannot reach green within 2 attempts, route to `fable-recover`.

## Completion Criteria
- Test passes, mutation generation is recorded, and diff is clean.

## Progressive Resources
- Guide: `references/red-green-refactor.md`
- Example: `examples/failing-test-first.md`
