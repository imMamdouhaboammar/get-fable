# Eval Harness Protocol, Baselines & Regression Control

## Purpose
Defines the formal protocol for evaluating agent behavior, system prompts, skills, and routing heuristics against deterministic benchmarks, holdout sets, and regression thresholds.

## The 3-Tier Evaluation Architecture

### Tier 1: Deterministic Static Linting
- Frontmatter schema validation: name format, version semver, description formula compliance.
- Structural completeness: existence of SKILL.md, references, examples, templates, and evals.
- Progressive disclosure validation: SKILL.md line count (<500 lines) and reference file sizes (>=1000 bytes).

### Tier 2: Benchmark Suite Execution
- Run candidate skills against a fixed set of realistic user prompts.
- Score triggering accuracy: ensure the skill fires on should-trigger queries and stays silent on should-not-trigger negatives.
- Measure execution latency and token consumption metrics.

### Tier 3: Blinded Holdout Verification
- Maintain a separate holdout dataset of tricky edge cases and adversarial queries.
- The optimization loop is blinded to holdout questions during prompt iteration.
- Gate approval: A candidate version is accepted only if the holdout pass rate does not regress compared to the baseline.

## Regression Thresholds & Rollback Invariants
- **Zero Holdout Regressions**: A change that fixes a train scenario but breaks an existing holdout case is rejected.
- **Deterministic Reproducibility**: All benchmark runs must record model parameters, temperature (0.0), and seed values.
- **Rollback Snapshot**: Always preserve the prior passing version snapshot before deploying an evaluated update.
