# get-fable lifecycle hooks

The hooks turn selected lifecycle invariants into mechanical host behavior. They are model-agnostic and operate only inside projects that have opted in with `.fable/`.

## Safety contract

- opt in: no `.fable/` directory means no project enforcement
- project local: durable workflow state lives in `.fable/state.json`
- bounded state: do not persist prompts, source contents, command output, credentials, or raw local paths as evidence metadata
- workspace identity: schema-v2 state is bound to a digest of the canonical real project path
- unexpected hook runtime failures remain fail-open so a broken helper does not brick the host
- an existing but invalid `.fable/state.json` is a workflow error and may block a substantial completion claim

## Five hooks

| Hook | Typical event | Responsibility |
|---|---|---|
| `fable_profile_inject.py` | SessionStart | Restore phase, specialist skill, failure streak, active card, mutation generation, and verification freshness |
| `fable_spawn_guard.py` | PreToolUse on Agent/Task/Workflow | Require bounded delegated work before substantial spawning |
| `fable_fail_streak.py` | PostToolUse on Bash/command | Track repeated command failure and route sustained failure into `fable-recover` |
| `fable_mutation.py` | PostToolUse on write/edit tools | Advance `mutationGeneration` after a successful workspace mutation |
| `fable_close_guard.py` | Stop / SessionEnd where supported | Block unfinished cards, invalid state, stale proof, or substantial work that has not reached a valid complete state |

`_fable_common.py` provides shared state validation, schema-v1 migration, canonical workspace discovery, ledger parsing, atomic state writes, mutation tracking, and evidence-freshness rules.

## Mutation freshness

A successful recognized write advances the durable generation:

```text
before write
mutationGeneration = 6
verifiedGeneration = 6

after write
mutationGeneration = 7
verifiedGeneration = 6
```

The previous proof remains historical evidence but can no longer close substantial work.

`fable_mutation.py` contains its own write-tool allowlist in addition to host matchers so a host with broad PostToolUse semantics does not mark read-only commands as mutations.

## Evidence freshness

The close guard accepts completion evidence only when:

1. `verifiedGeneration >= mutationGeneration`
2. the newest evidence accepted for the routed claim and current generation exists
3. that evidence passes and contains substantive detail
4. substantial durable state is actually in phase `complete`

For normal implementation work, accepted completion kinds are test, build, runtime, review, and observation.

Security evidence can close a pure security-review job when the durable routing decision identifies that job as security work. It does not by itself close a normal feature or bug repair. If security work leads to a product mutation, the changed behavior needs fresh behavior-appropriate verification.

Research, receipt, and handoff evidence do not close the behavior-completion gate.

## Failure recovery

A failure-relevant evidence record increments `failureStreak`. Two consecutive failures move active state to:

```json
{
  "phase": "recovering",
  "currentSkill": "fable-recover",
  "substantial": true
}
```

Recovery changes the diagnosis before another repair:

```text
harness and environment
-> actual execution path
-> product logic
-> violated invariant
```

A later successful failure-relevant evidence record resets the failure streak. It does not erase the recorded history.

## Session context

The profile injector supplies compact state only:

```text
phase
selected specialist
failureStreak
substantial
mutationGeneration
verifiedGeneration
activeCard
open ledger cards
```

It does not assign model tiers or claim that the active model changed capability.

## Host adapters

`hooks/hooks.json` is the Claude Code plugin declaration. `src/installer.ts` registers equivalent hook files for the repository's Antigravity / Gemini target.

Host event names and matchers may differ, but the Python state semantics are shared. Adapter behavior should be tested whenever canonical state or evidence rules change.
