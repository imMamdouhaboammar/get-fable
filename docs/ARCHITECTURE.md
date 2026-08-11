# Architecture: `get-fable`

## Purpose

`get-fable` is a local-first toolkit for making agentic coding work more explicit and easier to verify

It combines four concerns that are often handled separately

1. project state and task tracking
2. lifecycle checks around agent execution
3. reusable prompt, skill, and agent assets
4. request enrichment through an OpenAI-compatible HTTP endpoint

The architecture is intentionally inspectable

Project rules live in files, hooks are plain Python scripts, installer targets are visible in source, and the router has a small surface area

## What the project does not claim

The project does not claim to reproduce a proprietary model, official vendor tier, private service, or hidden reasoning process

Names such as `Fable 5` and `Mythos` are retained only where they identify upstream community projects, source files, or compatibility conventions used by this repository

The current code should be treated as the source of truth for compatibility

## High-level structure

```text
                       user / coding agent
                              |
              +---------------+---------------+
              |                               |
              v                               v
      project initialization              global install
              |                               |
              v                               v
    .fable + .agents + docs        Claude + Gemini config + Kernel
              |                               |
              +---------------+---------------+
                              |
                              v
                    lifecycle guard hooks
                              |
                              v
                   evidence-aware execution

            optional request enrichment path

client -> /v1/chat/completions -> normalize -> inject context
                                      |
                                      v
                           configured upstream URL
```

## Components

### 1. Multi-target installer

Source: [`src/installer.ts`](../src/installer.ts)

The installer currently knows about three target locations

#### Claude Code

Writes under the Claude configuration directory, defaulting to `~/.claude`

It currently

- installs the Fable Mode skill under `skills/fable-mode`
- copies the Python lifecycle hooks with that skill
- merges hook registrations into `settings.json`
- appends the Fable rules to `CLAUDE.md` when the marker is not already present

The hook events registered by the installer are

```text
SessionStart
PreToolUse
PostToolUse
Stop
```

#### Antigravity / Gemini config target

Writes under `~/.gemini/config`

It currently

- writes `rules/fable5-mode.md`
- writes the `get-fable` plugin package
- copies the bundled skill collection into the plugin
- installs the global `fable-mode` skill
- attempts to register lifecycle hooks when the referenced hook files are available

This repository uses `~/.gemini/config` as the Antigravity / Gemini configuration target

That path should not be read as a claim that every Gemini CLI installation or version uses the same plugin convention

#### Agent Kernel

If `~/.agent-kernel` already exists, the global installer writes

```text
~/.agent-kernel/rules/fable5-mode.md
```

No broader Agent Kernel configuration is currently performed

### 2. Project initialization

Command

```bash
bun ./bin/get-fable.js init
```

Source: [`src/installer.ts`](../src/installer.ts)

The initializer creates project-local files so execution state does not depend entirely on chat history

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

Template files that already exist are skipped

The workspace skill and rule files are copied into `.agents`

### 3. Lifecycle guard hooks

Source: [`hooks/`](../hooks)

The current hook set is

| Hook | Trigger | Responsibility |
|---|---|---|
| `fable_profile_inject.py` | `SessionStart` | Reintroduce project state and working context |
| `fable_spawn_guard.py` | `PreToolUse` | Check prerequisites before selected agent or task actions |
| `fable_fail_streak.py` | `PostToolUse` | React to repeated command failures |
| `fable_close_guard.py` | `Stop` | Check unresolved ledger work and evidence before close |

These are process controls, not correctness proofs

A passing guard does not guarantee that the resulting implementation is correct

### 4. Asset library

Source: [`assets/`](../assets)

The asset library groups reusable material by purpose rather than treating one prompt as the product

Current categories include

```text
assets/agents/
assets/injected-reminders/
assets/mcp-servers/
assets/prompts/
assets/skills/
assets/slash-commands/
assets/starter-components/
```

The runtime count should be taken from the repository itself

```bash
bun ./bin/get-fable.js assets
```

[`src/assets-manager.ts`](../src/assets-manager.ts) provides the same repository-backed summary programmatically

### 5. Request enrichment proxy

Source: [`src/router/`](../src/router)

The current server exposes

```text
GET  /health
GET  /v1/health
POST /chat/completions
POST /v1/chat/completions
```

Request processing is intentionally small

1. parse the incoming JSON body
2. normalize a supported request shape
3. prepend the configured Fable prompt context
4. forward to one configured upstream URL when `UPSTREAM_OPENAI_URL` is set
5. otherwise return an enrichment preview

The request normalizer currently understands

- an OpenAI-style `messages` array
- a Gemini-style `contents` array
- a generic fallback that serializes an unknown body into one user message

This is request-shape normalization, not full provider emulation

The proxy does not currently implement a complete Anthropic Messages adapter, provider discovery, retry policy, credential store, rate limiting, or provider-specific streaming translation

## Router trust boundary

The router is not designed as a public API gateway in its current form

Important current behavior

- CORS is permissive
- there is no built-in authentication or authorization check
- an inbound `Authorization` header is forwarded to the configured upstream
- the server forwards only when `UPSTREAM_OPENAI_URL` is present

Keep the router on a trusted machine or network unless you add your own access controls

## Configuration mutation behavior

Global installation changes user configuration files

The installer merges valid JSON in supported configuration files and writes formatted JSON back to disk

If a JSON file is malformed, the current helper cannot preserve that malformed content safely

Back up important custom configuration before running a global install

Project initialization is narrower and skips existing template targets instead of replacing them

## Compatibility policy

Compatibility claims in project documentation follow these rules

- automatic support means the installer contains code for that target
- request compatibility means the router understands the request shape described in source
- reusable assets do not imply automatic installation into every agent that can read Markdown
- a vendor or product name is not an endorsement claim

Under that definition, the current automatic configuration targets are Claude Code, the repository's Antigravity / Gemini config target, and Agent Kernel when present

Other agents may be able to consume the project files or proxy manually, but they are not described as automatic targets until the repository contains that integration

## Dependencies

The npm package declares no runtime npm dependencies

The project still relies on external runtimes and local tools

- Bun for the CLI and server
- Python 3 for the lifecycle hooks
- Git for source-based installation workflows

That is more accurate than describing the entire project as dependency-free

## Provenance

The repository contains original project code plus material adapted or collected from public upstream repositories

Known upstream references and their repository licenses are documented in [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)

## Related docs

- [README](../README.md)
- [Usage](./USAGE.md)
- [ADR-001](./ADR-001-fable-supersystem.md)
- [Third-party notices](../THIRD_PARTY_NOTICES.md)
