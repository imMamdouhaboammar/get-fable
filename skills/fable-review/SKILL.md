---
name: fable-review
description: Review a diff, branch, commit, or completed work card against the requested behavior and repository standards. Use when an independent review pass should challenge implementation assumptions before release.
---

# Fable Review

Review the changed reality, not the implementation story.

## Contract

1. Fix the review target: diff, branch, commit range, or changed paths.
2. Re-read the originating requirement and repository rules before judging the code.
3. Inspect every changed source file in scope and follow changed behavior into supporting code when necessary.
4. Separate spec mismatches, correctness risks, maintainability issues, and non-blocking suggestions.
5. Report findings with concrete evidence and location. Do not create findings to fill a quota.
6. When a finding requires a fix, return one bounded repair to `fable-execute` or `fable-tdd`.
7. A clean review does not replace runtime or acceptance verification.

## Exit condition

Every changed file in scope is accounted for, blocking findings are explicit, and the affected behavior can proceed to `fable-verify`, `fable-security`, or `fable-release` as required.
