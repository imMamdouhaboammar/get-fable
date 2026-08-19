---
name: fable-spark
description: Situational awareness micro-policy predicting the smallest atomic next move without scope drift. Use when determining the next move after mutations, test passes, failures, or state transitions.
version: 1.2.0
pack: system
inputs:
  - current_state
requires:
  - situational_context
produces:
  - spark_suggestion
gates:
  - minimal_action_tested
fallback: get-fable
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - get-fable
    - fable-cowork
  continuations:
    - get-fable
  lateral_peers:
    - get-fable
  recovery: fable-recover
---

# fable-spark

Situational awareness micro-policy and atomic next-move predictor.

## Purpose
Determine the smallest, most natural next move from current state and evidence without expanding scope or inventing unrequested goals.

## When to Use
- Evaluating what action should immediately follow a code edit, test run, or state transition.
- Identifying missing gates before claiming completion.
- Deciding whether to output a proactive suggestion or remain silently on standby.

## When NOT to Use
- Full multi-file architectural planning (use `fable-plan`).
- Writing application code (use `fable-execute`).

## Inputs
- **`current_state`**: State object containing `phase`, `mutationGeneration`, `verifiedGeneration`, `failureStreak`.

## Expected Outputs
- **`spark_suggestion`**: Minimal atomic next action string or `null` (silence).

## Procedure
1. Check failure streak: if `failureStreak >= 2`, suggest "diagnose the repeated failure".
2. Check mutation delta: if `mutationGeneration > verifiedGeneration`, suggest "run the affected tests".
3. Check missing gates on active skill.
4. If idle or complete with no pending work, output silence (`silent: true`).

## Decision Rules
- If the suggestion would not be immediately obvious to a senior engineer, stay silent.
- Ground predictions in concrete state variables, never in speculative goals.

## Tool Policy
- Evaluate state via `get-fable spark --json`.

## Evidence Requirements
- Computed suggestion with reason code and confidence score >= 0.85.

## Failure Handling
- On ambiguous context, default to silence (`silent: true`, `suggestion: null`).

## Completion Criteria
- Next move identified or silence policy enforced.

## Progressive Resources
- Next-Move: `references/next-move-policy.md`
- Silence: `references/silence-policy.md`
- Evidence: `references/evidence-and-gates.md`
- Confidence: `references/confidence-policy.md`
- Example: `examples/situational-awareness-walkthrough.md`
