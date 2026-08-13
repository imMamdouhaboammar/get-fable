---
name: get-fable
description: Route substantial software tasks through get-fable's planning, execution, verification, and recovery workflows. Use when the user explicitly asks for get-fable, Fable Mode, rigorous execution with durable task state, or when a repository already contains an active .fable directory for the task.
---

# get-fable

Use this skill as the entry point. It coordinates process, not model identity.

## Core rule

Choose the smallest workflow that makes the result inspectable. Do not add ceremony to a trivial change.

## Routing graph

```text
request
  |
  +-- unclear scope / multi-file design / risky change -> $fable-plan
  |
  +-- accepted bounded task --------------------------> $fable-execute
  |                                                       |
  |                                                       v
  +---------------------------------------------------- $fable-verify
  |                                                       |
  |                           failure / drift / repeated rejection
  |                                                       v
  +---------------------------------------------------- $fable-recover
                                                          |
                                                          +--> plan again when assumptions changed
                                                          +--> execute again when diagnosis is stable
                                                          +--> verify again after the final fix
```

This graph is the plugin's routing contract. Do not invent hidden handoffs or pretend that one skill invoked another unless the host actually supports that action. When automatic skill delegation is unavailable, follow the target skill's procedure inline.

## Durable state

When the task is substantial and the project is initialized for get-fable:

- `docs/SPEC.md` holds requirements, constraints, decisions, and acceptance criteria
- `.fable/LEDGER.md` holds current task cards and concrete evidence
- `.fable/PROGRESS.md` holds concise state needed to resume work

Do not overwrite project-owned versions of these files merely to normalize formatting.

## Completion contract

A task is complete only when:

1. the requested behavior exists
2. relevant acceptance checks actually ran
3. failures are either fixed or reported precisely
4. final claims match the evidence available in the current run

Use `$fable-verify` before a completion claim on non-trivial work.
