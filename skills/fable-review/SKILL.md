---
name: fable-review
description: >
  Perform an independent, evidence-grounded review of git diffs against requested specifications, architectural invariants, and code standards. Use when reviewing pull requests, inspecting code changes before merge, auditing diffs for regressions, or performing pre-commit sanity reviews — even if the user does not explicitly say "fable-review" (e.g. "review this diff", "check this PR", "critique my changes", "code review this branch"). Do NOT use for implementing fixes directly (use fable-tdd/fable-execute) or executing tests (use fable-verify).

version: 1.3.0
pack: proof
inputs:
  - implementation_diff
requires:
  - target_scope
produces:
  - review_evidence
  - review_verdict
gates:
  - grounded_diff_read
  - actionable_findings
fallback: fable-recover
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - fable-verify
  continuations:
    - fable-security
    - fable-release
  lateral_peers:
    - fable-security
  recovery: fable-recover
---

# Fable Review

Review the change as an independent engineer trying to find plausible defects, not as the implementer explaining why the patch is probably fine.

## Mission
A useful review connects a concrete line/change to a concrete failure mode. It prioritizes correctness, invariants, compatibility, lifecycle behavior, and test adequacy before style preference.

The reviewer should be skeptical without manufacturing noise.

## Activate When
- a diff/PR/implementation is ready for independent inspection;
- verification is green but human/semantic risks remain;
- repository conventions or public contracts may have been violated;
- a release/merge needs grounded review evidence.

## Do Not Activate When
- no diff or concrete change exists;
- the main task is automated execution evidence (`fable-verify`);
- the requested work is threat modeling/security specialization (`fable-security`);
- blocking behavior is already known and needs implementation (`fable-execute`).

## Review Classification
Classify the change because different diffs deserve different review depth.

| Change | Primary review focus |
| --- | --- |
| Bug fix | root cause, regression test, adjacent paths |
| New feature | contract, error states, lifecycle, compatibility |
| Refactor | invariant preservation, accidental behavior delta |
| Concurrency | ordering, shared state, cleanup, race/deadlock |
| Persistence/migration | partial failure, transactions, compatibility, rollback |
| Public API/CLI | callers, defaults, error/exit behavior, versioning |
| Dependency upgrade | changed semantics, transitive behavior, config |
| Packaging/build | exports, artifact contents, generated files, runtime entrypoints |

## Review Protocol

### Stage 1 — Reconstruct intent independently
Read:
- user/issue/card acceptance;
- diff against the correct base;
- relevant existing contracts/tests/instructions.

State the intended behavior in your own words before judging the implementation.

### Stage 2 — Read the whole diff, then trace risky changes
Do not review isolated snippets only. Identify:
- public/observable behavior delta;
- state/data-flow delta;
- control-flow/error delta;
- lifecycle/resource delta;
- concurrency delta;
- config/generated/package delta.

Trace important changes into callers/callees where a local diff cannot establish correctness.

### Stage 3 — Check invariants and failure paths
For each material change ask:
- What must remain true before/after?
- What happens on invalid input?
- What happens when dependency call fails/partially succeeds?
- Are cleanup/rollback paths complete?
- Can retries duplicate side effects?
- Can async work outlive ownership/lifecycle?
- Can old/new formats/callers coexist?

### Stage 4 — Check tests as evidence, not decoration
Ask:
- Does a test fail on the pre-fix bug/old behavior where appropriate?
- Does it exercise the real changed boundary?
- Are important negative/error/concurrency/compatibility paths missing?
- Were tests weakened/snapshots blindly updated?
- Could implementation be wrong while tests still pass?

Do not demand tests for trivial static changes when no meaningful behavior is testable.

### Stage 5 — Check scope and maintainability only after correctness
Look for:
- hidden unrelated refactors;
- duplicated logic that creates inconsistent behavior;
- new abstractions whose complexity exceeds need;
- API/config names that misrepresent semantics;
- comments/docs inconsistent with new behavior.

Avoid style-only comments unless repository rules make them blocking or they materially reduce readability/correctness.

### Stage 6 — Calibrate findings
Each finding must include:
- severity: blocking / important / suggestion;
- exact file/line or changed symbol;
- concrete failure scenario;
- why existing evidence does not rule it out;
- minimal repair direction where useful.

If you cannot describe a plausible failure mode, it is probably not a defect finding.

### Stage 7 — Produce verdict
- **APPROVE**: no blocking/important correctness issues found; remaining suggestions are optional.
- **CHANGES_REQUIRED**: at least one grounded issue can cause incorrect behavior, contract violation, or unacceptable risk.
- **INCOMPLETE**: review cannot establish correctness because required context/diff/evidence is missing.

## Decision Rules
- Never approve without reading the actual diff against a known base.
- A passing test suite lowers some risk but does not cancel a code-level defect visible in the diff.
- A suspicious pattern is not a finding until tied to a realistic failure mode.
- Missing test is blocking only when the untested behavior is material and existing evidence cannot cover it.
- For concurrency, reason about interleavings/ownership, not just whether promises are awaited.
- For error handling, trace where the error goes and what state may already have changed.
- For migrations, consider partial execution and mixed-version operation.
- For package/config changes, review the user-installed/runtime artifact path, not just source shape.
- If a blocking issue is narrow and understood, produce one repair card to `fable-execute`; if root cause is uncertain/repeated, route to `fable-recover`.

## Invariants
- Review is independent and read-only.
- Findings are grounded in changed code or directly affected contracts.
- No severity inflation to fill a quota.
- No style preference masquerades as correctness.
- Approval does not claim security proof unless security review actually ran.
- Review verdict covers the actual diff/base inspected.

## Failure Taxonomy
### Rubber stamp
Reviewer relies on tests/author summary and barely reads diff. Re-run full diff review.

### Pattern matching without failure model
Reviewer flags a pattern because it "looks bad" but cannot show impact. Investigate or drop it.

### Local-only review
Change is correct locally but breaks caller/contract/lifecycle. Trace affected boundary.

### Test deference
Reviewer assumes green tests prove all semantics. Inspect test adequacy and changed risk.

### Scope blindness
Unrelated mutation or accidental behavior change hides in a large diff. Compare against card/non-goals.

### Noise overload
Many cosmetic suggestions obscure a real defect. Prioritize by impact and remove quota-driven comments.

## Anti-Patterns
- approving based on PR description alone;
- line-by-line style commentary before understanding behavior;
- "add error handling" without naming a failing error path;
- "add tests" without naming the missing risk;
- flagging every `any`, TODO, or long function independent of change impact;
- assuming an awaited promise means concurrency is safe;
- reviewing only files changed without following a public contract to callers;
- treating absence of findings as evidence the review was deep.

## Finding Template

```text
Severity:
Location:
Changed behavior/invariant:
Failure scenario:
Why current evidence does not cover it:
Suggested bounded repair:
```

## Completion Criteria
Review completes when:
- complete relevant diff/base was read;
- intended behavior and changed risks were reconstructed;
- important invariants/error/concurrency/compatibility/test surfaces were checked as applicable;
- every reported issue has a concrete failure mode and location;
- low-value noise is removed;
- verdict is APPROVE, CHANGES_REQUIRED, or INCOMPLETE with evidence.

## Progressive Resources
- Deep guide: `references/behavioral-diff-review-playbook.md`
- Existing checklist: `references/diff-review-checklist.md`
- Example: `examples/code-review-finding.md`
