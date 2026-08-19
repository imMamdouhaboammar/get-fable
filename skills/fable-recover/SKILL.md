---
name: fable-recover
description: Diagnose repeated failure, stale execution, or contradictory evidence before another edit. Use when commands fail repeatedly or retrying the same approach produces no progress.
version: 1.2.0
pack: core
inputs:
  - failure_evidence
requires:
  - failure_streak
produces:
  - revised_hypothesis
  - bounded_repair
gates:
  - diagnosis_changed
fallback: fable-discover
mutatesWorkspace: false
parallelSafe: false
neural_links:
  precursors:
    - fable-tdd
    - fable-execute
    - fable-verify
  continuations:
    - fable-discover
    - fable-plan
    - fable-execute
  lateral_peers:
    - fable-discover
  recovery: fable-discover
---

# fable-recover

Diagnostic recovery engine and anti-looping specialist.

## Purpose
Break repeated failure cycles by stepping through the 4-level attribution ladder to revise the failure diagnosis before editing more code.

## When to Use
- A test, build, or command has failed 2 or more times consecutively (`failureStreak >= 2`).
- Execution output appears stale, cached, or unaffected by recent edits.
- Evidence is contradictory or assumptions have been invalidated.

## When NOT to Use
- First-time minor syntax errors with obvious single-step fixes (use `fable-execute`).
- Initial task discovery (use `fable-discover`).

## Inputs
- **`failure_evidence`**: Error logs, stack traces, and failing command output.

## Expected Outputs
- **`revised_hypothesis`**: Root-cause diagnosis explaining why prior attempts failed.
- **`bounded_repair`**: Targeted single-action repair card.

## Procedure
1. Step 1 (Harness): Prove test driver, fixtures, mock data, and environment are valid.
2. Step 2 (Execution Path): Prove that running code reflects current workspace edits (check `dist/`, caches, branch).
3. Step 3 (Product Logic): Inspect algorithm logic only after steps 1 & 2 are validated.
4. Step 4 (Invariant): Identify violated system invariant and formulate bounded fix.

## Decision Rules
- Never repeat an unchanged failed command without new diagnostic information.
- If an assumption is disproved, discard it immediately.

## Tool Policy
- Inspect logs, check git status/diff, and run clean diagnostic commands.

## Evidence Requirements
- Clear statement of why previous attempts failed and what changed in the diagnosis.

## Failure Handling
- If root cause cannot be determined within recovery, escalate to `fable-discover`.

## Completion Criteria
- Diagnosis revised; single bounded repair issued to `fable-execute`.

## Progressive Resources
- Ladder: `references/attribution-ladder.md`
- Example: `examples/recovering-stale-test-cache.md`
