---
name: fable-handoff
description: Compact decisions, evidence, blockers, and the exact next action into durable continuation state. Use when pausing, transferring context, or ending an engineering session.
version: 1.3.0
pack: delivery
inputs:
  - current_state
requires:
  - session_context
produces:
  - handoff_evidence
  - continuation_state
gates:
  - next_action_explicit
fallback: get-fable
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - fable-release
    - fable-loop
  continuations:
    - get-fable
  lateral_peers:
    - fable-memory
  recovery: fable-recover
---

# fable-handoff

Context compaction and cross-session continuity specialist.

## Purpose
Preserve essential technical decisions, verification status, and the single next action for resuming agents without token bloat.

## When to Use
- Ending or pausing a multi-step engineering session.
- Transferring context between different AI agents or human teammates.
- Compacting large conversation histories into a durable record.

## When NOT to Use
- Writing application features (use `fable-execute`).
- Generating marketing release notes (use `fable-release`).

## Inputs
- **`current_state`**: Active `.fable/state.json` and session progress.

## Expected Outputs
- **`handoff_evidence`**: Typed handoff record.
- **`continuation_state`**: High-density summary with explicit next command.

## Procedure
1. Summarize completed achievements and active work card.
2. Record key architectural decisions made to avoid rediscovery.
3. List open blockers or prerequisites.
4. Formulate exactly one explicit, machine-checkable next action.

## Decision Rules
- Exclude raw command transcripts and large file dumps from handoff text.
- Handoff notes must be actionable by an agent starting with zero conversation memory.

## Tool Policy
- Write handoff summaries to `.fable/PROGRESS.md` or output directly.

## Evidence Requirements
- One explicit next action command with defined prerequisite state.

## Failure Handling
- If the next step is ambiguous, route to `fable-plan` to define a clean card.

## Completion Criteria
- Durable handoff record created; next agent can resume immediately.

## Progressive Resources
- Schema: `references/continuity-schema.md`
- Template: `templates/handoff-state.template.md`
- Example: `examples/cross-session-handoff.md`
