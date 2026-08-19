---
name: fable-cowork
description: Autonomous cowork execution with silent tool chaining, outcome-first reporting, and safety boundary enforcement. Use when executing autonomous multi-step background tasks without conversational noise.
version: 1.3.0
pack: system
inputs:
  - autonomous_task
requires:
  - scoped_goal
produces:
  - autonomous_deliverable
  - outcome_summary
gates:
  - no_mid_chain_noise
  - outcome_first
fallback: fable-execute
mutatesWorkspace: true
parallelSafe: true
neural_links:
  precursors:
    - get-fable
  continuations:
    - fable-execute
    - fable-verify
    - fable-handoff
  lateral_peers:
    - fable-spark
  recovery: fable-recover
---

# fable-cowork

Autonomous cowork execution and silent tool chaining engine.

## Purpose
Execute multi-step workflows autonomously in the background, eliminate mid-chain narrative noise, and lead with outcomes in final responses.

## When to Use
- Running autonomous multi-step coding, refactoring, or auditing tasks.
- Operating in background cowork mode where conversational chatter must be suppressed.
- Delivering high-altitude, outcome-first engineering summaries.

## When NOT to Use
- Interactive brainstorming sessions requiring user feedback at every step (use `fable-plan`).
- Trivially simple one-line answers.

## Inputs
- **`autonomous_task`**: High-level engineering objective.

## Expected Outputs
- **`autonomous_deliverable`**: Fully implemented and tested code changes.
- **`outcome_summary`**: Concise, outcome-first delivery response.

## Procedure
1. Plan required tool sequence internally.
2. Execute tool calls silently without mid-chain narrative commentary ("Let me check...").
3. Synthesize findings upon completion.
4. Begin the final response with the direct outcome ("Refactored auth module; all 14 tests pass").

## Decision Rules
- Zero conversational commentary between intermediate tool calls.
- Lead the final response with the direct answer or resolution.

## Tool Policy
- Chain file editing, search, and execution tools autonomously.

## Evidence Requirements
- Clean execution receipts and verified final output.

## Failure Handling
- If a hard blocker occurs, output a single concise explanation sentence.

## Completion Criteria
- Task completed autonomously, verified, and delivered outcome-first.

## Progressive Resources
- Discipline: `references/silent-execution-discipline.md`
- Example: `examples/silent-refactor-session.md`
