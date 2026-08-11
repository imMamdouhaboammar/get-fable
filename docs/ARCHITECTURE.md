# Architecture: `get-fable`

## Purpose

`get-fable` is a local-first toolkit for making coding-agent work explicit, persistent, and easier to verify

It combines four concerns

1. project state and task tracking
2. lifecycle checks around agent execution
3. reusable prompt, skill, and agent assets
4. optional request enrichment through a local HTTP endpoint

The implementation favors inspectable files and small public boundaries over hidden runtime behavior

## Trust boundary

The project does not reproduce a proprietary model, private provider service, or hidden reasoning process

The code in this repository is the source of truth for installation targets and request compatibility

Bundled community material and vendor names do not imply vendor endorsement

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

            optional local request path

client -> local HTTP -> normalize -> inject context -> optional upstream
```

## 1. CLI boundary

Source: [`src/cli.ts`](../src/cli.ts)

Executable: [`bin/get-fable.js`](../bin/get-fable.js)

The file under `bin/` is intentionally small and imports the TypeScript CLI source through Bun

This prevents a committed generated bundle from drifting behind `src/`

The CLI

- shows help when run without a command
- requires installation commands to be explicit
- reads its version from `package.json`
- validates proxy ports before starting a server
- returns command status through `process.exitCode`

## 2. Multi-target installer

Source: [`src/installer.ts`](../src/installer.ts)

### Claude Code

Default target: `~/.claude`

The installer

- installs the Fable skill
- copies four Python hooks
- merges hook registrations into `settings.json`
- appends the Fable rules to `CLAUDE.md` once

`CLAUDE_CONFIG_DIR` can redirect the target

### Antigravity / Gemini config target

Default target: `~/.gemini/config`

The installer

- writes the Fable rule
- writes the `get-fable` plugin package
- copies bundled skills into the plugin
- copies lifecycle hooks into the plugin itself
- installs the global `fable-mode` skill
- registers plugin-owned hook paths in `hooks.json`

The dedicated Antigravity install does not depend on hook files under Claude configuration

`FABLE_GEMINI_CONFIG_DIR` can redirect the target

### Agent Kernel

Default target: `~/.agent-kernel`

If that directory already exists, the global installer writes the Fable rule under `rules/`

The installer does not create a full Agent Kernel installation

`FABLE_AGENT_KERNEL_DIR` can redirect the target

## 3. Configuration writes

Source: [`src/utils.ts`](../src/utils.ts)

JSON configuration mutation follows these rules

1. parse an existing file before modifying it
2. require the JSON root to be an object
3. refuse to continue when existing JSON is malformed
4. write the updated JSON through a temporary file and rename

The helper does not treat broken configuration as an empty object

That choice is deliberate because preserving user configuration is more important than making an install appear successful

## 4. Project initialization

Command

```bash
bun ./bin/get-fable.js init
```

The initializer creates missing project-local targets

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

Every target is skip-if-present

The initializer does not replace an existing workspace skill, rule, ledger, progress file, verifier, or spec

## 5. Lifecycle hooks

Source: [`hooks/`](../hooks)

| Hook | Trigger | Responsibility |
|---|---|---|
| `fable_profile_inject.py` | `SessionStart` | Reintroduce project state and working context |
| `fable_spawn_guard.py` | `PreToolUse` | Check prerequisites before selected agent or task actions |
| `fable_fail_streak.py` | `PostToolUse` | React to repeated command failures |
| `fable_close_guard.py` | `Stop` | Check unresolved ledger work and evidence before close |

These hooks are process checks, not correctness proofs

## 6. Asset library

Source: [`assets/`](../assets)

The library groups reusable material by purpose

```text
assets/agents/
assets/injected-reminders/
assets/mcp-servers/
assets/prompts/
assets/skills/
assets/slash-commands/
assets/starter-components/
```

Counts come from disk at runtime

```bash
bun ./bin/get-fable.js assets
```

User-provided skill and agent names are validated before they are converted into local asset paths

Names containing path traversal syntax are rejected

## 7. Request normalization

Source: [`src/router/provider-translator.ts`](../src/router/provider-translator.ts)

The normalizer accepts two documented shapes

- OpenAI-style `messages`
- Gemini-style `contents`, including structured `systemInstruction.parts`

Unsupported bodies return a validation error instead of being serialized into an implicit fallback message

Context injection returns a new request object and does not mutate the caller's request

## 8. Local request proxy

Source: [`src/router/index.ts`](../src/router/index.ts)

Endpoints

```text
GET  /health
GET  /v1/health
POST /chat/completions
POST /v1/chat/completions
```

Default request flow

1. accept JSON on a supported endpoint
2. enforce the configured body limit
3. normalize the request
4. inject Fable context
5. return preview metadata when no upstream is configured
6. otherwise forward to one configured HTTP or HTTPS upstream

Safety defaults

```text
host                     127.0.0.1
CORS                     disabled unless configured
max request body         1 MiB
upstream timeout         30 seconds
allowed upstream scheme  http / https
```

The proxy preserves upstream status, content type, and response bytes rather than assuming every upstream response is JSON

The proxy still has no built-in user authentication or authorization boundary

Binding it beyond loopback is an explicit operator decision and should be paired with external access controls

## 9. Tests and CI

Core tests live under [`test/`](../test)

They cover public behavior around

- JSON merge safety
- project initialization
- Antigravity installation and idempotence
- CLI defaults and port validation
- request normalization and immutable context injection
- local proxy HTTP behavior and body limits
- asset path traversal rejection
- Fable ledger lint behavior

The existing site contract tests remain under [`site/`](../site)

CI runs

```text
TypeScript typecheck
full Bun test suite with coverage
Bun build
CLI smoke test
npm package-content dry run
```

## Compatibility policy

Documentation uses three separate meanings

- automatic support means installer code exists for that target
- request compatibility means the normalizer handles the documented request shape
- reusable asset means a file may be consumable manually where another tool accepts that format

Those meanings are not interchangeable

## Dependencies

The package has no runtime npm dependencies

The project still depends on external runtimes and tools

- Bun for the CLI, tests, build, and local server
- Python 3 for lifecycle hooks
- Git for source-based setup

## Provenance

The repository contains original project code plus material adapted or collected from public upstream repositories

See [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) for source and licensing notes

## Related docs

- [README](../README.md)
- [Usage](./USAGE.md)
- [ADR-001](./ADR-001-fable-supersystem.md)
- [Security](../SECURITY.md)
- [Contributing](../CONTRIBUTING.md)
- [Third-party notices](../THIRD_PARTY_NOTICES.md)
