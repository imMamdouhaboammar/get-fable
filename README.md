<div align="center">

<img src="assets/mascot.svg" alt="get-fable rabbit mascot" width="120" height="120"/>

# get-fable

### Make capable coding models stay capable when the task gets hard

**A model-agnostic execution runtime for substantial coding work**

Discovery before assumptions · bounded planning · durable state · evidence before done · recovery before another blind retry

[![CI](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun%201.3%2B-FBF0DF?style=flat-square&logo=bun&logoColor=14151A)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Codex · Claude Code · Antigravity / Gemini · generic Agent Skills**

</div>

## Good models still lose discipline on long tasks

A short coding request is easy to hold in context

A substantial change is different

The agent reads dozens of files, makes architectural choices, changes code, hits failures, revises assumptions, runs partial tests, and carries all of that history inside one conversation

That is where quality starts to drift

The model may be capable enough to solve the task, but the execution around it becomes unreliable

- implementation starts before important facts are resolved
- requirements disappear under tool output
- one passing test gets mistaken for product-level proof
- repeated failure produces another edit instead of a new diagnosis
- context loss turns old assumptions into new facts
- `done` becomes a judgment instead of an evidence state

`get-fable` adds the missing execution discipline around the model

It does not replace your LLM

It makes substantial work harder to do carelessly

## The core idea

A difficult coding task is not one job

```text
unknown facts
    ↓
discover
    ↓
plan
    ↓
execute
    ↓
verify
    ↓
record evidence
    ↓
complete

repeated failure
    ↓
recover
    ↓
change the diagnosis
    ↓
continue from grounded state
```

`get-fable` makes those transitions explicit

The model gets the smallest relevant contract for the current job instead of one oversized prompt asking it to remember everything at once

## What changes when get-fable is active

| Without get-fable | With get-fable |
|---|---|
| Start coding from plausible assumptions | Resolve load-bearing unknowns first |
| Keep the plan in conversation history | Persist the plan and current phase in project files |
| Treat implementation as one long pass | Work in bounded cards with explicit acceptance |
| Retry similar fixes after repeated failure | Enter recovery and change the diagnosis |
| Let the same context implement and approve | Route verification as a separate responsibility |
| Say `done` when the code looks correct | Require fresh passing evidence for substantial work |

The result is not a smarter model by claim

It is a stricter way for a capable model to work

## Six focused skills

`get-fable` uses one canonical skill graph

```text
get-fable
├── fable-discover
├── fable-plan
├── fable-execute
├── fable-verify
└── fable-recover
```

| Skill | Responsibility |
|---|---|
| `get-fable` | Choose the smallest correct workflow for the task |
| `fable-discover` | Resolve facts that can materially change the implementation |
| `fable-plan` | Turn grounded requirements into bounded work and acceptance criteria |
| `fable-execute` | Implement one accepted unit of work without scope drift |
| `fable-verify` | Try to falsify the result and collect fresh evidence |
| `fable-recover` | Diagnose repeated or stale failure before more edits |

The skills are intentionally narrow

Planning does not quietly become implementation

Implementation does not certify itself

Recovery does not begin with another patch

## Routing that can explain itself

Ask get-fable what the task needs

```bash
get-fable route "Review this diff before merge"
```

```text
Selected skill: fable-verify
Confidence: 0.9
Requires plan: NO
Reasons: task explicitly asks for adversarial verification
Next skills: fable-recover, fable-execute
```

A repeated failure routes differently

```bash
get-fable route "The same test failed twice after retrying" --json
```

The router gives recovery and verification precedence over blind execution

Its reasons are compact routing diagnostics, not private chain-of-thought

## State survives the conversation

Initialize a repository once

```bash
get-fable init
```

get-fable adds durable project state under `.fable/` and installs the canonical project skills under `.agents/skills/`

```text
.fable/
  state.json
  LEDGER.md
  PROGRESS.md
  VERIFIER_PROMPT.md

.agents/
  skills/
    get-fable/
    fable-discover/
    fable-plan/
    fable-execute/
    fable-verify/
    fable-recover/
```

The strict state is deliberately small

```text
phase
current skill
failure streak
substantial-work flag
last routing decision
evidence records
```

That gives a fresh context enough information to continue correctly without replaying an entire chat transcript

## `done` requires evidence

For substantial work, completion is a real state transition

```bash
get-fable route "Implement the requested migration" --apply
get-fable state executing

# implement and run the affected checks

get-fable state verifying
get-fable evidence pass test "bun test" "42 affected tests passed"
get-fable state complete
```

Without a substantive passing record as the newest evidence, substantial work cannot transition to `complete`. A later failure makes earlier proof stale until verification passes again.

A failure is recorded too

```bash
get-fable evidence fail runtime "smoke test" "request still returns 500"
```

Repeated failures push the workflow toward `fable-recover` instead of encouraging another near-identical edit

## Recovery is not another retry

When the same idea keeps failing, get-fable changes the question

Instead of asking `what should I edit next?`, recovery asks

1. Is the test or harness itself valid
2. Is the changed code actually running
3. Is the failure in product logic
4. What invariant would prevent this class of failure

That distinction matters in long sessions where repeated activity can look like progress

## Lifecycle enforcement for supported hosts

On hosts with hook support, get-fable can enforce parts of the workflow mechanically

| Hook | Behavior |
|---|---|
| Session start | Restore the current phase, selected skill, failure streak, and open work |
| Before large delegation | Require a bounded open card for substantial delegated work |
| After a Bash result | Reset the failure streak on success; record failures and enter recovery after two consecutive failures |
| Before stop | Reject unfinished substantial work or completion without fresh passing evidence |

The hooks are model-agnostic

They do not rank model names or pretend one model has become another

## Contextual request routing

get-fable also includes an optional local OpenAI-compatible request proxy

Instead of injecting the same large prompt into every request, it compiles context for the actual task

```text
request
  ↓
normalize intent
  ↓
route task
  ↓
core execution contract
+ selected skill
+ compact project state
  ↓
model
```

A review request receives verification guidance

A broad architecture request receives planning guidance

A repeated failure receives recovery guidance

Start locally in preview mode

```bash
get-fable serve 8080
```

Configure an upstream only when needed

```bash
export UPSTREAM_OPENAI_URL="https://your-provider.example/v1/chat/completions"
get-fable serve 8080
```

The proxy binds to `127.0.0.1` by default and is intended for controlled local use

## Works with the tools you already use

### Codex

The repository ships an OpenAI skill package plus Codex agent profiles for discovery, planning, execution, verification, recovery, review, and documentation research

### Claude Code

Install directly via Claude Code's plugin marketplace or through the get-fable CLI:

```bash
/plugin marketplace add imMamdouhaboammar/get-fable
/plugin install get-fable@get-fable
```

The installer can also add canonical skills and lifecycle hooks to the Claude configuration directory via `get-fable install`.

### Antigravity / Gemini

The installer can add the same canonical skill pack and its own hook copies to the configured Antigravity / Gemini location

### Generic agent environments

The root `skills/` directory follows a portable skill-first structure and remains the canonical source for the workflow

No host adapter owns a different version of the core behavior

## Quick start

Requires Bun 1.3 or newer

```bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable
bun install
```

Initialize the current repository

```bash
bun ./bin/get-fable.js init
```

Inspect the task router

```bash
bun ./bin/get-fable.js route "Refactor authentication across several modules"
```

Check the current installation and project state

```bash
bun ./bin/get-fable.js doctor
bun ./bin/get-fable.js status
```

Install supported global integrations when you want them

```bash
bun ./bin/get-fable.js install
```

Installation is explicit

Running get-fable without a command only shows help

## CLI

| Command | Purpose |
|---|---|
| `init` | Prepare the current repository with durable state and canonical skills |
| `route <task>` | Select and explain the correct workflow |
| `route <task> --apply` | Route the task and persist the decision |
| `state <phase>` | Move durable workflow state through a valid transition |
| `evidence ...` | Record concrete passing or failing evidence |
| `lint` | Check ledger acceptance and evidence discipline |
| `doctor` | Validate the active get-fable setup |
| `status` | Inspect installation and project state |
| `install` | Install supported global integrations |
| `install-antigravity` | Install the Antigravity / Gemini integration |
| `serve [port]` | Start the local contextual request proxy |
| `assets` | Inspect the optional reference library |

Machine-readable output is available for routing, doctor, and status where supported

## Designed for real repositories

get-fable favors conservative operational behavior

- project-owned files are not silently replaced during initialization
- malformed existing configuration is not treated as empty configuration
- substantial completion requires recorded passing evidence
- lifecycle hooks fail open on unexpected hook errors rather than trapping the user
- the local proxy binds to loopback by default
- host adapters consume the same canonical skills instead of maintaining divergent copies
- historical prompts and reference assets remain optional rather than being injected into every task

## What get-fable is, and what it is not

get-fable is execution infrastructure around an LLM

It can make planning, state retention, verification, recovery, and completion behavior more explicit and repeatable

It does not change model weights

It does not reproduce a proprietary model

It does not expose hidden reasoning

It does not guarantee correct code or benchmark equivalence with another model

The product claim is narrower and more useful

**Give a capable model better execution conditions for substantial software work**

## Documentation

- [Usage](./docs/USAGE.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Plugin package](./docs/PLUGIN.md)
- [Lifecycle hooks](./hooks/README.md)
- [Security](./SECURITY.md)
- [Third-party notices](./THIRD_PARTY_NOTICES.md)

## License

Original get-fable code is released under the [MIT License](./LICENSE)

Third-party material remains subject to its applicable source terms as described in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)
