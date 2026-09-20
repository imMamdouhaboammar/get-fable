---
name: fable-prove-it
description: Use before claiming anything works, is fixed, is done, or passes; before status updates on changes you haven't run; before agreeing with someone else's claim about your work; and before state-changing commands like restarts, deletes, or config edits.
version: 1.0.0
pack: proof
inputs:
  - candidate_claim
requires:
  - terminal_access
produces:
  - calibrated_verdict
gates:
  - evidence_rung_proven
fallback: fable-verify
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - fable-execute
    - fable-tdd
  continuations:
    - fable-verify
    - fable-outcome-first
  lateral_peers:
    - fable-finish-your-turn
  recovery: fable-recover
---

# Fable Prove It

Claims require evidence you produced this session. There are three rungs: **written** (the code exists), **runs** (you executed it without error), **verified** (you watched it do the right thing). Say which rung you're on. "Should work" is rung zero wearing a suit.

## Purpose

Prevent false completion claims, optimistic rounding, unearned confidence, and placebo bugfixes. `fable-prove-it` enforces strict calibration between what was written, what was executed, and what was observed.

## When to Use

- Before claiming anything works, is fixed, is done, or passes.
- Before status updates on changes you have not yet executed.
- Before agreeing with someone else's assumption about your work.
- Before running state-changing commands (restarts, deletions, migrations, config changes).

## When NOT to Use

- Running routine automated unit tests (use `fable-verify`).
- Adversarial independent red-teaming or penetration testing (use `fable-redteam`).
- Multi-agent peer review councils (use `fable-council`).

## Inputs

- `candidate_claim`: The statement asserting a fix, feature completion, or diagnostic conclusion.
- `runtime_environment`: Available CLI tools, test runners, or staging endpoints.

## Expected Outputs

- `calibrated_verdict`: Explicit declaration of evidence rung (`written`, `runs`, `verified`).
- `machine_receipt`: Concrete command output or observable assertion proving the claim.

## Procedure

1. **Claim Only Your Rung**: "Fixed" means verified by observation. If you didn't run it, the honest claim is "written, not yet run" — in those exact words.
2. **Verification is an Action, Not an Inference**: Run the test, hit the endpoint, render the page. Re-reading your own code is not verification. Tracing paths mentally is where race conditions hide.
3. **Technically-True is Still a Lie**: "The fix is in" when you mean "merged, never run" plants a false belief with a true sentence. Name the real rung.
4. **Report Faithfully**: Failing tests reported as failing, WITH output. Skipped steps named explicitly. Partial completion stated as partial.
5. **No Optimistic Rounding**: Ban "should work now", "likely fixes it", "tests should pass". Either run it, or state plainly what was not run.
6. **Calibration Cuts Both Ways**: Verified → plain declarative, no hedge garnish. Unverified → name what specifically wasn't checked.
7. **Evidence Before Action**: Before a state-changing command, verify discriminating signals. Does evidence support THIS cause, or does the symptom merely pattern-match?
8. **Symptom Moved ≠ Fixed**: An error message changing or disappearing is not proof your change was causal. Confirm the underlying mechanism.

## Decision Rules

| Thought | Reality |
|---|---|
| "The change is simple — it obviously works" | Simple changes break builds daily. Running it costs less than being wrong about it. |
| "Tests passed before my change" | That verified the old code. |
| "'Should work' is honest hedging" | It's an unverified claim wearing hedge clothing. Name the rung instead. |
| "The lead said to just confirm it; they own the call" | They own the decision; you own the truth of your report. Give the rung, hand them accurate wording. |
| "Reporting it unverified makes me look unfinished" | The user discovering it later costs ten times more trust than the word "unverified" costs now. |
| "I recognize this incident — same fix as last time" | Recognition is a hypothesis. Check the one signal that discriminates before touching state. |

- If you did not execute the test, do not say "tests pass".
- If you ran the test and it passed, do not say "it should be fine now" — say "verified: test passed".

## Tool Policy

- Execute the test runner or verification command directly in the shell.
- Inspect exit codes and standard error before formulating status claims.
- Never use synthetic mocks when real end-to-end checks are executable.

## Evidence Requirements

- Attach exact terminal command invocations and their output (exit codes, test runner summaries).
- State the exact evidence rung for every deliverable:
  - `written`: Code authored on disk, unexecuted.
  - `runs`: Code executed without runtime syntax errors or crashes.
  - `verified`: Code behavior confirmed by passing assertions or observed side effects.

## Failure Handling

Stop and re-run or relabel when hitting these Red Flags:
- "Should work now" / "Likely fixes it" / "Tests should pass".
- Claiming verification based only on reading code diffs.
- Hiding a failing test or suppressed warning in a status update.

## Completion Criteria

- Every factual claim matches its observed evidence rung.
- Zero unverified assumptions reported as verified facts.
