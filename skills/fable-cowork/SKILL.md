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

# Fable Cowork

Carry a scoped engineering objective through multiple tool calls and lifecycle stages with minimal conversational interruption, while preserving the same safety, evidence, and scope rules as interactive work.

## Mission
Autonomy is not permission to improvise indefinitely. Cowork mode should reduce conversational overhead—not remove checkpoints, verification, stop conditions, or user intent.

The agent owns execution between meaningful boundaries. It must still stop when the task requires a new product decision, destructive authorization, unavailable external permission, or a contradiction that changes the agreed goal.

## Activate When
- the user explicitly delegates a multi-step task end-to-end;
- the objective and success criteria are clear enough to continue without routine questions;
- the work may span discovery, planning, implementation, verification, review, and handoff;
- repeated narration would add noise while tool evidence can drive progress.

## Do Not Activate When
- the job is a simple answer or one bounded edit;
- core requirements are genuinely ambiguous and different choices materially change the product;
- an external irreversible action lacks authorization;
- work must wait for a future event rather than execute now;
- autonomy would require inventing credentials, access, or user intent.

## Autonomy Classification
| Task state | Cowork posture |
| --- | --- |
| Clear bounded sequence | execute silently through evidence gates |
| Multiple independent cards | delegate with explicit ownership |
| New architecture decision emerges | stop/replan; do not choose silently if material |
| Repeated failure | enter recovery before more mutation |
| External auth/permission unavailable | stop at hard wall with exact handoff |
| Destructive/public action authorized | execute with release/security checks |
| Destructive/public action not authorized | prepare/verify only; do not perform it |

## Protocol
### Stage 1 — Lock the objective and boundaries
Before long execution, capture:
- requested outcome;
- non-goals/protected surfaces;
- authorization boundaries;
- repository/worktree state;
- acceptance evidence;
- hard stop conditions.

Do not convert a broad aspiration into unlimited scope.

### Stage 2 — Route internally by lifecycle
Use the same specialist sequence as interactive get-fable work. Cowork is an execution mode across Skills, not a replacement for discovery/TDD/recovery/review.

### Stage 3 — Work in bounded chunks
For each card/phase:
- perform the necessary tool calls;
- collect evidence immediately;
- update state/checkpoint;
- continue only if the next dependency is already authorized and determined.

Keep user-visible updates sparse but meaningful for long work: surfaced finding, changed blocker, completed milestone—not narration of every command.

### Stage 4 — Detect drift
Stop autonomous forward motion if:
- requested outcome changed;
- new architecture/product choice has material trade-offs not implied by existing intent;
- scope expands substantially;
- user-owned/unrelated work conflicts with required mutation;
- security/destructive boundary appears;
- external authentication/permission cannot be obtained safely.

### Stage 5 — Handle failures through recovery
Do not hide failure inside silent loops. Repeated similar failures route to `fable-recover`; record hypothesis changes and only resume mutation when new evidence justifies it.

### Stage 6 — Verify before declaring outcome
Run fresh, relevant verification after final mutations. For substantial work include review/security/release gates as appropriate. If a required environment cannot be exercised, report INCOMPLETE rather than converting autonomy into fabricated confidence.

### Stage 7 — Preserve resumability
For long work or any hard wall, create a handoff/checkpoint containing exact state, evidence, blockers, and next safe action.

### Stage 8 — Report outcome first
Final response should lead with what actually happened, then evidence, then remaining blockers. Do not replay the internal tool sequence.

## Decision Rules
- Autonomy reduces questions only when existing intent is sufficient; it does not authorize material product decisions that were never implied.
- Prefer progress over clarification for recoverable implementation details; prefer stopping over guessing for irreversible/security/public-contract decisions.
- Do not silently reset/overwrite unrelated user changes to make the workspace convenient.
- Long task does not justify scope expansion; create additional cards only when they are necessary to the requested outcome.
- Background-like work must still happen in the current execution context; do not promise asynchronous future completion unless a scheduling mechanism actually exists.
- If a public publish/tag/delete/migration action is outside current authorization, prepare and verify it but stop before the irreversible step.
- A final "done" requires fresh evidence; partial completion should be reported precisely when a hard wall remains.

## Invariants
- User objective and protected scope remain stable or changes are surfaced.
- All mutations still obey specialist gates.
- No blind retry loops are hidden by silent execution.
- External/destructive authorization boundaries are respected.
- Unrelated user changes and credentials remain protected.
- Long work remains resumable after interruption.
- Final claims are evidence-backed and outcome-first.

## Failure Taxonomy
### Scope drift
Agent discovers adjacent opportunities and starts implementing them. Return to required outcome/cards.

### Silent uncertainty
Agent makes a material product choice to avoid interrupting. Stop/replan when the choice is not implied by intent.

### Silent failure loop
Repeated tool failures are hidden behind autonomy. Route to recovery and surface the blocker if diagnosis cannot progress.

### Authorization wall
Required publish/delete/prod/credential action is not authorized or available. Stop at prepared state with exact next action.

### Workspace collision
Unrelated user work overlaps required files. Preserve it; coordinate/narrow rather than overwrite.

### Evidence gap
Implementation finished but required browser/provider/CI/external evidence cannot run. Report partial/incomplete, not success.

## Anti-Patterns
- "keep going no matter what" as autonomy policy;
- narrating every tool call despite cowork mode;
- asking permission for every reversible implementation detail;
- silently making a new product/architecture choice with material trade-offs;
- retrying until something turns green;
- hiding incomplete external gates behind a polished final summary;
- expanding the task because there is still token/time budget;
- promising background work that is not actually scheduled/executing.

## Cowork Checkpoint
```text
Goal / non-goals:
Authorization boundaries:
Current phase/card:
Completed outcomes:
Fresh evidence:
Protected unrelated state:
New decisions made + basis:
Failures/recovery state:
Hard blockers:
Primary next safe action:
Can continue autonomously? yes/no + why
```

## Completion Criteria
Cowork completes when:
- requested outcome is delivered or a genuine hard wall is reached;
- lifecycle gates remain intact despite reduced narration;
- no material scope/authorization decision was guessed;
- final evidence is fresh and limitations explicit;
- task can be resumed from a durable checkpoint if incomplete;
- report begins with actual outcome, not process narration.

## Progressive Resources
- Deep guide: `references/autonomy-boundaries-and-checkpoints.md`
- Existing discipline: `references/silent-execution-discipline.md`
- Example: `examples/silent-refactor-session.md`
