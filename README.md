<div align="center">

<img src="assets/mascot.svg" alt="get-fable rabbit mascot" width="120" height="120"/>

# get-fable

### Your coding agent did not forget how to code. It lost the job somewhere along the way.

[![CI](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun-FBF0DF?style=flat-square&logo=bun&logoColor=14151A)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Specs. Persistent task state. Lifecycle hooks. Failure handling. Evidence before done.**

</div>

## The moment this project started making sense

You give an AI coding agent a real task

Not a ten-line demo

A migration. A refactor. A bug that crosses five files. A feature with edge cases. Something that takes long enough for the conversation to become part of the problem

The first few steps look good

The brief is fresh. The intent is clear. The agent knows what it is doing

Then the session gets longer

A requirement gets buried

A failed command gets retried without changing the diagnosis

A file that mattered twenty minutes ago drops out of working context

A subtask gets marked complete because the code looks plausible

Then comes the sentence every developer has learned to distrust

> Done

But the acceptance check was never run

The task did not necessarily fail because the model suddenly became worse at coding

It failed because the work had nowhere durable to live

That is the idea behind `get-fable`

## The aha moment

### The model is only one part of the result

A coding agent also depends on the conditions around it

What was agreed before implementation

What survives after the conversation gets long

What happens after the second failed attempt

What the agent must prove before it can say the work is finished

Those things are usually invisible

`get-fable` makes them explicit and inspectable

```text
without get-fable

prompt
  ↓
implementation
  ↓
context drift
  ↓
retry
  ↓
"done"
  ↓
maybe verified


with get-fable

spec
  ↓
ledger
  ↓
implementation
  ↓
lifecycle checks
  ↓
failure handling
  ↓
evidence
  ↓
done
```

Same codebase

Same underlying model

Different working conditions

That is the product

## What changes when the work gets serious

Imagine a three-hour refactor

At the beginning, the agent has the complete brief in context

An hour later, it has opened dozens of files, run commands, made decisions, corrected mistakes, and accumulated a long conversation

Normally, the original task is now competing with everything that happened after it

With `get-fable`, the important parts are not left inside chat history alone

### 1. The job gets written down

`docs/SPEC.md` gives the work a durable definition outside the conversation

### 2. Progress becomes inspectable

`.fable/LEDGER.md` keeps tasks, acceptance checks, and evidence visible as the work moves forward

### 3. Sessions can recover context

Lifecycle hooks can reintroduce the project state and working rules when the agent starts again

### 4. Repeated failure means something

Instead of treating every failed command as an invitation to run the same idea again, the failure hook can push the workflow toward diagnosis

### 5. "Done" has a cost

The close guard checks unresolved work and missing evidence before the agent closes the task

Nothing happened to the model weights

The work simply became harder to forget, harder to fake, and easier to inspect

## What `get-fable` actually gives you

| Capability | What it changes |
|---|---|
| **Project spec** | Keeps the goal, constraints, decisions, and acceptance conditions outside chat history |
| **Task ledger** | Tracks unfinished work and the evidence attached to completed work |
| **Lifecycle hooks** | Reintroduce state, check prerequisites, react to repeated failures, and inspect close conditions |
| **Reusable skills and rules** | Keeps working instructions in files that can be reviewed and reused |
| **Local installer targets** | Configures supported Claude Code, Antigravity / Gemini, and Agent Kernel targets |
| **Request proxy** | Adds Fable context to supported chat request shapes before optional upstream forwarding |
| **Repository-wide CI** | Checks TypeScript, behavior tests, build output, CLI behavior, and package contents |

The project does not ask you to trust a hard-coded asset count

Ask the repository

```bash
bun ./bin/get-fable.js assets
```

## The shortest way to understand it

Clone the repo and inspect it before installing anything

```bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable

bun ./bin/get-fable.js status
bun ./bin/get-fable.js assets
bun ./bin/get-fable.js
```

Running the CLI with no command shows help

It does not install anything automatically

Then initialize a project

```bash
bun /path/to/get-fable/bin/get-fable.js init
```

You will get missing workflow files under

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

Existing target files are skipped rather than replaced

That is intentional

Your project files belong to your project

## Four hooks that change the rhythm of a long task

| Event | Hook | Job |
|---|---|---|
| `SessionStart` | `fable_profile_inject.py` | Reintroduce project state and working rules |
| `PreToolUse` | `fable_spawn_guard.py` | Check prerequisites before selected agent or task actions |
| `PostToolUse` | `fable_fail_streak.py` | React when command failures start repeating |
| `Stop` | `fable_close_guard.py` | Check unresolved work and missing evidence before close |

The hooks are plain Python files under [`hooks/`](./hooks)

Read them before you install them

## Global install

### Requirements

- Bun 1.1 or newer
- Python 3 for lifecycle hooks
- Git when working from source

Install the supported global integrations

```bash
bun ./bin/get-fable.js install
```

Current targets

```text
~/.claude/
~/.gemini/config/
~/.agent-kernel/   # only when this directory already exists
```

For the Antigravity / Gemini target only

```bash
bun ./bin/get-fable.js install-antigravity
```

### Configuration safety matters here

Installer code touches real user configuration

So `get-fable` refuses to treat malformed JSON as an empty config

If an existing JSON file is invalid, installation stops instead of silently replacing it

Project initialization also skips existing target files

These are small details until the tool is running against a machine you actually care about

## Local request proxy

Start the local proxy

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

Without an upstream URL, it runs in preview mode and does not call a model provider

To forward enriched requests

```bash
export UPSTREAM_OPENAI_URL="https://your-provider.example/v1/chat/completions"
bun ./bin/get-fable.js serve 8080
```

Current defaults

- binds to `127.0.0.1`
- CORS is disabled unless `FABLE_CORS_ORIGIN` is configured
- request bodies are limited to 1 MiB by default
- malformed JSON returns `400`
- unsupported content types return `415`
- oversized requests return `413`
- upstream requests time out after 30 seconds by default
- upstream URLs must use HTTP or HTTPS
- non-JSON upstream responses are passed through without forced JSON parsing

Configurable environment variables

```text
FABLE_HOST
FABLE_CORS_ORIGIN
FABLE_MAX_BODY_BYTES
FABLE_UPSTREAM_TIMEOUT_MS
UPSTREAM_OPENAI_URL
```

> [!WARNING]
> The proxy does not provide user authentication or authorization
>
> If you bind it beyond loopback, protect it with appropriate network controls and an authenticated gateway

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

This is request-shape support, not a claim of complete compatibility with every provider API

## The important boundary

`get-fable` does not make a smaller model become a larger model

It does not reproduce private provider infrastructure

It does not expose hidden reasoning

It does not guarantee correct code

It does not eliminate hallucinations

It changes something narrower and more inspectable

**How the work is defined, remembered, checked, retried, and closed**

That is enough to be useful without pretending the underlying model changed

> [!IMPORTANT]
> `get-fable` is an independent community project
>
> References to Anthropic, Claude, OpenAI, GPT, Google, Gemini, Antigravity, or other projects are descriptive only unless an upstream source explicitly establishes otherwise
>
> This repository is not endorsed by or affiliated with those vendors

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

## For contributors

Install development dependencies

```bash
bun install
```

Run the complete check

```bash
bun run check
```

Or run the pieces directly

```bash
bun run typecheck
bun test
bun test --coverage
bun run build
```

CI runs TypeScript checks, the full Bun test suite with coverage, a build, CLI smoke checks, and npm package-content inspection

The executable under `bin/get-fable.js` is intentionally small and imports the TypeScript CLI source directly through Bun

That avoids maintaining a second generated copy of the CLI beside the source

## Upstream references and attribution

`get-fable` grew from public community work around Fable Mode, Mythos routing, system prompts, and coding-agent skills

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

### The model matters.
### The conditions you make it work under matter too.

</div>
