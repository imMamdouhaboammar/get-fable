# A practical get-fable guide

Make engineering tasks explicit: discover, plan, test, implement, verify, review, and hand off.

Current public source: 41 community Skills across 8 packs. CLI package manifest: 1.15.2.

## Start with Skills

```bash
npx skills add imMamdouhaboammar/get-fable
```

## Set up a repository

```bash
bun add -g get-fable
get-fable init
get-fable install all
get-fable skills install all
```

## Check real state

```bash
get-fable status --json-v1
get-fable doctor --json-v1
get-fable route "inspect this repository"
```

For details, read the [installation guide](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/INSTALLATION.md),
[agent onboarding playbook](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/install-and-init-get-fable.md),
and [community catalog](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/CANONICAL_SKILLS.md).

The Skills are open source. Get-Fable Pro MCP is in development and is not required for community use.
