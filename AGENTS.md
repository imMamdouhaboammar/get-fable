# get-fable repository instructions

## Purpose

This repository provides an inspectable coding lifecycle for AI-assisted software work. Keep every capability claim tied to implemented behavior and current evidence.

## Working contract

- Use root `skills/` and `skills/get-fable/registry.json` as the canonical workflow source.
- Route by the missing evidence or decision rather than loading every skill.
- Resolve repository unknowns with `fable-discover` and current external facts with `fable-research` before they influence architecture.
- Use bounded cards for broad work and `fable-tdd` for meaningfully testable behavior changes.
- Delegate only independent work with explicit ownership and acceptance.
- Treat verification, code review, security review, release readiness, handoff, and agent-control evaluation as separate claims.
- Keep durable task state in `docs/SPEC.md`, `.fable/LEDGER.md`, `.fable/PROGRESS.md`, and `.fable/state.json` when the project is initialized.
- Record workspace mutation generations and require fresh completion-capable evidence after the final mutation.
- On repeated failure, diagnose harness and execution-path problems before another product edit.
- Preserve existing user-owned configuration. Installation and initialization must remain explicit and idempotent.
- Do not add credentials, private MCP configuration, raw prompts/transcripts to evidence state, local absolute paths, or unsupported vendor/model claims.
- Do not describe reusable Markdown assets as automatic integration unless installer/runtime support exists in source.

## Canonical lifecycle packs

Core:
- `$get-fable`
- `$fable-discover`
- `$fable-plan`
- `$fable-execute`
- `$fable-verify`
- `$fable-recover`

Intelligence:
- `$fable-research`

Build:
- `$fable-tdd`
- `$fable-delegate`

Proof:
- `$fable-review`
- `$fable-security`

Delivery:
- `$fable-release`
- `$fable-handoff`

Evolution:
- `$fable-eval`

Host-specific files may adapt this graph but must not fork its semantics.

## Runtime semantics

`.fable/state.json` uses schema version 2. It includes a content-safe workspace identity, mutation generation, verified generation, active card, routing decision, failure state, and typed evidence.

Substantial work cannot transition to `complete` unless the newest completion-capable evidence belongs to the current mutation generation and passes. Research, execution receipts, and handoff records do not close the behavior-completion gate.

The request proxy compiles a task-specific directive from the short core contract plus only the selected canonical skill, required gates, and compact current state.

## Verification

Before completion, run the narrowest meaningful checks first, then the repository gate when feasible:

```bash
bun run typecheck
bun test
bun run build
```

For lifecycle, plugin, routing, or hook changes, also verify:

- registry v2 contains no dead skill, next, or fallback targets
- every canonical skill has valid frontmatter
- mutation invalidates earlier verification
- non-completion evidence cannot close substantial work
- schema-v1 state migration still works
- Claude and Antigravity hook semantics match the canonical state contract
- `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and marketplace metadata parse and use strict semver
- required branding assets exist and are square
- Codex profile references point to existing unpinned profiles
- `get-fable doctor --json` reports no error-severity checks
- npm package inspection contains the canonical skills and lifecycle eval surface
