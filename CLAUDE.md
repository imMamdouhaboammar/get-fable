# CLAUDE.md — get-fable Rules for Claude Code

Version: **1.9.1** · Integration tier: **Full Lifecycle** · Skills: **42**

This file configures how Claude Code interacts with the get-fable lifecycle harness. Claude Code is a **Full Lifecycle** host — all five Python hooks are active and `fable-recover`, `fable-verify`, and `fable-close_guard` run automatically on every session.

> The authoritative behavioral rules for all agents are in [`AGENTS.md`](./AGENTS.md).  
> This file covers only Claude Code-specific hook wiring, tool mappings, and interaction patterns.

---

## Plugin registration

The get-fable plugin is declared in [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json):

```json
{
  "name": "get-fable",
  "version": "1.8.0",
  "skills": "./skills/",
  "hooks": "./hooks/hooks.json"
}
```

Install via the Claude Code Marketplace:
```
/plugin marketplace add imMamdouhaboammar/get-fable
/plugin install get-fable@get-fable
```

Or install the full lifecycle via CLI:
```bash
bun add -g get-fable
get-fable install claude
```

---

## Hook wiring — what fires and when

Hooks are declared in [`hooks/hooks.json`](hooks/hooks.json) and dispatched through `hooks/fable_hook_dispatch.py`. All hooks are **fail-open** — a broken hook does not crash the Claude session. Hooks apply only when `.fable/` exists in the project root.

### SessionStart
Three handlers fire:

| Handler | File | What it does |
|---|---|---|
| `profile` | `fable_profile_inject.py` | Restore and inject: phase, selected skill, `failureStreak`, `activeCard`, `mutationGeneration`, `verifiedGeneration`, open ledger cards |
| `event` | `fable_event_observer.py` | Write a `session_start` event to `.fable/events.jsonl` |
| `architecture` | `fable_architecture_guard.py` | Evaluate architecture vectors; inject constraints when monolith lockout applies |

### PreToolUse

| Matcher | Handler | File | What it does |
|---|---|---|---|
| `Agent\|Task\|Workflow` | `spawn` | `fable_spawn_guard.py` | Block delegation without an open ledger card |
| *(all tools)* | `event` | `fable_event_observer.py` | Log pre-use event |

### PostToolUse

| Matcher | Handler | File | What it does |
|---|---|---|---|
| `Bash` | `failure` | `fable_fail_streak.py` | Reset streak on success; increment on failure; auto-select `fable-recover` at streak >= 2 |
| `Edit\|Write\|MultiEdit\|NotebookEdit\|apply_patch` | `mutation` | `fable_mutation.py` | Advance `mutationGeneration` |
| *(all tools)* | `event` | `fable_event_observer.py` | Log post-use event |

### PostToolUseFailure

| Matcher | Handler | File | What it does |
|---|---|---|---|
| `Bash` | `failure` | `fable_fail_streak.py` | Increment failure streak; route to `fable-recover` at streak >= 2 |
| `Edit\|Write\|MultiEdit\|NotebookEdit\|apply_patch` | `mutation` | `fable_mutation.py` | **Advance `mutationGeneration` even on failure** — a failed write may have partially changed the workspace |
| *(all tools)* | `event` | `fable_event_observer.py` | Log failure event |

### Stop (session end)

Three handlers fire in order:

| Handler | File | What it does |
|---|---|---|
| `close` | `fable_close_guard.py` | **Block** if: open cards, stale proof, substantial work not at `complete`, pending mutation tokens present |
| `event` | `fable_event_observer.py` | Write `session_end` event |
| `learn` | `fable_session_learn.py` | Extract learnings into `.fable/learnings.json` |

### What the Stop handler blocks

Claude **cannot terminate a session** when:
- Any ledger card in `.fable/LEDGER.md` is marked in-progress (`[/]`) or open (`[ ]`)
- `verifiedGeneration < mutationGeneration` (stale proof)
- Phase is `executing` or `verifying` with `substantial: true` and no fresh passing evidence
- `.fable/pending-mutations/` contains unreconciled tokens

To unblock:

```bash
# Record fresh evidence
bun ./bin/get-fable.js evidence pass test "bun test" "all tests pass"

# Or explicitly clear a card if scope was reduced
bun ./bin/get-fable.js card --clear

# Or transition to complete if all gates are green
bun ./bin/get-fable.js state complete
```

---

## What Claude Code must do

### At session start
1. Read the profile injected by `fable_profile_inject.py` — do not ask for lifecycle state.
2. If `failureStreak >= 2` is in the context, open with `fable-recover`. Do not proceed with product edits.
3. If `verifiedGeneration < mutationGeneration` is in the context, verify before any further mutation.
4. If `fable-architecture` constraints are injected, do not scaffold a monolith and enforce the prescribed transport and language matrix.

### During work
1. Route every task: `bun ./bin/get-fable.js route "<task>" --json-v1`
2. Do not load all 29 skills into context — use only the selected specialist.
3. After every write to the workspace, expect `mutationGeneration` to advance. Previously recorded evidence is stale.
4. If `Bash` fails twice for the same root cause, do not attempt a third repair. Route to `fable-recover`.
5. Do not call `Agent`, `Task`, or `Workflow` without an open ledger card.

### Before stopping
1. All ledger cards must be cleared or at `[x]` (completed).
2. Fresh passing evidence must exist for the current `mutationGeneration`.
3. Run `bun ./bin/get-fable.js doctor --json-v1` — no error-severity checks.
4. Run `bun ./bin/get-fable.js status --json-v1` — confirm `phase: complete` or `phase: idle` for non-substantial sessions.

---

## Tool → event mapping

| Claude Code tool | Lifecycle event | Hook triggered |
|---|---|---|
| `Bash` (success) | `PostToolUse` | `failure` handler — resets streak |
| `Bash` (failure) | `PostToolUseFailure` | `failure` handler — increments streak |
| `Edit` | `PostToolUse` or `PostToolUseFailure` | `mutation` handler |
| `Write` | `PostToolUse` or `PostToolUseFailure` | `mutation` handler |
| `MultiEdit` | `PostToolUse` or `PostToolUseFailure` | `mutation` handler |
| `NotebookEdit` | `PostToolUse` or `PostToolUseFailure` | `mutation` handler |
| `apply_patch` | `PostToolUse` or `PostToolUseFailure` | `mutation` handler |
| `Agent` / `Task` / `Workflow` | `PreToolUse` | `spawn` handler — card check |
| *(any tool)* | `PreToolUse` | `event` handler — logs event |
| *(any tool)* | `PostToolUse` | `event` handler — logs event |
| Session terminated | `Stop` | `close` + `event` + `learn` handlers |

---

## State commands — Claude Code usage

```bash
# Check current phase, skill, and generation gap
bun ./bin/get-fable.js status --json-v1

# Run 42 system checks
bun ./bin/get-fable.js doctor --json-v1

# Route the current task and get selected specialist
bun ./bin/get-fable.js route "<task description>" --json-v1

# Declare a work card
bun ./bin/get-fable.js card "Implement X with acceptance criterion Y"

# Record evidence
bun ./bin/get-fable.js evidence pass test "bun test" "all 47 tests pass"
bun ./bin/get-fable.js evidence pass build "bun run build" "build clean"

# Advance mutation generation manually (if bypassing a known safe write)
bun ./bin/get-fable.js mutation "manual-state-write"

# Check ledger lint
bun ./bin/get-fable.js lint
```

---

## Architecture guard behavior

When `fable_architecture_guard.py` fires at `SessionStart`:

1. Reads `arch-eval` output from `.fable/arch-manifest.json` if present.
2. If composite score >= 7.0: injects `allowMonolith: false` constraint into the session context.
3. Claude Code must not scaffold a single-process monolith when this constraint is active.
4. Transport contract (ADR 0007) is injected: North-South = REST, East-West = gRPC.
5. Language matrix is injected: Claude must not propose a language outside the prescribed matrix for the current workload profile.

To run a fresh evaluation:

```bash
bun ./bin/get-fable.js arch-eval "Your project specification here"
# Output is written to .fable/arch-manifest.json and displayed as TOON/JSON
```

---

## Security rules specific to Claude Code

### What Claude Code must never do

- Write API keys, tokens, bearer credentials, or secrets into any file — including test fixtures, `.env` examples, config defaults, and commit messages.
- Use `bash -c "... | base64 -d | bash"` or equivalent eval-of-downloaded-content patterns.
- Call `Agent`, `Task`, or `Workflow` with a payload that includes session tokens, file paths outside the project root, or credentials.
- Accept a `$CLAUDE_PLUGIN_ROOT` redirection that escapes the expected plugin directory.
- Execute `redteam scan` commands against targets that have not been explicitly scoped in `.fable/redteam-scope.json`.

### Secret hygiene
Claude Code sessions inherit secrets from the shell environment. When working on code that handles external API calls or auth flows, verify that no credential is reflected into:
- Evidence detail fields
- Ledger card descriptions
- `.fable/events.jsonl`
- Commit messages

---

## Multi-session continuity

When resuming after a prior session:

1. The `fable_profile_inject.py` hook restores compact state at `SessionStart`.
2. If `phase != idle` and `substantial: true`, the session is mid-work — do not restart from scratch.
3. Check `mutationGeneration` vs `verifiedGeneration`. If stale, verify before any new mutation.
4. Open ledger cards from the prior session are re-injected. Address them before accepting new work.
5. If no `.fable/state.json` exists: run `bun ./bin/get-fable.js init` to initialize.

To explicitly create a handoff before closing:

```bash
bun ./bin/get-fable.js route "handoff current work"
# fable-handoff selected
# Follow handoff instructions to produce continuation state
bun ./bin/get-fable.js evidence pass handoff "session-end" "handoff complete — next: <action>"
```

---

## Failure recovery quick reference

```
Symptom: same Bash error 2+ times
Action:  bun ./bin/get-fable.js route "diagnose repeated failure"
         -> fable-recover selected automatically by fable_fail_streak.py

Symptom: Stop hook blocked "stale proof"
Action:  bun ./bin/get-fable.js evidence pass test "bun test" "<results>"

Symptom: Stop hook blocked "open ledger card"
Action:  bun ./bin/get-fable.js card --clear   # only if scope was genuinely removed
         OR complete the card first

Symptom: Stop hook blocked "pending mutations"
Action:  bun ./bin/get-fable.js status --json-v1  # check pending token count
         bun ./bin/get-fable.js lint               # check for reconciliation errors

Symptom: Architecture guard injected allowMonolith: false
Action:  Decompose into microservices per the injected language matrix
         Use REST (external) and gRPC (internal) transport boundaries
```

---

## Related files

| File | Purpose |
|---|---|
| `AGENTS.md` | Authoritative agent rules for all 29 skills, state machine, and evidence protocol |
| `hooks/hooks.json` | Full Claude Code hook declaration |
| `hooks/fable_hook_dispatch.py` | Universal dispatcher for all hook events |
| `hooks/fable_profile_inject.py` | Session context injection |
| `hooks/fable_close_guard.py` | Stop handler — completion guard |
| `hooks/fable_fail_streak.py` | Failure detection and recovery routing |
| `hooks/fable_mutation.py` | Mutation generation tracking |
| `hooks/fable_spawn_guard.py` | Delegation guard |
| `hooks/fable_architecture_guard.py` | Architecture constraint enforcement |
| `hooks/fable_session_learn.py` | Session learning extraction |
| `hooks/README.md` | Full hook contract and safety rules |
| `.claude-plugin/plugin.json` | Claude Code plugin manifest |
| `.claude-plugin/marketplace.json` | Marketplace metadata |
| `skills/get-fable/registry.json` | Canonical skill registry |
| `docs/USAGE.md` | CLI usage guide |
| `CHANGELOG.md` | Release history |
