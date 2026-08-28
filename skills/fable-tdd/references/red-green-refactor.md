# Red-Green-Refactor Discipline & Test-First Development

## Purpose
Detailed guide to the Red-Green-Refactor discipline, observing honest failure before writing code, isolating test fixtures, and preventing false-positive tests.

## The 3 Phases of TDD

### Phase 1: RED (Observe Honest Failure)
1. Write a focused test that defines the expected behavior, edge case, or bug reproduction.
2. Run the test suite and **observe it fail for the exact expected reason**.
3. If the test passes before code is changed, the test is tautological or testing the wrong assertion. Revise the test.

### Phase 2: GREEN (Minimal Implementation)
1. Write the minimal amount of code necessary to make the failing test pass.
2. Do not write speculative extra features or gold-plate the implementation.
3. Run the test suite and confirm green.

### Phase 3: REFACTOR (Clean Code with Continuous Green)
1. Improve code structure, readability, and performance while keeping all tests green.
2. Remove duplication and extract helper functions.
3. Re-run the test suite after every small refactoring step.
