# Install and initialize get-fable

This is the public onboarding playbook for developers and coding agents. It covers host installation, project setup, optional supporting tools, verification, and daily use across the 32 listed host integration targets and the community Skills actually shipped in this repository.

Use this playbook when setting up a machine or project, adding Skills and supported lifecycle hooks, or coaching a team in Arabic or English. Use a focused implementation or testing Skill for an individual coding task once setup is finished.

## 1. Inspect the environment

Run these checks before modifying global tools or repository state:

```bash
bun --version
git --version
python3 --version
git status --short
```

The CLI requires Bun 1.3 or newer to run, Git for repository workflows, and Python 3.9+ for Python-based hooks. The `skills` installer is invoked through `npx`, so Node.js/npm also needs to be present for that route.

Identify the project root and existing agent configurations, `.fable/`, custom Skills, hooks, and uncommitted work. Do not overwrite them blindly. Ask before installing missing system tools or changing global settings.

## 2. Install the published CLI

Preferred:

```bash
bun add -g get-fable
```

Or use npm as a package manager (Bun is still needed to execute the CLI):

```bash
npm install -g get-fable
```

For an inspected shell installer:

```bash
curl -fsSL https://raw.githubusercontent.com/imMamdouhaboammar/get-fable/master/install.sh | sh
```

Verify the version:

```bash
get-fable --version
```

The GitHub public distribution contains Skills, documentation, manifests, and assets. It is not a buildable substitute for the separately published npm CLI package.

## 3. Install public community Skills

```bash
npx skills add imMamdouhaboammar/get-fable
```

The public source currently has **41 on-disk consumer Skills across 8 packs**. These can be used independently from the CLI. Verify which Skills your host actually installs. Skill installation should not expose internal maintainer material or silently replace unrelated local Skills.

## 4. Initialize this project

From the target Git repository root:

```bash
get-fable init
get-fable install all
get-fable skills install all
```

- `init` prepares the project lifecycle state (including `.fable/` files).
- `install all` deploys available host integrations, which differ by platform.
- `skills install all` distributes the Skills available to the installed CLI. Confirm the package's contents and installed destinations before using it on a shared machine.

Review the [host matrix](HOSTS.md) to distinguish full lifecycle hooks, Skills, and advisory rules. A host being listed does not mean it supports every integration level. For selected hosts, use `get-fable install codex` or another documented host name instead of `all`.

## 5. Optional supporting toolchain

Offer the user a choice rather than automatically installing system-wide dependencies:

```bash
get-fable eco discover --json-v1
get-fable eco plan core --json-v1
```

Only after reviewing the plan and obtaining permission, consider the relevant `fable-eco` profile, shell setup, git hooks, or a quality gate. Tools that use credentials, network access, or global configuration require special care.

## 6. Verify, diagnose, then coach

```bash
get-fable status --json-v1
get-fable doctor --json-v1
get-fable lint
get-fable route "inspect this repository for its entry point"
```

Record exit codes, installed version, host integration results, and doctor errors/warnings. The route example is a read-only smoke test without `--apply`; it is not a claim that an application build or test suite passes.

If doctor reports errors, diagnose the actual failure, propose a bounded correction, obtain permission for sensitive changes, and rerun. A warning about an optional integration may be a documented limitation, not necessarily a broken install.

### Daily workflow coaching

In Arabic or English, explain what each step means with an example from the user's project:

1. **Discover** the execution path and required context.
2. **Plan** a bounded task with acceptance criteria.
3. **Test and implement** against an observable problem.
4. **Verify and review** after the last relevant mutation.
5. **Handoff or release** with current evidence and known limitations.

### Setup receipt

At the end, report:

| Check | Evidence to record |
| --- | --- |
| Runtime | OS, Bun, Git, Python, npm, get-fable versions |
| Project | Absolute root, branch, changes to tracked/untracked files |
| Skills | Installed public Skill count and locations |
| Hosts | Detected host names, actual integration tier, skipped hosts |
| Optional setup | Proposed versus explicitly approved changes |
| Proof | Exit codes for status, doctor, lint, routing smoke test |
| Recovery | Any failures, limitations, and rollback paths |

For a paste-ready instruction that makes the agent follow this process, use [Ask your agent to install get-fable](AGENT_SETUP_PROMPT.md).
