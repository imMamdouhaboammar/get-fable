<div align="center">

<img src="assets/mascot.svg" alt="get-fable rabbit mascot" width="120" height="120"/>

# get-fable

### What if the model you already use could work more like a frontier model?

That question started this project

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun-FBF0DF?style=flat-square&logo=bun&logoColor=14151A)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

## The question behind get-fable

Why do everyday models fall apart on work that frontier models handle more reliably?

Raw model capability is part of the answer, but it is not the whole answer

A strong agent experience also depends on what happens around the model: how the task is framed, what context survives between turns, when implementation is allowed to start, how failures are handled, which skills are available, and what counts as proof that the work is actually finished

That led to a more useful question

> **How much of frontier-style execution can we bring to the models and coding agents we already use, without changing the model itself?**

`get-fable` is an open-source attempt to answer that question in code

It gives AI coding agents a stricter working environment built around specs, persistent task state, lifecycle hooks, reusable skills, failure handling, evidence checks, and a request-enrichment proxy

The project is inspired by the execution patterns around modern frontier agents and models, including public references such as [Claude Fable 5 / Claude Mythos 5](https://www.anthropic.com/news/claude-fable-5-mythos-5) and [GPT-5.6 Sol](https://openai.com/index/gpt-5-6/)

The goal is not to claim that a smaller model becomes one of those models

The goal is to improve the part we can actually change: **the harness around the model**

## The thesis

A model does not work alone

Give the same model a vague prompt, no durable task state, weak tool rules, and no verification requirement, and long-running work becomes fragile fast

Give it a clearer operating environment and the behavior can change substantially, even though the weights stay exactly the same

`get-fable` focuses on six practical areas

1. **Plan before implementation**
2. **Keep task state outside the chat**
3. **Carry working rules across turns**
4. **React differently when failures repeat**
5. **Make useful skills and agent instructions reusable**
6. **Require observable evidence before calling work complete**

This is the bet behind the repository

Not that every model has the same intelligence

That better execution discipline can make the model you already have more dependable on real work

> [!IMPORTANT]
> `get-fable` does not modify model weights and does not claim model equivalence with Claude Fable 5, Claude Mythos 5, GPT-5.6 Sol, or any other frontier model
>
> References to model and company names are descriptive only. `get-fable` is an independent community project and is not affiliated with, endorsed by, or sponsored by Anthropic, OpenAI, Google, Cursor, or the maintainers of referenced upstream projects

## What get-fable changes

| Area | Current behavior |
|---|---|
| **Project discipline** | Creates a project spec, task ledger, progress file, verifier prompt, workspace skill, and workspace rules |
| **Claude Code** | Installs the Fable Mode skill and four lifecycle hooks, then adds the project rules to the Claude configuration |
| **Antigravity / Gemini config** | Installs a plugin package, skill files, and rules under `~/.gemini/config` |
| **Agent Kernel** | Copies the Fable rules when `~/.agent-kernel` already exists |
| **Asset library** | Organizes prompts, agent definitions, skills, slash-command references, reminders, MCP references, and starter components |
| **Request proxy** | Accepts an OpenAI-style chat endpoint, normalizes supported request shapes, injects context, and can forward to one configured upstream URL |
| **Inspection** | Reports installation state and enumerates bundled assets directly from the repository |

The README does not hard-code asset totals as a marketing claim

Use the repository itself as the source of truth

```bash
bun ./bin/get-fable.js assets
```

## Quick start

### Requirements

- Bun
- Python 3 for the lifecycle hooks
- Git if you clone the repository from source

### Inspect before installing

```bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable

bun ./bin/get-fable.js status
bun ./bin/get-fable.js assets
```

### Add get-fable to one project

From the project you want to prepare

```bash
bun /path/to/get-fable/bin/get-fable.js init
```

This creates

```text
.fable/
  LEDGER.md
  PROGRESS.md
  VERIFIER_PROMPT.md

.agents/
  skills/fable-mode/SKILL.md
  rules/fable5-mode.md

docs/
  SPEC.md
```

Existing template targets are skipped rather than replaced

### Install the supported global integrations

```bash
bun ./bin/get-fable.js install
```

The global installer currently writes to

```text
~/.claude/
~/.gemini/config/
~/.agent-kernel/   # only when this directory already exists
```

Review those locations before running a global install on a machine with important custom agent configuration

## How the workflow behaves

### 1. Define the work

`docs/SPEC.md` captures the goal, approach, task cards, acceptance checks, dependencies, and decisions

### 2. Keep execution state visible

`.fable/LEDGER.md` keeps tasks and evidence outside the conversation, so a long job does not depend entirely on chat history

### 3. Gate important transitions

The hooks can intervene at session start, before selected tool calls, after repeated command failures, and before the agent closes the turn

### 4. Treat repeated failure as a different problem

The fail-streak hook shifts behavior away from blind retries and toward identifying what class of failure is actually happening

### 5. Close with evidence

The close guard checks for unfinished ledger items and missing evidence annotations before completion

## Lifecycle hooks

| Event | Hook | Purpose |
|---|---|---|
| `SessionStart` | `fable_profile_inject.py` | Reintroduce project state and working rules |
| `PreToolUse` | `fable_spawn_guard.py` | Check prerequisites before selected agent or task actions |
| `PostToolUse` | `fable_fail_streak.py` | React to repeated command failures |
| `Stop` | `fable_close_guard.py` | Check unresolved work and evidence before close |

The hooks are plain Python files under [`hooks/`](./hooks), so their behavior can be reviewed before installation

## Request proxy

Start the proxy

```bash
bun ./bin/get-fable.js serve 8080
```

The current endpoint is

```text
POST /v1/chat/completions
```

The proxy can normalize request bodies that use either a `messages` array or a Gemini-style `contents` array, then prepend the configured Fable prompt context

To forward the enriched request, set one upstream URL

```bash
export UPSTREAM_OPENAI_URL="https://your-provider.example/v1/chat/completions"
bun ./bin/get-fable.js serve 8080
```

Without `UPSTREAM_OPENAI_URL`, the server returns an enrichment preview instead of calling a model provider

> [!WARNING]
> The router is a development utility, not a hardened public gateway. The current implementation uses permissive CORS and does not provide its own authentication or authorization boundary. Do not expose it to an untrusted network without your own access controls

## Compatibility without fake universality

Automatic configuration currently exists for Claude Code, the repository's Antigravity / Gemini config target, and Agent Kernel when present

Other coding agents can reuse project files, skills, rules, or the request proxy where their formats are compatible, but this repository does not claim that every IDE, provider, or model is automatically configured by the installer

That distinction matters

## Where the Fable name comes from

`get-fable` grew from public community work around Fable Mode, Mythos routing, agent prompts, and reusable coding-agent skills

Known upstream references include

- [`cozytab/fable5-mode`](https://github.com/cozytab/fable5-mode), MIT
- [`thewaltero/mythos-router`](https://github.com/thewaltero/mythos-router), MIT
- [`asgeirtj/system_prompts_leaks`](https://github.com/asgeirtj/system_prompts_leaks), CC0 1.0 at the referenced repository

See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for attribution and licensing notes

## What this project does not promise

`get-fable` does not reproduce a proprietary model, a private service, hidden reasoning, or a vendor's internal infrastructure

It does not guarantee correctness, eliminate hallucinations, or make a lightweight model equal to a frontier model

It changes the working conditions around the model: planning, state, context, skills, failure handling, and verification

That is a narrower claim, but it is also one we can inspect and test

## Documentation

- [Usage](./docs/USAGE.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Architecture decision record](./docs/ADR-001-fable-supersystem.md)
- [Third-party notices](./THIRD_PARTY_NOTICES.md)

## License

The original `get-fable` project code is released under the [MIT License](./LICENSE)

Third-party material remains subject to its applicable source terms and rights, as described in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)

<div align="center">

**The model matters. The way you make it work matters too.**

</div>
