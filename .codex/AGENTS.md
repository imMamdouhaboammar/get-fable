# get-fable for Codex

This supplements root `AGENTS.md` with Codex-specific execution guidance.

## Source of truth

- Canonical workflow registry: `skills/registry.json`
- Canonical entry skill: `skills/get-fable/SKILL.md`
- Specialist skills: `skills/fable-*/SKILL.md`
- Durable runtime state: `.fable/state.json` when the project is initialized

`.agents/` and `.claude/` compatibility files are adapters or legacy surfaces. Do not treat them as independent workflow definitions.

## Codex agents

Use the repo-local profiles in `.codex/config.toml` as execution aids:

- Explorer: evidence gathering for `$fable-discover`
- Planner: bounded decomposition for `$fable-plan`
- Executor: one accepted card for `$fable-execute`
- Verifier: adversarial proof for `$fable-verify`
- Recovery: failure attribution for `$fable-recover`
- Reviewer: PR correctness and regression review
- Docs researcher: primary documentation and release verification

Profiles intentionally inherit the active Codex model instead of hard-coding a model ID.

## Configuration boundary

Keep credentials and private MCP configuration in user-owned Codex configuration, not in this repository. Repo MCP entries are development defaults only and are not part of the universal ChatGPT plugin contract.
