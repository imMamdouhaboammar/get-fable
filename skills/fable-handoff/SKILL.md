---
name: fable-handoff
description: >
  Compact session decisions, durable evidence, open blockers, and exact next actions into structured continuation state for cross-session resumption. Use when pausing a coding session, transferring context to another agent, summarizing long-running work, or creating durable continuation checkpoints — even if the user does not explicitly say "fable-handoff" (e.g. "save context for next session", "create a handoff", "pause work here", "summarize where we left off"). Do NOT use as a substitute for verifying code changes (use fable-verify).

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

# Fable Handoff

Leave enough verified context that another agent can resume the work without replaying the whole conversation or rediscovering the repository.

## Mission
A handoff is not a summary. It is a **resumption contract**.

The receiving agent should know what was requested, what was actually changed, which claims are proven, which evidence is stale or missing, what is currently blocked, and the first safe action to take next.

## Activate When
- pausing a long-running task;
- transferring work to another agent/human/session;
- context is becoming too large and needs durable compaction;
- a release/PR remains incomplete but execution must stop;
- an automation/cowork loop needs a durable checkpoint.

## Do Not Activate When
- there is nothing durable to preserve beyond a trivial completed turn;
- the next action itself is unclear because planning/diagnosis is unfinished;
- a handoff would be used to hide missing verification or unresolved failure.

## Continuity Classification
| State | Handoff emphasis |
| --- | --- |
| Clean completed card | exact evidence + next card |
| Dirty worktree | owned vs unrelated changes + safe resume point |
| Failed attempt | reproduction, attempts, revised/remaining hypotheses |
| Review pending | diff/base, findings, verification state |
| Release pending | candidate SHA/version, channel states, external blockers |
| Research/discovery pending | measured facts, unresolved load-bearing questions |
| Delegated work pending | worker ownership, returned/missing packets |

## Protocol
### Stage 1 — Reconstruct the durable task
Capture the original/current user outcome in one concise statement. Separate it from implementation tactics discovered later.

### Stage 2 — Snapshot exact repository/work state
Record when available:
- branch/worktree and candidate commit SHA;
- active card/phase;
- files/surfaces intentionally changed;
- unrelated user changes that must be preserved;
- generated artifacts/state files intentionally not committed;
- open PR/issues/release/tag identifiers.

### Stage 3 — Separate facts, decisions, and guesses
Use distinct buckets:
- **Measured facts**: observed repository/runtime/provider evidence;
- **Decisions**: selected architecture/contract and why;
- **Inferences**: plausible but not yet proven;
- **Rejected hypotheses**: avoid repeating failed reasoning;
- **Unresolved questions**: only those that can change the next action.

### Stage 4 — Record evidence with freshness
For each important claim record:
- command/probe/source;
- result;
- relevant mutation/commit/artifact;
- whether it is **fresh**, **stale**, or **not checked**.

Never turn `NOT_CHECKED` into prose that sounds like PASS.

### Stage 5 — Record failures and attempted repairs
Include only attempts that teach the receiver something. State what was tried, what happened, and why that changed or did not change the hypothesis.

### Stage 6 — State blockers precisely
A blocker must say what external fact/permission/environment is missing and what becomes possible when it is resolved.

Bad: `CI issue`.

Good: `GitHub Dependency Review fails because Dependency Graph is disabled for the repository; code/security scan itself did not report a dependency vulnerability.`

### Stage 7 — Give one next safe action
The first next action should be executable and justified by current evidence. If several actions are independent, list them after naming the primary one.

### Stage 8 — Sanitize
Do not copy secrets, tokens, private keys, raw credentials, unnecessary personal data, or giant logs. Refer to secure credential mechanisms rather than values.

## Decision Rules
- Prefer exact identifiers (branch, SHA, PR, file path, command) over narrative descriptions.
- Preserve negative knowledge: a disproved theory prevents repeated waste.
- Evidence freshness must survive compaction; old green tests cannot be summarized as current green.
- If the worktree is dirty, distinguish owned task changes from unrelated/user-owned changes.
- If next action depends on an unresolved decision, route to planning/recovery first rather than inventing a handoff action.
- Conversation history is optional context; the handoff must stand alone.
- Do not copy full logs when the error signature + command + key lines are sufficient.

## Invariants
- Handoff is truthful about what is and is not proven.
- Receiving agent can locate the exact work without guessing names/branches/files.
- Secrets are never persisted in the handoff.
- Unrelated user changes are explicitly protected.
- The next action cannot silently require context omitted from the handoff.

## Failure Taxonomy
### Narrative dump
Too much chat chronology, too little executable state. Rebuild around task/state/evidence/next action.

### False freshness
Old proof is summarized as current. Attach mutation/SHA/artifact context and downgrade stale evidence.

### Context starvation
Receiver must rediscover architecture or why a decision was made. Add the smallest load-bearing evidence/decision rationale.

### Secret leakage
Credential appears in summary/log. Remove value and reference secure source only.

### Ambiguous ownership
Dirty files are listed without saying which belong to task/user/other work. Clarify before handoff.

### Fake closure
Handoff says "done" while external gate/review/provider evidence is missing. Use explicit pending/blocker state.

## Anti-Patterns
- copying the entire conversation;
- dumping terminal output without interpretation;
- omitting failed attempts so next agent repeats them;
- saying "tests passed" without commit/mutation freshness;
- storing tokens because "the next agent will need them";
- vague next steps such as "continue fixing";
- losing user constraints/preferences that materially affect implementation;
- claiming release/publication from a prepared artifact only.

## Handoff Packet
```text
Goal:
Current branch/worktree/SHA:
Active phase/card:
Intentional changes:
Protected unrelated changes:
Measured facts:
Decisions + rationale:
Rejected hypotheses / failed attempts:
Evidence:
- claim → command/source → result → fresh/stale/not checked
Open findings/blockers:
External states (PR/CI/release/registry):
Primary next safe action:
Secondary independent actions:
Do not repeat / do not change:
```

## Completion Criteria
A handoff is complete when a zero-context receiving agent can:
- identify the exact task and repository state;
- distinguish facts/decisions/inferences;
- know which evidence is fresh;
- avoid repeating disproved attempts;
- preserve unrelated work and credentials safely;
- execute the next action without asking for missing basic context.

## Progressive Resources
- Deep guide: `references/resumability-and-context-compaction.md`
- Existing schema: `references/continuity-schema.md`
- Template: `templates/handoff-state.template.md`
- Example: `examples/cross-session-handoff.md`
