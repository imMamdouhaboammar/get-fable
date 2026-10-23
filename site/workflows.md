# Practical get-fable workflows

Small examples for a disciplined coding loop, with commands that work from a published CLI installation.

Current public source: 41 community Skills across 8 packs. CLI package manifest: 1.15.2.

## Install public Skills

```bash
npx skills add imMamdouhaboammar/get-fable
```

## Initialize and inspect

```bash
bun add -g get-fable
get-fable init
get-fable status --json-v1
```

## Route a task

```bash
get-fable route "investigate the failing test before editing"
```

## Verify your environment

```bash
get-fable doctor --json-v1
get-fable lint
```

For details, read the [installation guide](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/INSTALLATION.md),
[agent onboarding playbook](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/install-and-init-get-fable.md),
and [community catalog](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/CANONICAL_SKILLS.md).

The Skills are open source. Get-Fable Pro MCP is in development and is not required for community use.
