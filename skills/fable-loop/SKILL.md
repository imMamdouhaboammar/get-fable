---
name: fable-loop
description: Run tasks, test suites, or polling loops on a recurring interval or self-paced cycle until success or bounded termination.
---

# fable-loop

Specialist skill for executing recurring verification, continuous integration polling, and bounded test-retest cycles.

## When to Use
- Babysitting long-running PRs, build jobs, deployments, or test suites.
- Setting up bounded polling intervals (e.g. "poll deployment status every 30s").
- Running iterative loops with explicit budget and timeout constraints.

## Core Rules & Invariants
1. **Bounded Budgets & Timeouts**:
   - Every loop must have an explicit maximum iteration count and timeout budget.
   - Never loop infinitely without exponential backoff or user intervention thresholds.
2. **Termination Conditions**:
   - Exit immediately upon success or when an unrecoverable failure is detected.
   - Emit clear state summaries at each cycle.
