---
name: fable-handoff
description: Preserve the minimum durable context needed for another session, model, or agent to continue software work safely. Use when pausing, changing agents, compacting context, or handing implementation to someone else.
---

# Fable Handoff

Preserve decisions and evidence, not conversation history.

## Contract

1. State the current outcome and active work card.
2. Record the repository state that matters: phase, selected skill, mutation generation, verification generation, and unresolved blockers.
3. Preserve accepted decisions and assumptions that would be expensive or unsafe to rediscover.
4. Link or name the evidence that supports completed claims.
5. Give exactly one concrete next action plus any prerequisite that blocks it.
6. Exclude raw transcripts, credentials, private prompts, and large command output.
7. Handoff evidence proves continuity only; it cannot close behavior, review, security, or release gates.

## Exit condition

A new agent can resume without inventing the current goal, completed work, known blockers, verification status, or next safe action.
