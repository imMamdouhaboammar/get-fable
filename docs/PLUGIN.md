# Host integrations and public Skills

get-fable supports a range of coding-agent environments. The exact integration depends on host capabilities and the version of the installed CLI.

## Start with the portable Skills

```bash
npx skills add imMamdouhaboammar/get-fable
```

The public source has **41 consumer Skills across 8 packs**. Inspect the [catalog](CANONICAL_SKILLS.md) and choose the Skills appropriate to your work.

## Add host adapters

```bash
bun add -g get-fable
get-fable --version

# Inside a project repository
get-fable init
get-fable install all
get-fable skills install all
```

Or select one supported host, such as `get-fable install codex`. Review existing settings and request approval before overwriting custom rules, hooks, or user-level configuration.

The [host matrix](HOSTS.md) distinguishes full lifecycle hook integrations from Skill distribution and advisory rules. Do not treat a listed adapter as a claim that every host has identical behavior.

## Test the actual installation

```bash
get-fable status --json-v1
get-fable doctor --json-v1
get-fable lint
```

Keep the resulting diagnostics and report unsupported hosts clearly. The community Skills are open source; the planned Pro MCP product is separate and not required for their use.

For a guided setup, see [install-and-init-get-fable.md](install-and-init-get-fable.md) or [AGENT_SETUP_PROMPT.md](AGENT_SETUP_PROMPT.md).
