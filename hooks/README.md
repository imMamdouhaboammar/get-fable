# get-fable lifecycle hooks

The hooks turn a small part of get-fable's workflow contract into mechanical host behavior.

They are deliberately model-agnostic. They do not rank model names, assign synthetic capability tiers, or prevent a host from using a model because of its name.

## Safety contract

Every hook follows three rules:

- **opt in**: no `.fable/` directory means no get-fable enforcement
- **project local**: durable workflow state lives in the current project's `.fable/state.json`
- **fail open**: an unexpected hook error must not brick the host session

## Four hooks

| Hook | Event | Responsibility |
|---|---|---|
| `fable_profile_inject.py` | `SessionStart` | Inject compact workflow phase, selected skill, failure streak, and open-card context |
| `fable_spawn_guard.py` | `PreToolUse` on Agent/Task/Workflow | Require a live bounded ledger card before a large delegation |
| `fable_fail_streak.py` | `PostToolUse` on Bash | Update durable failure state and route two consecutive failures into `fable-recover` |
| `fable_close_guard.py` | `Stop` | Block unfinished cards, missing ledger evidence, missing state evidence, or substantial work whose durable phase is not `complete` |

`_fable_common.py` provides shared project discovery, ledger parsing, atomic state writes, evidence checks, and the advisory per-session failure counter.

## Durable failure recovery

When `fable_fail_streak.py` observes a command result it updates `.fable/state.json`.

A success resets the durable `failureStreak` to zero but does not silently leave an active recovery phase.

A failure increments `failureStreak`.

At two consecutive failures the hook sets:

```json
{
  "phase": "recovering",
  "currentSkill": "fable-recover",
  "substantial": true
}
```

It also injects the attribution order:

```text
harness
  -> actual execution path
  -> product logic
  -> violated invariant
```

The purpose is to stop repeated edits from masquerading as diagnosis.

## Session start context

`fable_profile_inject.py` reads the durable state and produces compact public workflow context such as:

```text
phase=recovering
failureStreak=2
substantial=true
selected=fable-recover
```

The selected workflow comes from state first, then a small legacy fallback when an old project has `.fable/` but no state file yet.

No model name is used to choose the workflow.

## Delegation gate

`fable_spawn_guard.py` does one job: keep a large delegation attached to a bounded work card.

A detailed Agent/Task/Workflow payload requires at least one open `- [ ]` ledger card.

Exemptions:

- small payloads below `FABLE_SPAWN_MIN_CHARS`, default `1500`
- forks, because they inherit the parent context
- a round explicitly paused with `PAUSED: <reason>`

There is no model ceiling or model-name ranking.

## Stop gate

The close guard checks two related sources of truth.

### Human ledger

```text
- [ ] open card
- [x] completed card -- evidence: bun test 42 passed
- [~] deferred card -- deferred: outside this round
PAUSED: unrelated user request
```

Open cards block stop.

Checked cards need substantive `evidence:` or `verified:` text.

### Strict state

For substantial work, stop is also blocked unless:

1. `.fable/state.json` contains at least one passing evidence record with concrete detail
2. durable phase is `complete`

The normal lifecycle is therefore explicit:

```bash
get-fable route "<task>" --apply
get-fable state executing
# perform the bounded work
get-fable state verifying
# run the real acceptance checks
get-fable evidence pass test "bun test" "42 affected tests passed"
get-fable state complete
```

A failed evidence record increments the durable failure streak and repeated failures move the state into recovery.

## Pause behavior

A line beginning with `PAUSED:` and a real reason suspends lifecycle enforcement for unrelated work.

A bare `PAUSED` is ignored.

State is preserved while the round is paused.

## Installation

The TypeScript installer copies these hooks into host-specific locations and registers them idempotently where that host supports lifecycle hooks.

Claude Code stores the compatibility hook copies below its `fable-mode` skill.

The Antigravity target stores hook copies inside the get-fable plugin so it does not depend on Claude paths.

Python 3 standard library is sufficient. No Python package installation is required.

## Testing

The Bun suite invokes the Python hooks directly for cross-language contract tests:

```bash
bun test test/hooks-state.test.ts
```

The test verifies durable recovery after repeated failure, evidence-gated stop, and model-agnostic session context.
