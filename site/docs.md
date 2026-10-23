# Get-fable documentation

Install the community Skills, set up the published CLI, and verify your coding-agent environment.

Current public source: 41 community Skills across 8 packs. CLI package manifest: 1.15.2.

## Get the public Skills

```bash
npx skills add imMamdouhaboammar/get-fable
```

## Install the CLI

```bash
bun add -g get-fable
```

## Initialize your project

```bash
get-fable init
get-fable install all
get-fable skills install all
```

## Check the setup

```bash
get-fable --version
get-fable doctor --json-v1
get-fable lint
```

For details, read the [installation guide](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/INSTALLATION.md),
[agent onboarding playbook](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/install-and-init-get-fable.md),
and [community catalog](https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/CANONICAL_SKILLS.md).

The Skills are open source. Get-Fable Pro MCP is in development and is not required for community use.
