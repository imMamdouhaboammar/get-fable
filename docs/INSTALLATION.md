# Install get-fable

Start with the community Skills, the CLI, or both. They serve different purposes:

| Installation | Command | What you receive |
| --- | --- | --- |
| Public Skills | `npx skills add imMamdouhaboammar/get-fable` | Inspectable public agent playbooks |
| CLI with Bun (recommended) | `bun add -g get-fable` | `get-fable` CLI from npm |
| CLI with npm | `npm install -g get-fable` | Same CLI; Bun is still required to run it |
| Shell bootstrap | `curl -fsSL https://raw.githubusercontent.com/imMamdouhaboammar/get-fable/master/install.sh \| sh` | Installer script reviewed from this repository |

Prerequisites: **Bun 1.3+**, **Git**, **Python 3.9+** for lifecycle hooks, and **Node.js/npm** to use `npx skills add`.

## Configure a project

From the project repository root:

```bash
get-fable --version
get-fable init
get-fable install all
get-fable skills install all
get-fable status --json-v1
get-fable doctor --json-v1
get-fable lint
```

`init` creates lifecycle state for the current project. The two `install all` commands configure different things: host adapters and Skills. Inspect existing host configuration first because these operations may affect project or global settings. See the [32-host integration matrix](HOSTS.md) for the individual options and their different tiers.

To set up only one host, use its documented name, for example:

```bash
get-fable install codex
```

The source-only public GitHub repository does not include a runnable CLI build. Install the published package for CLI commands; Git cloning this repository is useful for reading or contributing to public Skills, not for executing `bun ./bin/get-fable.js`.

## Ask your coding agent to handle setup

Use the [complete installation and initialization playbook](install-and-init-get-fable.md) or copy the [agent setup prompt](AGENT_SETUP_PROMPT.md). Both require preflight checks, user consent before global changes or optional `fable-eco` provisioning, and final verification receipts.

## Quick verification

```bash
get-fable --version
get-fable doctor --json-v1
get-fable route "inspect this repository for its entry point"
```

A passing doctor checks the harness environment, not the behavior of your application. Always run application-specific tests separately when coding tasks begin.
