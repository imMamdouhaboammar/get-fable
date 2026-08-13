# get-fable repository instructions

## Purpose

This repository provides process controls for substantial AI-assisted coding work. Keep compatibility claims tied to implemented behavior.

## Working contract

- Inspect before editing. Do not infer behavior from filenames alone.
- For multi-file or high-risk work, define acceptance criteria before implementation.
- Keep durable task state in `docs/SPEC.md` and `.fable/LEDGER.md` when those files are active for the task.
- Treat `- [x]` as verified, not merely implemented. Attach concrete evidence.
- On repeated failure, diagnose the harness and execution path before changing product code again.
- Preserve existing user-owned configuration. Installation and initialization must remain explicit and idempotent.
- Do not add credentials, private MCP configuration, local absolute paths, or unsupported vendor claims.
- Do not describe Markdown assets as automatic integration unless installation/runtime support exists in source.

## Plugin routing

For tasks explicitly using get-fable, use `$get-fable` as the entry point. It routes work to the smallest relevant specialist skill:

- `$fable-plan` for requirements, acceptance criteria, decomposition, and risk
- `$fable-execute` for bounded implementation against an accepted plan
- `$fable-verify` for adversarial review and real acceptance evidence
- `$fable-recover` for repeated failures, drift, or broken execution paths

Codex may also use repo-local agents declared in `.codex/config.toml`. Those agents are a Codex-specific execution aid, not a ChatGPT plugin compatibility claim.

## Verification

Before completion, run the narrowest meaningful checks first, then the repository gate when feasible:

```bash
bun run typecheck
bun test
bun run build
```

For plugin packaging changes, also verify:

- `.codex-plugin/plugin.json` parses and uses strict semver
- every declared skill directory contains `SKILL.md`
- the manifest does not declare absent MCP or app companions
- skill routing contains no dead targets
