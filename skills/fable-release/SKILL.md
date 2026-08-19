---
name: fable-release
description: Establish merge, release, or publish readiness from current repository evidence. Use after implementation and verification when the user wants to ship, merge, tag, publish, or prepare a pull request.
---

# Fable Release

Release readiness is a claim about the current repository state.

## Contract

1. Resolve the intended delivery action and the repository's required checks.
2. Confirm that completion evidence belongs to the current mutation generation.
3. Account for blocking review and security findings required by the task.
4. Inspect the actual diff and release metadata that will be delivered.
5. Run or confirm the repository's release gate after the final mutation.
6. Keep release notes and compatibility claims proportional to observed changes.
7. If any delivery fix changes the workspace, invalidate prior readiness and return to verification.

## Exit condition

Required checks are current, blocking findings are resolved or explicitly deferred, and the exact delivery target is ready for the host's merge, tag, publish, or pull-request operation.
