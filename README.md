<div align="center">

<img src="assets/mascot.svg" alt="get-fable rabbit mascot" width="120" height="120"/>

# get-fable

### Make the model you already use behave with stricter execution discipline

[![CI](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml/badge.svg)](https://github.com/imMamdouhaboammar/get-fable/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun%201.3%2B-FBF0DF?style=flat-square&logo=bun&logoColor=14151A)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Evidence first · bounded work · durable state · verification before done · recovery before another blind retry**

</div>

## The problem is not always the model

A coding agent can look excellent on a ten-line task and lose discipline on a three-hour refactor

The original requirement gets buried under tool output

Architecture starts before important facts are resolved

A narrow test gets mistaken for proof that the product path works

The same broken idea gets retried with slightly different edits

Then `done` becomes an opinion instead of an evidence state

`get-fable` targets that failure mode

It does not replace the model

It changes the execution conditions around the model

## The aha moment

A substantial task is not one job

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
recorded evidence
    ↓
complete

repeated failure or stale execution
    ↓
recovery
    ↓
new diagnosis
    ↓
plan or execute again
```

A giant static prompt asks one model to keep every job active at once

`get-fable` 1.1 turns those jobs into a small workflow with explicit routing, durable state, lifecycle hooks, and mechanical completion gates

## Six canonical skills, one source of truth

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

| Skill | Responsibility |
|---|---|
| `get-fable` | Entry router and global execution contract |
| `fable-discover` | Resolve load-bearing repository, runtime, and documentation facts |
| `fable-plan` | Convert grounded requirements into bounded cards and acceptance criteria |
| `fable-execute` | Implement one accepted card without scope drift |
| `fable-verify` | Try to falsify the result and collect fresh evidence |
| `fable-recover` | Diagnose repeated or stale failure before another edit |

`skills/registry.json` defines ordering, phases, allowed next skills, and routing hints

Historical prompts, design skills, agent definitions, and other reference material remain under `assets/`, but they are not the default execution workflow

## Explainable routing without an LLM call

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

Machine-readable form

```bash
get-fable route "The same test failed twice after retrying" --json
```

Routing priority is intentionally strict

1. repeated or stale failure selects `fable-recover`
2. review, proof, and completion checks select `fable-verify`
3. unknown repository or current documentation facts select `fable-discover`
4. architecture, migrations, and broad refactors select `fable-plan`
5. an already bounded concrete change selects `fable-execute`

The router exposes concise routing reasons and scores for diagnostics

It does not expose private chain-of-thought

## A real durable lifecycle

Initialize a project

```bash
get-fable init
```

Then apply a routing decision to durable state

```bash
get-fable route "Design a modular migration across several files" --apply
```

The normal substantial-work lifecycle is explicit

```bash
get-fable state executing
# implement the bounded card

get-fable state verifying
# run the real affected checks

get-fable evidence pass test "bun test" "42 affected tests passed"
get-fable state complete
```

A failed evidence record is also meaningful

```bash
get-fable evidence fail runtime "smoke test" "request still returns 500"
```

Repeated failures move durable state to

```text
phase=recovering
currentSkill=fable-recover
```

The recovery workflow then requires a new diagnosis before more product edits

## `.fable/state.json`

The JSON state is intentionally small

```text
schema version
phase
current skill
failure streak
substantial-work flag
last routing decision
evidence records
updated timestamp
```

Valid phases

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

For substantial work, `complete` is rejected until passing evidence exists

Human-readable working context remains in

```text
docs/SPEC.md
.fable/LEDGER.md
.fable/PROGRESS.md
```

## Lifecycle hooks make the state matter

Hosts with hook support receive four small Python hooks

| Hook | What it enforces |
|---|---|
| `fable_profile_inject.py` | Inject current phase, selected skill, failure streak, and open cards |
| `fable_spawn_guard.py` | Require a bounded open card before a large delegation |
| `fable_fail_streak.py` | Update durable failure state and enter recovery after two consecutive failures |
| `fable_close_guard.py` | Reject stop for unfinished work, missing evidence, or substantial state that is not complete |

The hooks are model-agnostic

There is no Haiku/Sonnet/Opus/Fable ranking, synthetic model tier, or model-name ceiling

## Evidence is a state transition, not a compliment

`get-fable lint` checks the human ledger and strict state together

```bash
get-fable lint
```

It can reject

- an open card with no acceptance condition
- a checked card with no substantive evidence annotation
- invalid state JSON
- substantial work marked complete without passing evidence
- repeated failure left in execution instead of recovery

The Stop hook goes further for armed hosts by refusing to close substantial work until passing state evidence exists and the durable phase reaches `complete`

## Contextual prompt compilation

The local request proxy no longer injects one historical prompt into every request

```text
incoming request
      ↓
normalize
      ↓
latest user intent
      ↓
route task
      ↓
short core contract
+ selected skill only
+ compact project state
      ↓
model request
```

A review request receives the verification contract

A broad architecture request receives the planning contract

A repeated failure receives the recovery contract

The caller's original system context remains in the request after the Fable directive

Start preview mode

```bash
get-fable serve 8080
```

Without an upstream URL, no provider call is made

Configure one upstream when needed

```bash
export UPSTREAM_OPENAI_URL="https://your-provider.example/v1/chat/completions"
get-fable serve 8080
```

The proxy binds to `127.0.0.1` by default, limits request bodies, validates upstream schemes, applies an upstream timeout, and leaves CORS disabled unless configured

It is development middleware, not an internet-facing authentication gateway

## Doctor and machine-readable status

```bash
get-fable doctor
get-fable doctor --json
get-fable status --json
```

`doctor` validates the canonical registry, transition targets, OpenAI plugin manifest, project state schema, canonical project skills, and Python availability for hosts that use lifecycle hooks

The source repository validates against its root canonical skills while initialized consumer projects validate their `.agents/skills/` copies

## ChatGPT and Codex plugin

The repository ships a skill-only OpenAI plugin package

```text
.codex-plugin/plugin.json
skills/
```

The universal package deliberately does not declare an MCP server or app companion that the repository does not implement

Codex can additionally use repository-local profiles for discovery, planning, execution, verification, recovery, review, and documentation research

Those profiles inherit the active Codex model instead of pinning a model name that will age out of the repository

See [Plugin package](./docs/PLUGIN.md)

## Claude and Antigravity adapters

Global install

```bash
get-fable install
```

Current targets

```text
~/.claude/
~/.gemini/config/
~/.agent-kernel/   # only when already present
```

Claude and Antigravity receive the same canonical skill pack

`fable-mode` remains as a compatibility alias for older installations

Antigravity owns its hook copies inside the plugin directory so it does not depend on Claude paths

Malformed existing JSON configuration is not silently treated as empty configuration

## CLI

```text
install               Install supported global integrations
install-antigravity   Install the Antigravity / Gemini target
init                  Create missing durable state and canonical project skills
route <task>           Explain workflow selection; --apply persists it; --json returns machine output
state <phase>          Transition durable workflow state; optional --substantial and --json
evidence ...           Record pass/fail evidence with kind, source, and concrete detail
doctor                 Validate runtime and project setup; optional --json
status                 Report installation state; optional --json
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

## CI treats compatibility as a contract

The verified runtime floor is Bun 1.3.0

CI currently runs

- Ubuntu with Bun 1.3.0
- Ubuntu with Bun 1.3.14 plus coverage and npm package inspection
- macOS with Bun 1.3.14

Each matrix job runs typecheck, the test suite, build, and a complete CLI lifecycle smoke test from project initialization through recorded evidence and `complete`

Workflow actions and Bun versions are pinned rather than relying on `latest`

## What get-fable does not claim

`get-fable` does not make one model literally become another model

It does not reproduce private provider infrastructure

It does not expose hidden reasoning

It does not guarantee correct code

It does not guarantee equivalent benchmark performance to a different model

The narrower claim is testable

**A model can behave more reliably on substantial work when important execution behaviors are explicit, routed, stateful, recoverable, and mechanically verified instead of being left to a long conversation and one giant prompt**

That is what this repository implements

## Development

Requirements

- Bun 1.3.0 or newer
- Python 3 for lifecycle-hook hosts

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
- [Lifecycle hooks](./hooks/README.md)
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
