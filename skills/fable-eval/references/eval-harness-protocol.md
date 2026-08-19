# Evaluation Harness Protocol

## Steps
1. **Freeze Baseline**: Run candidate scenarios against current unmodified state and record score.
2. **Bounded Intervention**: Make one specific modification.
3. **Run Regression Scenarios**: Assert no existing capabilities broke.
4. **Run Holdout Scenarios**: Test generalization on unseen prompts.
5. **Verdict**: Accept only if metrics improve without regression; else roll back.
