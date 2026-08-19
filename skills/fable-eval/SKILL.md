---
name: fable-eval
description: Evaluate changes to prompts, skills, hooks, routers, memory, or agent controls against a reproducible baseline, unseen holdouts, regressions, and rollback criteria.
---

# Fable Eval

Treat agent-control changes as software changes around the model.

## Contract

1. State the observable capability gap and freeze a reproducible baseline before changing the control surface.
2. Form one causal hypothesis and make one bounded intervention.
3. Keep model, permissions, timeout, tasks, graders, and environment stable between control and candidate runs when possible.
4. Include unseen holdouts that were not used to design the intervention.
5. Reject any candidate with correctness, safety, privacy, compatibility, or rollback regression.
6. Record only bounded metrics and structured outcomes. Do not retain prompts, source contents, credentials, or raw command output in eval records.
7. Accept the candidate only when the result is reproducible and the previous state can be restored.

## Exit condition

The candidate has a baseline comparison, holdout evidence, regression result, accept/reject verdict, limits of the claim, and rollback instructions.
