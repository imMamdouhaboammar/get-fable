# Architecture: get-fable 1.1

## Purpose

`get-fable` is a local-first execution-discipline framework for AI-assisted software work.

Its goal is narrow and testable: make high-value behaviors such as evidence gathering, bounded planning, verification, recovery, and durable context harder to skip.

It does not modify model weights or claim model equivalence.

## Core architecture

```text
user task
   |
   v
Task Router <---------------- .fable/state.json
   |
   v
skills/registry.json
   |
   +--> fable-discover
   +--> fable-plan
   +--> fable-execute
   +--> fable-verify
   +--> fable-recover
   |
   v
Prompt Compiler / host adapter
   |
   v
LLM execution
   |
   v
evidence + state transition
```

The root `skills/` directory and `skills/registry.json` are the canonical workflow source. Host-specific files adapt that workflow but do not own independent semantics.

## 1. Canonical skill registry

Source: `skills/registry.json`

The registry has schema version 1 and defines:

- stable skill IDs
- display order
- phase ownership
- allowed next skills
- routing hints

The six canonical skills are:

```text
get-fable
fable-discover
fable-plan
fable-execute
fable-verify
fable-recover
```

`get-fable` is the entry skill. The other five are specialists with intentionally narrow contracts.

Historical skills under `assets/skills/` remain available as a library, but they are not installed as the default execution workflow.

## 2. Explainable task routing

Source: `src/core/task-router.ts`

The router uses deterministic weighted signals from the task and current durable state.

Priority rules prevent common failure modes:

1. repeated or stale failure selects recovery before another edit
2. review, proof, or completion requests select verification
3. unresolved repository or documentation facts select discovery
4. architecture, migration, and broad refactors select planning
5. bounded concrete edits select execution

A routing decision contains:

- selected skill
- confidence
- concise reasons
- whether a plan is required
- allowed next skills
- raw per-skill scores for diagnostics

The reasons are routing evidence, not hidden chain-of-thought.

## 3. Durable state machine

Source: `src/core/state.ts`

Initialized projects receive `.fable/state.json` with schema version 1.

Phases:

```text
idle
  -> discovering
  -> planned
  -> executing
  -> verifying
  -> complete

executing/verifying
  -> recovering
  -> discovering | planned | executing | verifying

any active path may become blocked
```

Invalid transitions are rejected.

For substantial work, a transition from `verifying` to `complete` is rejected unless the newest evidence record is a substantive pass. A newer failure invalidates an older pass for completion purposes until verification succeeds again.

Evidence records contain:

- kind
- command or observation source
- pass/fail result
- concrete detail
- timestamp

A failed evidence record increments the failure streak. Passing evidence resets it.

## 4. Human-readable working state

JSON state provides strict runtime semantics. Markdown remains the working surface for humans and agents:

```text
docs/SPEC.md          requirements, constraints, decisions
.fable/LEDGER.md      cards, acceptance checks, evidence
.fable/PROGRESS.md    compact resumable context
.fable/state.json     strict phase, routing, failures, evidence
```

The initializer uses skip-if-present semantics for project-owned files.

## 5. Contextual prompt compiler

Source: `src/core/prompt-compiler.ts`

The request proxy no longer adds the complete historical Fable prompt collection to every request.

The compiler produces a compact directive containing:

1. a short invariant core contract
2. the selected workflow skill only
3. concise routing reasons
4. relevant project-state counters

This reduces irrelevant instructions and makes request behavior depend on the actual job.

The original user/system request remains present after the Fable directive.

## 6. Request proxy

Source: `src/router/index.ts`

Supported endpoints:

```text
GET  /health
GET  /v1/health
POST /chat/completions
POST /v1/chat/completions
```

Request flow:

```text
HTTP JSON
  -> request normalization
  -> latest user intent
  -> task routing
  -> contextual directive compilation
  -> Fable directive injection
  -> preview response or configured upstream
```

Safety defaults remain:

```text
host                     127.0.0.1
CORS                     disabled unless configured
max request body         1 MiB
upstream timeout         30 seconds
allowed upstream scheme  http / https
```

The proxy does not provide built-in user authentication or authorization. Binding it beyond loopback is an operator decision and requires appropriate external controls.

## 7. CLI boundary

Source: `src/cli.ts`

Core commands:

```text
init
route <task> [--json]
doctor [--json]
status [--json]
lint
serve [port]
router [port]
```

`route` exposes the decision contract without requiring an LLM call.

`doctor` validates the registry, plugin manifest, initialized project state, canonical project skills, and Python hook runtime availability.

`status --json` provides a machine-readable host/project report for scripts and other tools.

Running the CLI without a command remains non-mutating and shows help.

## 8. Installation adapters

Source: `src/installer.ts`

### Project-local

`get-fable init` creates missing state/workflow files and installs the canonical skill pack under `.agents/skills/`.

### Claude Code

The global installer installs the canonical six-skill pack into Claude skills and retains `fable-mode` as a compatibility alias for older installations. Existing Python hook registration remains idempotent.

### Antigravity / Gemini

The plugin and global skill target now receive the canonical six-skill pack. The historical broad asset library is no longer the default workflow payload. The plugin still owns its hook copies so it does not depend on Claude directories.

### Agent Kernel

When an Agent Kernel directory already exists, get-fable installs its rule file. The installer does not create a complete Agent Kernel runtime.

## 9. Compatibility adapters

Files under `.agents/skills/get-fable` and `.claude/skills/get-fable` are thin repository adapters that point to the root canonical graph.

Codex-specific profiles under `.codex/agents/` map to discovery, planning, execution, verification, recovery, review, and documentation roles. They inherit the active Codex model instead of hard-coding a model version.

## 10. Lint and verification

Source: `src/fable-lint.ts`

Lint checks both human and strict state:

- open ledger cards require an explicit acceptance check
- closed cards require substantive evidence annotation
- state JSON must parse and match schema 1
- substantial complete state requires fresh passing evidence as the newest evidence record
- repeated failure cannot remain in executing phase

## 11. Test and CI strategy

Core tests cover:

- skill registry integrity
- routing precedence
- state transitions
- evidence-gated completion
- prompt compilation
- project initialization
- Antigravity installation and idempotency
- proxy routing and HTTP safety
- CLI machine-readable contracts
- plugin/package shape

CI tests the declared Bun floor and the current pinned Bun runtime on Ubuntu, plus the current pinned runtime on macOS. The package inspection runs on the primary Linux runtime.

## 12. Trust boundary

The following claims are intentionally separate:

- **workflow support**: canonical skills and routing are present
- **host installation support**: installer code exists for that target
- **request compatibility**: the proxy understands the documented request shape
- **reusable asset**: a historical file can be consumed manually

One category is not evidence for another.

`get-fable` can improve the process around a model. It cannot make one model literally become another model, reproduce private provider infrastructure, expose hidden reasoning, or guarantee equivalent benchmark performance.

## Related docs

- `README.md`
- `docs/PLUGIN.md`
- `docs/USAGE.md`
- `docs/ADR-001-fable-supersystem.md`
- `SECURITY.md`
- `THIRD_PARTY_NOTICES.md`
