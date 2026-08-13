---
name: fable-recover
description: Recover a coding task after repeated failures, context drift, stale execution, or contradictory test evidence. Use when retrying the same fix is no longer producing new information.
---

# Fable Recover

Change the diagnosis before changing more code.

## Attribution ladder

1. **Harness**: prove the command, test driver, fixture, expectation, and environment are valid.
2. **Execution path**: prove the changed code is the code actually running. Check build output, caches, generated files, branch/worktree, and runtime selection.
3. **Product logic**: debug the implementation only after the first two layers are supported by evidence.
4. **Invariant**: state the general rule that was violated and fix that class of failure rather than one observed symptom.

## Recovery contract

- Do not repeat an unchanged failed command as if repetition were diagnosis.
- Record the new evidence and the revised hypothesis.
- If the original assumptions changed, return to `$fable-plan`.
- If the diagnosis is stable, return to `$fable-execute` with one bounded repair.
- Always return to `$fable-verify` after the repair.
