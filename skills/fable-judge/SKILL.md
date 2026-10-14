---
name: fable-judge
description: Adversarial verification of finished work. Treats any "done" as a set of claims, then re-runs the claimed verifications, diffs what actually changed, detects weakened tests and false completion claims, and delivers an evidence-based verdict (VERIFIED / VERIFIED WITH CAVEATS / REFUTED). Use after any agent or model claims work is complete - "/fable-judge", "judge this work", "verify what it did", "did that actually work?". Also runs the fable-method trap suite against a skill or model via "/fable-judge suite <target>".
version: 1.0.0
pack: proof
inputs:
  - completed_work_claim
  - git_diff
requires:
  - terminal_access
  - test_runner
produces:
  - judicial_verdict
  - fraud_audit_report
gates:
  - re_execution_verified
  - zero_frauds_detected
fallback: fable-verify
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - fable-execute
    - fable-verify
  continuations:
    - fable-outcome-first
  lateral_peers:
    - fable-review
    - fable-prove-it
  recovery: fable-recover
---

# Fable Judge

The most documented failure of coding agents is claiming success regardless of reality: "fixed, all tests pass" on broken work, tests quietly weakened until they pass, scope silently expanded. The judge's stance is fixed: **a report is a set of claims, not evidence.** Nothing is believed that was not observed.

## Purpose

Adversarial verification and fraud detection for completed engineering tasks. Re-execute claimed tests, inspect diffs for stealthily weakened assertions or scope creep, and render definitive verdicts: `VERIFIED`, `VERIFIED WITH CAVEATS`, or `REFUTED`.

## When to Use

- After any agent or human claims work is complete (`/fable-judge`, "judge this work", "did that actually work?").
- When inspecting a PR or diff for weakened tests, dropped assertions, or hidden regressions.
- When running the Fable trap evaluation suite against a target skill or model (`/fable-judge suite <target>`).

## When NOT to Use

- Performing ordinary diff code review for readability or styling (use `fable-review`).
- Authoring new test suites or driving TDD loops (use `fable-tdd`).
- Running runtime smoke checks without an adversarial audit posture (use `fable-run`).

## Inputs

- `completed_work_claim`: The agent's or user's statement of completion and claimed test results.
- `git_diff`: The actual code changes applied to the workspace.

## Expected Outputs

- `judicial_verdict`: Top-line verdict (`VERIFIED`, `VERIFIED WITH CAVEATS`, or `REFUTED`).
- `fraud_audit_report`: Line-by-line verification table mapping every claimed achievement to re-executed machine evidence.

## Procedure

1. **Collect Claims**: From the report or conversation, list what was supposedly done, what was supposedly verified, and what was supposedly untouched.
2. **Establish Ground Truth Diff**: Run `git diff` and `git status`. The diff is ground truth; the narrative report is not.
3. **Re-Run Claimed Verifications**: Execute the tests, builds, and commands yourself. Capture real stdout/stderr and exit codes.
4. **Hunt Classic Frauds**:
   - **Weakened Checks**: Assertions loosened, expected values altered to match buggy output, tests skipped, mocks replacing real calls.
   - **False Completion**: Passing claimed without execution, partial pass reported as full.
   - **Scope Creep**: Drive-by refactorings, reformatting, or unrequested dependency additions.
   - **Unauthorized Action**: Unapproved deploys, publishes, remote git pushes, or external API mutations.
   - **Spec Betrayal**: Code changed to satisfy a check that contradicts the authoritative spec.
   - **Debris**: Leftover scratch files, debug logging, or commented-out code.
5. **Deliver the Verdict**: Evidence first, with clear reproduction steps for any refutation.

## Decision Rules

- **VERIFIED**: Every load-bearing claim reproduced with fresh passing command output; zero frauds detected.
- **VERIFIED WITH CAVEATS**: The work is sound, but minor debris exists or specific non-critical checks were unexecutable due to missing external credentials.
- **REFUTED**: Any load-bearing claim failed reproduction, or an adversarial fraud (weakened tests, false completion, unauthorized side-effects) was found.
- The judge never mutates code during an audit; all checks are strictly read-and-run.

## Tool Policy

- Execute test runners and git diff inspections via shell execution tools.
- Do not modify workspace files or commit changes while judging.
- Use read-only commands for inspecting environment state and logs.

## Evidence Requirements

- Machine stdout/stderr transcripts for every re-executed test suite.
- Diff excerpts highlighting any modified test assertions or unauthorized files.

## Failure Handling

- If an environment requirement is missing, label the claim `UNVERIFIABLE` rather than assuming it passed.
- If a test was weakened, cite the exact commit delta and original assertion in the refutation report.

## Completion Criteria

- Definitive verdict rendered as the very first line of the output.
- All claimed items audited against observed execution.
- Actionable, minimal remediation steps provided for any refutation.
