---
name: fable-release
description: Establish merge or release readiness from required quality gates and current repository state. Use after implementation and verification when preparing to ship, tag, or publish.
version: 1.3.0
pack: delivery
inputs:
  - completion_evidence
requires:
  - clean_worktree
produces:
  - release_readiness
gates:
  - required_checks_pass
  - no_blocking_findings
fallback: fable-verify
mutatesWorkspace: false
parallelSafe: false
neural_links:
  precursors:
    - fable-verify
    - fable-review
    - fable-security
  continuations:
    - fable-handoff
  lateral_peers:
    - fable-handoff
  recovery: fable-recover
---

# fable-release

Release gatekeeper and distribution readiness engine.

## Purpose
Verify that all quality gates, version numbers, package manifests, and test suites are aligned before publishing or merging.

## When to Use
- Preparing a package release, npm publish, or git tag.
- Finalizing a feature branch for merge into master.
- Verifying distribution tarball contents and semver consistency.

## When NOT to Use
- Iterating on code implementation (use `fable-execute`).
- Initial feature planning (use `fable-plan`).

## Inputs
- **`completion_evidence`**: Passing test and verification receipts from the current mutation generation.

## Expected Outputs
- **`release_readiness`**: Final release checklist report and version attestation.

## Procedure
1. Check that the working tree is clean and aligned with the base branch.
2. Confirm that all test suites, typechecks, and linters pass.
3. Validate version numbers across `package.json`, plugin manifests, and `CHANGELOG.md`.
4. Perform dry-run package bundling (`npm pack --dry-run`).

## Decision Rules
- Reject release if any test evidence is from an older mutation generation.
- Ensure all packaged assets exist and are non-empty.

## Tool Policy
- Execute packaging and version inspection commands (`npm pack --dry-run`, `get-fable doctor`).

## Evidence Requirements
- Clean `get-fable doctor --json` report and successful dry-run pack.

## Failure Handling
- If checks fail, halt release and return to `fable-verify` or `fable-execute`.

## Completion Criteria
- All release gates pass and artifacts are ready for distribution.

## Progressive Resources
- Gates: `references/release-gates.md`
- Example: `examples/release-readiness-audit.md`
