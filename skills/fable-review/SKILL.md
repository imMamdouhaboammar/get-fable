---
name: fable-review
description: Review the actual diff against requested behavior and repository standards independently from implementation. Use for code review, diff audit, standards compliance, or PR readiness.
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

Independent code review and diff inspection specialist.

## Purpose
Audit implementation diffs for correctness risks, maintainability issues, standards conformance, and unrequested side effects.

## When to Use
- Reviewing pull requests, git diffs, or newly implemented features.
- Auditing changes against repository style guides and architecture contracts.
- Conducting pre-commit sanity and quality checks.

## When NOT to Use
- Running automated test suites (use `fable-verify`).
- Threat modeling security boundaries (use `fable-security`).

## Inputs
- **`implementation_diff`**: Target git diff or file changes to audit.

## Expected Outputs
- **`review_evidence`**: Itemized review findings with exact file and line references.
- **`review_verdict`**: Clear approval or itemized change requests.

## Procedure
1. Inspect the full `git diff` against the base branch.
2. Verify alignment with originating requirements.
3. Check error handling, edge cases, type safety, and memory management.
4. Categorize findings into blocking defects and non-blocking suggestions.

## Decision Rules
- Findings must be grounded in specific lines and concrete failure modes.
- Do not manufacture low-value cosmetic complaints to fill a quota.

## Tool Policy
- Use `git diff` and file inspection tools; do not modify source code directly.

## Evidence Requirements
- File and line citations for all reported issues.

## Failure Handling
- If blocking issues are identified, return one bounded repair card to `fable-execute`.

## Completion Criteria
- All modified files in scope are audited and blocking findings are resolved.

## Progressive Resources
- Checklist: `references/diff-review-checklist.md`
- Example: `examples/code-review-finding.md`
