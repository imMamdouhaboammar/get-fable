<div align="center">

<img src="assets/mascot.svg" alt="get-fable rabbit mascot" width="120" height="120"/>

# get-fable

### A stricter working environment for AI coding agents

[![CI](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun-FBF0DF?style=flat-square&logo=bun&logoColor=14151A)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

## Why this exists

Model capability matters, but long-running coding work also depends on what happens around the model

Tasks drift when the brief is vague, state lives only in chat history, retries repeat without diagnosis, and completion is declared without evidence

`get-fable` focuses on the part a developer can inspect and change

- project specs and task ledgers outside the chat transcript
- reusable workspace rules and skills
- lifecycle hooks for state injection, prerequisites, repeated failures, and close checks
- explicit acceptance evidence
- local installation targets for Claude Code, Antigravity / Gemini config, and Agent Kernel when present
- a small request-enrichment proxy for supported chat request shapes

It does not modify model weights and does not make one model equivalent to another

> [!IMPORTANT]
> `get-fable` is an independent community project
>
> References to Anthropic, Claude, OpenAI, GPT, Google, Gemini, Antigravity, or other projects are descriptive only unless a cited upstream source says otherwise
>
> This repository is not endorsed by or affiliated with those vendors

## The working model

`get-fable` applies six practical constraints

1. **Define the work before implementation**
2. **Keep task state in project files**
3. **Reload project rules across sessions**
4. **Treat repeated failure as a diagnostic signal**
5. **Reuse inspectable skills and agent instructions**
6. **Require observable evidence before completion**

The claim is deliberately narrow

A better execution environment can improve consistency without changing the underlying model

## What the repository currently does

| Area | Implemented behavior |
|---|---|
| Project initialization | Creates missing spec, ledger, progress, verifier, workspace skill, and workspace rule files without replacing existing targets |
| Claude Code | Installs the Fable skill and four Python lifecycle hooks, then merges hook registrations into Claude settings |
| Antigravity / Gemini config | Installs its own plugin, rules, skill copy, hook files, and hook registrations without depending on Claude hook paths |
| Agent Kernel | Copies the Fable rule when `~/.agent-kernel` already exists |
| Configuration safety | Refuses to rewrite malformed JSON configuration instead of silently replacing it |
| Asset inspection | Counts bundled prompts, agents, skills, commands, reminders, and starter components from disk |
| Request proxy | Normalizes supported `messages` and Gemini-style `contents`, injects Fable context, and optionally forwards to one HTTP or HTTPS upstream |
| Quality checks | Runs TypeScript checks, core behavior tests, site tests, a build, CLI smoke tests, and package-content inspection in CI |

Asset totals are intentionally not hard-coded in the README

Use the repository as the source of truth

```bash
bun ./bin/get-fable.js assets
```

## Quick start

### Requirements

- Bun 1.1 or newer
- Python 3 for lifecycle hooks
- Git when working from source

### Inspect first

```bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable

bun ./bin/get-fable.js status
bun ./bin/get-fable.js assets
```

Running the CLI without a command shows help and does not install anything

```bash
bun ./bin/get-fable.js
```

### Initialize one project

From the project you want to prepare

```bash
bun /path/to/get-fable/bin/get-fable.js init
```

This creates missing files under

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

Existing target files are skipped

### Install global integrations

```bash
bun ./bin/get-fable.js install
```

The supported installer targets are

```text
~/.claude/
~/.gemini/config/
~/.agent-kernel/   # only when this directory already exists
```

If an existing JSON configuration file is malformed, the installer stops rather than replacing its contents

For the Antigravity / Gemini target only

```bash
bun ./bin/get-fable.js install-antigravity
```

## Lifecycle hooks

| Event | Hook | Purpose |
|---|---|---|
| `SessionStart` | `fable_profile_inject.py` | Reintroduce project state and working rules |
| `PreToolUse` | `fable_spawn_guard.py` | Check prerequisites before selected agent or task actions |
| `PostToolUse` | `fable_fail_streak.py` | React to repeated command failures |
| `Stop` | `fable_close_guard.py` | Check unresolved work and evidence before close |

The hook files live under [`hooks/`](./hooks) and can be inspected before installation

## Local request proxy

Start it on the default loopback address

```bash
bun ./bin/get-fable.js serve 8080
```

Endpoints

```text
GET  /health
GET  /v1/health
POST /chat/completions
POST /v1/chat/completions
```

Without an upstream URL, the proxy runs in preview mode and does not call a model provider

To forward an enriched request

```bash
export UPSTREAM_OPENAI_URL="https://your-provider.example/v1/chat/completions"
bun ./bin/get-fable.js serve 8080
```

Current safety defaults

- binds to `127.0.0.1`
- CORS is off unless `FABLE_CORS_ORIGIN` is set
- request bodies are limited to 1 MiB by default
- malformed JSON returns `400`
- unsupported content types return `415`
- upstream requests time out after 30 seconds by default
- upstream URLs must use HTTP or HTTPS
- non-JSON upstream responses are passed through without forcing JSON parsing

Configurable environment variables

```text
FABLE_HOST
FABLE_CORS_ORIGIN
FABLE_MAX_BODY_BYTES
FABLE_UPSTREAM_TIMEOUT_MS
UPSTREAM_OPENAI_URL
```

> [!WARNING]
> The proxy does not implement user authentication or authorization
>
> If you deliberately bind it beyond loopback, protect it with appropriate network controls and an authenticated gateway

## Supported request shapes

OpenAI-style messages

```json
{
  "model": "example-model",
  "messages": [
    { "role": "user", "content": "Review this change" }
  ]
}
```

Gemini-style contents

```json
{
  "model": "example-model",
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "Review this change" }]
    }
  ]
}
```

This support is intentionally narrower than a complete OpenAI, Gemini, Anthropic, Ollama, or OpenRouter protocol implementation

## CLI

```text
install               Install supported global integrations
install-antigravity   Install the Antigravity / Gemini config target
init                  Create missing project-local workflow files
serve [port]          Start the local request proxy, default 8080
router [port]         Alias for serve
lint                  Verify ledger acceptance and evidence annotations
status                Report selected installation state
assets                Count bundled asset groups
prompt                Print the bundled Fable prompt
version               Print the package version
help                  Show CLI help
```

## Development

Install development dependencies

```bash
bun install
```

Run the complete local check

```bash
bun run check
```

Or run individual checks

```bash
bun run typecheck
bun test
bun test --coverage
bun run build
```

The executable under `bin/get-fable.js` is a small Bun launcher that imports the TypeScript CLI source directly

The build output is used as an additional bundling check rather than as a second hand-maintained copy of the CLI

## Project boundaries

`get-fable` does not promise to

- reproduce proprietary models or private vendor infrastructure
- expose hidden reasoning
- eliminate hallucinations or correctness failures
- configure every coding IDE or agent automatically
- provide a public authenticated model gateway
- prove that bundled community material is official vendor material

Automatic installation support and reusable file compatibility are treated as separate claims

## Upstream references and attribution

The project grew from public work around Fable Mode, Mythos routing, system prompts, and coding-agent skills

Known upstream references include

- [`cozytab/fable5-mode`](https://github.com/cozytab/fable5-mode), MIT
- [`thewaltero/mythos-router`](https://github.com/thewaltero/mythos-router), MIT
- [`asgeirtj/system_prompts_leaks`](https://github.com/asgeirtj/system_prompts_leaks), CC0 1.0 at the referenced repository

See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for attribution and licensing notes

Public model references provide context for the project name and research direction, not an endorsement of this repository

## Documentation

- [Usage](./docs/USAGE.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Architecture decision record](./docs/ADR-001-fable-supersystem.md)
- [Security policy](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)
- [Releasing](./docs/RELEASING.md)
- [Third-party notices](./THIRD_PARTY_NOTICES.md)

## License

Original `get-fable` code is released under the [MIT License](./LICENSE)

Third-party material remains subject to its applicable source terms and rights as described in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)

<div align="center">

**The model matters. The way you make it work matters too.**

</div>
