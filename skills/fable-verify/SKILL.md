---
name: fable-verify
description: Falsify a substantial implementation and collect fresh acceptance evidence before completion. Use for test execution, typecheck, linting, regression checking, or post-repair verification.
version: 1.3.0
pack: core
inputs:
  - implementation_diff
requires:
  - test_suite
produces:
  - verification_evidence
  - falsification_verdict
gates:
  - fresh_mutation_covered
  - machine_checked
fallback: fable-recover
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - fable-execute
    - fable-tdd
  continuations:
    - fable-review
    - fable-security
    - fable-release
  lateral_peers:
    - fable-simulator
    - fable-run
  recovery: fable-recover
---

# Fable Verify

Empirical falsification and machine-checked verification engine.

## Purpose
Collect fresh, machine-checked evidence proving that implementation satisfies acceptance criteria without regressions.

## When to Use
- Validating completed implementation diffs before review or release.
- Running unit, integration, and end-to-end test suites.
- Checking typecheck (`tsc --noEmit`), linting, and build integrity.

## When NOT to Use
- Writing new production code or modifying files (use `fable-execute` or `fable-tdd`).
- Performing manual diff style critiques (use `fable-review`).

## Inputs
- **`implementation_diff`**: Workspace changes produced during execution.

## Expected Outputs
- **`verification_evidence`**: Typed evidence record (`test`, `build`, `runtime`).
- **`falsification_verdict`**: Pass/fail confirmation based on fresh machine output.

## Procedure
1. Identify all affected test suites and verification commands.
2. Execute narrow unit tests first, followed by project-wide gates (`bun test`, `typecheck`).
3. Attempt adversarial falsification (edge cases, empty inputs, error paths).
4. Record typed evidence with matching mutation generation.

## Decision Rules
- Evidence from an older mutation generation is stale and cannot prove newer edits.
- Security scan passes do not substitute for functional test evidence.

## Tool Policy
- Run verification commands (`bun test`, `bun run build`, `bun ./bin/get-fable.js doctor`).

## Evidence Requirements
- Concrete terminal output with exit code 0 and pass counts.

## Failure Handling
- If tests fail with an obvious fix, return one bounded repair to `fable-execute`.
- If failures repeat, route immediately to `fable-recover`.

## Completion Criteria
Completion gate: fresh passing evidence on current mutation generation.
- All affected test suites pass on the latest mutation generation.

## Progressive Resources
- Heuristics: `references/falsification-heuristics.md`
- Protocol: `references/evidence-recording.md`
- Example: `examples/falsification-session.md`
