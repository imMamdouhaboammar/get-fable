# Ask your agent to configure get-fable

A safe setup prompt that follows the installation playbook and checks the result.

Current public source: 41 community Skills across 8 packs. CLI package manifest: 1.15.2.

## Start with public Skills

```bash
npx skills add imMamdouhaboammar/get-fable
```

## Initialize after environment review

```bash
bun add -g get-fable
get-fable init
get-fable install all
get-fable skills install all
```

## Verify

```bash
get-fable doctor --json-v1
get-fable lint
```

For details, read the [installation guide](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/INSTALLATION.md),
[agent onboarding playbook](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/install-and-init-get-fable.md),
and [community catalog](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/CANONICAL_SKILLS.md).

The Skills are open source. Get-Fable Pro MCP is in development and is not required for community use.
