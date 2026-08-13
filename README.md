<div align="center">

<img src="assets/mascot.svg" alt="get-fable rabbit mascot" width="120" height="120"/>

# get-fable

### Make the model you already use behave with stricter execution discipline

[![CI](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun-FBF0DF?style=flat-square&logo=bun&logoColor=14151A)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Evidence first. Bounded work. Durable state. Verification before done. Recovery before another blind retry.**

</div>

## The problem is not always the model

Give a coding agent a ten-line task and almost any competent model can look disciplined

Give it a three-hour refactor and different failures appear

The original requirement gets buried under file reads and tool output

Architecture starts before the important unknowns are resolved

A narrow test passes and gets mistaken for proof that the product path works

The same broken idea gets retried with slightly different edits

Eventually the agent says `done` because the implementation looks plausible, not because the requested behavior was actually verified

That is the part `get-fable` targets

It does not replace the model

It changes the execution conditions around the model

## The aha moment

A long coding task is not one decision

It is a sequence of different jobs

```text
unknown facts
    ↓
discovery
    ↓
bounded plan
    ↓
implementation
    ↓
adversarial verification
    ↓
evidence
    ↓
complete

failure or stale execution
    ↓
recovery
    ↓
new diagnosis
    ↓
execute or plan again
```

A single giant prompt asks one model to remember all of those jobs at once

`get-fable` 1.1 turns them into explicit workflow contracts with machine-readable routing and durable state

## What changed in 1.1

The project now has a canonical six-skill workflow instead of treating a large prompt and a broad skill archive as the runtime

```text
skills/
  registry.json
  get-fable/
  fable-discover/
  fable-plan/
  fable-execute/
  fable-verify/
  fable-recover/
```

`skills/registry.json` is the source of truth for ordering and transitions

`get-fable` is the entry point

The specialists have deliberately narrow responsibilities

| Skill | Job |
|---|---|
| `get-fable` | Decide which workflow is actually needed |
| `fable-discover` | Resolve load-bearing facts before architecture |
| `fable-plan` | Turn grounded requirements into bounded cards and acceptance criteria |
| `fable-execute` | Implement one accepted card without scope drift |
| `fable-verify` | Try to falsify the result and collect fresh evidence |
| `fable-recover` | Diagnose repeated or stale failure before another edit |

Historical prompts, design skills, agent definitions, and reference material remain available under `assets/`

They are no longer the default runtime workflow

## Routing you can inspect without an LLM call

```bash
get-fable route "Review this diff before merge"
```

Example shape

```text
Selected skill: fable-verify
Confidence: 0.9
Requires plan: NO
Reasons: task explicitly asks for adversarial verification
Next skills: fable-recover, fable-execute
```

Machine output is available too

```bash
get-fable route "The same test failed twice after retrying" --json
```

The routing rules are intentionally opinionated

Repeated failure selects recovery before another edit

Review and completion proof select verification

Unknown repository or current documentation facts select discovery

Architecture, migrations, and broad refactors select planning

A bounded concrete edit selects execution

The router exposes reasons and scores for diagnostics

It does not expose private chain-of-thought

## Durable state outside the conversation

Initialize a project

```bash
get-fable init
```

The project receives missing workflow files such as

```text
.fable/
  state.json
  LEDGER.md
  PROGRESS.md
  VERIFIER_PROMPT.md

.agents/
  skills/
    registry.json
    get-fable/SKILL.md
    fable-discover/SKILL.md
    fable-plan/SKILL.md
    fable-execute/SKILL.md
    fable-verify/SKILL.md
    fable-recover/SKILL.md
    fable-mode/SKILL.md
  rules/fable5-mode.md

docs/
  SPEC.md
```

Existing project-owned files are skipped rather than replaced

### `.fable/state.json`

The JSON state is not a transcript

It contains the minimum strict state needed for the workflow to know where the task stands

```text
schema version
phase
current skill
failure streak
last routing decision
evidence records
updated timestamp
```

Valid phases include

```text
idle
discovering
planned
executing
verifying
recovering
complete
blocked
```

Invalid transitions are rejected

For substantial work, the state machine refuses `complete` unless passing evidence exists

## Evidence is a state transition, not a compliment

The old failure mode is easy to recognize

```text
implementation looks plausible
        ↓
"should work"
        ↓
done
```

The new contract is stricter

```text
implementation
    ↓
focused acceptance check
    ↓
adversarial verification
    ↓
real affected path
    ↓
recorded passing evidence
    ↓
complete
```

`get-fable lint` checks both the human-readable ledger and strict state

```bash
get-fable lint
```

It can reject

- an open card with no acceptance condition
- a closed card with no substantive evidence
- invalid state JSON
- substantial work marked complete without passing evidence
- repeated failure left in execution instead of recovery

## Recovery changes the diagnosis before the code

When an edit fails repeatedly, get-fable checks attribution in this order

1. Is the harness valid
2. Is the changed code actually running
3. Is the product logic wrong
4. What invariant would prevent this class of failure

That sounds obvious until a long coding session starts patching the same symptom for the fourth time

The recovery workflow exists to make that loop explicit and interruptible

## The proxy no longer injects one giant prompt into every request

The local request proxy now compiles context per task

```text
incoming request
      ↓
normalize
      ↓
extract latest user intent
      ↓
route task
      ↓
short core contract
+ selected skill only
+ compact project state
      ↓
model request
```

A review request gets the verification contract

A broad architecture request gets the planning contract

A repeated failure gets the recovery contract

The original system context remains in the request after the Fable directive

Start the proxy in preview mode

```bash
get-fable serve 8080
```

Without an upstream URL, no provider call is made

Preview responses include routing metadata so you can inspect what get-fable would do

Configure one upstream when needed

```bash
export UPSTREAM_OPENAI_URL="https://your-provider.example/v1/chat/completions"
get-fable serve 8080
```

The proxy binds to `127.0.0.1` by default, limits request bodies, validates upstream schemes, applies an upstream timeout, and does not enable CORS unless configured

It is development middleware, not an internet-facing authentication gateway

## Doctor

A mature workflow needs to be able to tell you when its own setup is broken

```bash
get-fable doctor
```

Or

```bash
get-fable doctor --json
```

Current checks include

- canonical registry structure
- dead skill transitions
- OpenAI plugin manifest presence
- project state schema
- canonical project skill installation
- Python availability for hosts that use lifecycle hooks

`status --json` provides a separate machine-readable installation report for host integrations

## ChatGPT and Codex plugin

The repository ships a skill-only OpenAI plugin package

```text
.codex-plugin/plugin.json
skills/
```

The universal package deliberately does not declare an MCP server or app companion that the repository does not implement

Codex can additionally use repository-local profiles for exploration, planning, execution, verification, recovery, review, and documentation research

Those profiles inherit the active Codex model instead of pinning a model name that will age out of the repository

See [Plugin package](./docs/PLUGIN.md)

## Claude and Antigravity adapters

Global install

```bash
get-fable install
```

The current installer can configure

```text
~/.claude/
~/.gemini/config/
~/.agent-kernel/   # only when already present
```

Claude and Antigravity receive the same canonical skill pack

`fable-mode` remains as a compatibility alias for older installations

Antigravity owns its hook copies inside its plugin directory, so it does not depend on Claude paths

Malformed existing JSON configuration is not silently treated as empty configuration

## CLI

```text
install               Install supported global integrations
install-antigravity   Install the Antigravity / Gemini target
init                  Create missing project state and canonical skills
route <task>           Explain the selected workflow, optionally --json
doctor                 Validate runtime and project setup, optionally --json
status                 Report installation state, optionally --json
lint                   Validate ledger acceptance and strict state
serve [port]           Start the contextual request proxy
router [port]          Alias for serve
assets                 Count the broader historical/reference asset library
prompt                 Print the compatibility execution prompt
version                Print the package version
help                   Show CLI help
```

Running `get-fable` without a command only shows help

Installation is always explicit

## CI treats the runtime floor as a contract

The project currently tests

- Bun 1.1.0 on Ubuntu
- Bun 1.3.14 on Ubuntu
- Bun 1.3.14 on macOS

The CI gate runs typecheck, coverage tests, build, CLI routing smoke tests, initialized-project doctor/status checks, and npm package inspection

The workflow actions and current Bun version are pinned intentionally rather than relying on `latest`

## What get-fable does not claim

`get-fable` does not make one model literally become another model

It does not reproduce private provider infrastructure

It does not expose hidden reasoning

It does not guarantee correct code

It does not guarantee equivalent benchmark performance to a different model

The claim is narrower and testable

**A model can behave more reliably on substantial work when important execution behaviors are explicit, stateful, routed, and verified instead of being left to a long conversation and one giant prompt**

That is what this repository implements

## Development

```bash
bun install
bun run typecheck
bun test
bun run build
bun run check
```

Useful docs

- [Usage](./docs/USAGE.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Plugin package](./docs/PLUGIN.md)
- [Security](./SECURITY.md)
- [Releasing](./docs/RELEASING.md)
- [Third-party notices](./THIRD_PARTY_NOTICES.md)

## Provenance

`get-fable` includes original code and material adapted or collected from public upstream repositories

See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for attribution and licensing notes

Vendor and model names in historical references do not imply endorsement or affiliation

## License

Original `get-fable` code is released under the [MIT License](./LICENSE)

Third-party material remains subject to its applicable source terms as described in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)
