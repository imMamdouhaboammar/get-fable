# Skill Evaluation & Benchmarking

## Overview
Rigorous skills must be evaluated both qualitatively (reviewing outputs for nuance) and quantitatively (deterministic assertions on outputs).

## Benchmark Matrix
1. **Trigger Accuracy Evals**:
   - Positive Test Cases: Does the skill trigger when relevant keywords or intent appear?
   - Negative Test Cases: Does the skill remain silent when unrelated tasks are requested?
2. **Behavioral Correctness Evals**:
   - Input/Output schema conformity.
   - Invariant preservation (e.g. non-destructive file handling, zero hallucinated URLs).
3. **Robustness & Edge-Case Evals**:
   - Partial inputs, network errors, malformed syntax, conflicting instructions.
