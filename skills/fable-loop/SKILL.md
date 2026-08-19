---
name: fable-loop
description: Run bounded recurring task loops, interval polling, or self-paced test cycles with explicit timeouts. Use when monitoring CI jobs, polling deployment status, or executing periodic tasks.
version: 1.2.0
pack: system
inputs:
  - loop_condition
requires:
  - exit_criteria
produces:
  - loop_receipt
gates:
  - budget_bounded
  - exit_condition_explicit
fallback: fable-recover
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - fable-run
  continuations:
    - fable-verify
    - fable-handoff
  lateral_peers:
    - fable-run
  recovery: fable-recover
---

# fable-loop

Bounded recurring execution and interval polling engine.

## Purpose
Safely execute recurring tasks, interval health polling, and async CI monitoring within strict financial and iteration caps.

## When to Use
- Polling external deployment, build, or batch job completion.
- Running multi-iteration test stabilization loops.
- Monitoring long-running background tasks.

## When NOT to Use
- Executing single-pass immediate commands (use `fable-run` or `fable-verify`).
- Open-ended unbounded daemon processes without termination conditions.

## Inputs
- **`loop_condition`**: Command to poll and target success condition.

## Expected Outputs
- **`loop_receipt`**: Iteration log and final exit status.

## Procedure
1. Establish explicit maximum iteration limit and timeout duration.
2. Execute polling interval using non-blocking schedule tools.
3. Check exit condition on each iteration; terminate early on success.
4. Record receipt upon loop termination.

## Decision Rules
- Never initiate an infinite loop without a maximum iteration cap.
- Apply backoff between iterations to prevent API throttling.

## Tool Policy
- Use scheduler tools or controlled polling; never run raw `sleep` loops.

## Evidence Requirements
- Final iteration receipt detailing completion status and elapsed iterations.

## Failure Handling
- If timeout or max iterations reached without pass, exit with failure receipt.

## Completion Criteria
- Success exit condition met or loop gracefully terminated at budget boundary.

## Progressive Resources
- Guidelines: `references/loop-control-guidelines.md`
- Example: `examples/poll-build-job.md`
