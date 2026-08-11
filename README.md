<div align="center">

<img src="assets/mascot.svg" alt="get-fable rabbit mascot" width="120" height="120"/>

# get-fable

### Process discipline for AI coding agents

Plan before code, keep work visible, and require evidence before calling a task done

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun-FBF0DF?style=flat-square&logo=bun&logoColor=14151A)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

`get-fable` packages a practical set of controls for agentic coding work: project specs, a task ledger, verification hooks, reusable skills, agent definitions, and an OpenAI-compatible request-enrichment proxy

The point is not to make one model pretend to be another

The point is to make execution easier to inspect, repeat, and verify

> [!IMPORTANT]
> `get-fable` is an independent community project and is not affiliated with, endorsed by, or sponsored by Anthropic, Google, OpenAI, Cursor, or the maintainers of referenced upstream projects
>
> Names such as `Fable 5` and `Mythos` are retained where they identify upstream community projects, source files, or compatibility conventions in this repository. They are not presented here as official Anthropic model names, product tiers, or claims of model equivalence

## Why this exists

Strong models still fail in ordinary ways

- implementation starts before the requirement is settled
- long tasks lose decisions between turns
- repeated failures produce more retries instead of a diagnosis
- work is marked complete without a test, artifact, or observable result
- useful prompts and agent instructions remain scattered across machines and tools

`get-fable` moves those checks into files, hooks, and commands that can be inspected like the rest of a codebase

## What it actually does

| Area | Current behavior |
|---|---|
| **Project discipline** | Creates a project spec, task ledger, progress file, verifier prompt, workspace skill, and workspace rules |
| **Claude Code** | Installs the Fable Mode skill and four lifecycle hooks, then adds the project rules to the Claude configuration |
| **Antigravity / Gemini config** | Installs a plugin package, skill files, and rules under `~/.gemini/config` |
| **Agent Kernel** | Copies the Fable rules when `~/.agent-kernel` already exists |
| **Asset library** | Organizes prompts, agent definitions, skills, slash-command references, reminders, MCP references, and starter components |
| **Request proxy** | Accepts an OpenAI-style chat endpoint, normalizes supported request shapes, injects context, and can forward to one configured upstream URL |
| **Inspection** | Reports installation state and enumerates the bundled assets from the repository itself |

No README table is treated as the source of truth for asset counts

Run this whenever you want the current repository counts

```bash
bun ./bin/get-fable.js assets
```

## Quick start

### Requirements

- Bun
- Python 3 for the lifecycle hooks
- Git if you clone the repository from source

### Inspect first

```bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable

bun ./bin/get-fable.js status
bun ./bin/get-fable.js assets
```

### Add the workflow to one project

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

## The workflow

The repository follows a simple idea: important agent behavior should leave evidence outside the conversation

### 1. Define the work

`docs/SPEC.md` captures the goal, approach, task cards, acceptance checks, dependencies, and decisions

### 2. Track execution

`.fable/LEDGER.md` keeps tasks and evidence visible across turns instead of relying on chat history alone

### 3. Gate risky transitions

The hooks can intervene at session start, before selected tool calls, after repeated command failures, and before the agent closes the turn

### 4. Diagnose repeated failure

The fail-streak hook changes the question from "try again" to "what class of problem is failing"

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

## Compatibility, without pretending everything is automatic

Automatic configuration currently exists for Claude Code, the repository's Antigravity / Gemini config target, and Agent Kernel when present

Other coding agents can still reuse project files, skills, rules, or the request proxy where their formats are compatible, but this repository does not claim that every IDE, provider, or model is automatically configured by the installer

That distinction is intentional

## Included material

The repository contains both original project code and material adapted or collected from public upstream repositories

Known upstream references include

- [`cozytab/fable5-mode`](https://github.com/cozytab/fable5-mode), MIT
- [`thewaltero/mythos-router`](https://github.com/thewaltero/mythos-router), MIT
- [`asgeirtj/system_prompts_leaks`](https://github.com/asgeirtj/system_prompts_leaks), CC0 1.0 at the referenced repository

See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for the project attribution and licensing notes

## Documentation

- [Usage](./docs/USAGE.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Architecture decision record](./docs/ADR-001-fable-supersystem.md)
- [Third-party notices](./THIRD_PARTY_NOTICES.md)

## Scope and non-goals

`get-fable` does not claim to reproduce a proprietary model, private service, hidden reasoning process, or official vendor product tier

It also does not claim that process controls can guarantee correctness or eliminate hallucinations

What it can do is make requirements, state, failure handling, and verification more explicit around the model you already use

## License

The original `get-fable` project code is released under the [MIT License](./LICENSE)

Third-party material remains subject to its applicable source terms and rights, as described in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)

<div align="center">

Built for people who want agent work they can inspect, not just impressive terminal output

</div>
