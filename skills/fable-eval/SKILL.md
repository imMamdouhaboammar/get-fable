---
name: fable-eval
description: Evaluate changes to prompts, skills, hooks, routers, or agent controls against baselines, holdouts, and regressions. Use when modifying agent behavior or measuring prompt quality.
version: 1.2.0
pack: evolution
inputs:
  - candidate_modification
requires:
  - reproducible_baseline
produces:
  - eval_verdict
  - regression_evidence
gates:
  - baseline_frozen
  - holdout_tested
  - rollback_defined
fallback: fable-plan
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - skill-creator
  continuations:
    - fable-plan
    - fable-execute
  lateral_peers:
    - fable-verify
  recovery: fable-recover
---

# fable-eval

Agent evaluation harness and behavioral benchmark runner.

## Purpose
Systematically measure the impact of prompt, skill, router, and hook modifications against frozen baselines and unseen holdouts.

## When to Use
- Modifying system prompts, skill instructions, or agent role descriptions.
- Tuning routing heuristics, confidence thresholds, or task classifiers.
- Benchmarking skill triggering accuracy and error rates.

## When NOT to Use
- Running ordinary application software unit tests (use `fable-verify`).
- Authoring initial skill templates from scratch (use `skill-creator`).

## Inputs
- **`candidate_modification`**: Proposed prompt, router, or skill change.

## Expected Outputs
- **`eval_verdict`**: Quantitative score comparison and accept/reject decision.
- **`regression_evidence`**: Evidence from holdout scenarios.

## Procedure
1. Record baseline benchmark scores on unmodified control prompts.
2. Apply single bounded candidate change.
3. Run regression scenarios and holdout test cases.
4. Reject candidate if any regression is observed; accept only on net improvement.

## Decision Rules
- Never accept a prompt change purely on subjective aesthetic grounds.
- Holdout evaluation scenarios must remain unseen during candidate prompt drafting.

## Tool Policy
- Run benchmark runners and eval suites in `eval/` or `skills/<id>/evals/`.

## Evidence Requirements
- Quantitative score comparison table across baseline, candidate, and holdouts.

## Failure Handling
- On regression or trigger degradation, revert immediately to baseline.

## Completion Criteria
- Eval report confirms metric improvement with zero regressions.

## Progressive Resources
- Protocol: `references/eval-harness-protocol.md`
- Example: `examples/eval-regression-run.md`
