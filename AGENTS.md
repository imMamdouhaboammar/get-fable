# get-fable repository instructions

## Purpose

This repository provides inspectable execution discipline for substantial AI-assisted software work. Keep every capability claim tied to implemented behavior and fresh evidence.

## Working contract

- Inspect the real execution path before editing.
- Resolve load-bearing unknowns before architecture; use `$fable-discover` when evidence is missing.
- For broad or risky work, define bounded cards and acceptance criteria before implementation.
- Keep durable task state in `docs/SPEC.md`, `.fable/LEDGER.md`, and `.fable/state.json` when the project is armed.
- Treat completion as an evidence state, not an implementation opinion.
- On repeated failure, diagnose harness and execution-path problems before another product edit.
- Preserve existing user-owned configuration. Installation and initialization must remain explicit and idempotent.
- Do not add credentials, private MCP configuration, local absolute paths, or unsupported vendor/model claims.
- Do not describe reusable Markdown assets as automatic integration unless installer/runtime support exists in source.

## Canonical skill graph

`skills/registry.json` and root `skills/*/SKILL.md` are the source of truth.

- `$get-fable` is the entry router
- `$fable-discover` gathers load-bearing evidence
- `$fable-plan` creates bounded cards and acceptance criteria
- `$fable-execute` implements one accepted card
- `$fable-verify` falsifies the result and records evidence
- `$fable-recover` diagnoses repeated or stale failure before another edit

Host-specific files may adapt this graph but must not fork its semantics.

## Runtime semantics

`.fable/state.json` uses schema version 1. Substantial work cannot transition to `complete` without passing evidence. Repeated failure must route through recovery before further execution.

The request proxy compiles a task-specific directive from the short core contract plus the selected canonical skill. Do not restore the old behavior of injecting the full historical prompt pack into every request.

## Verification

Before completion, run the narrowest meaningful checks first, then the repository gate when feasible:

```bash
bun run typecheck
bun test
bun run build
```

For plugin or routing changes, also verify:

- `.codex-plugin/plugin.json` parses and uses strict semver
- `skills/registry.json` has no dead skill or transition targets
- every canonical skill contains valid `SKILL.md` frontmatter
- Codex agent config references existing profiles
- `get-fable doctor --json` reports no error-severity checks
- npm package inspection includes the canonical `skills/` surface
