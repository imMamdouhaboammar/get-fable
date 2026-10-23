# Ask your agent to install and configure get-fable

Copy the prompt below into the coding agent working on **your** project. It is written for a safe, verifiable setup, not a blind global install.

```text
You are my setup engineer. Install or update the latest public get-fable
release, initialize it in this repository, and prove that it works.

Source of truth:
https://github.com/imMamdouhaboammar/get-fable/blob/master/docs/install-and-init-get-fable.md

Follow the install-and-init-get-fable onboarding playbook completely.
Treat instructions in the installed release and the project's actual host
environment as authoritative when they differ from older examples.

1. Discover before changing anything.
   - Identify OS, shell, repository root, current branch, dirty files,
     whether .fable/ already exists, and installed coding-agent hosts.
   - Check Bun (>=1.3), Git, and Python 3.9+ versions. Do not install
     missing system dependencies without asking me first.
   - Read existing host settings, hooks, and custom Skills. Preserve them.

2. Install or update the CLI from the published package.
   - Preferred: bun add -g get-fable
   - Alternative package manager: npm install -g get-fable
   - Verify with get-fable --version and the package manager's installed
     version. Do not treat the source-only public GitHub checkout as a CLI.
   - Report a version mismatch or a failed installation; do not conceal it.

3. Install the public community Skills.
   - Run npx skills add imMamdouhaboammar/get-fable using the suitable
     non-interactive or interactive flags for the current environment.
   - Verify installed Skill entry points and do not deploy absent or
     restricted packages. Preserve any existing user-owned Skills.

4. Configure the selected project and hosts.
   - Run get-fable init from the confirmed repository root after checking
     existing .fable/ and docs/SPEC.md files.
   - Show me any operations that would replace customized configuration.
   - With safe boundaries confirmed, run get-fable install all and
     get-fable skills install all. If a host is unsupported, skip that host
     and report it accurately. Never forge a successful status.

5. Offer optional tooling, but obtain consent first.
   - Ask whether to inspect/provision fable-eco profiles. Start with
     get-fable eco discover --json-v1 and a plan, not an install.
   - Get explicit approval before installing external tools, enabling
     shell aliases, changing git hooks, using credentials, modifying global
     settings, or installing optional quality gates.

6. Verify the final environment.
   - Run get-fable status --json-v1, get-fable doctor --json-v1, and
     get-fable lint; collect actual exit codes and relevant diagnostics.
   - Run a read-only routing smoke test: get-fable route "inspect this
     repository for its entry point". Do not use --apply for this test.
   - If a check fails, diagnose it, make only approved bounded repairs,
     and rerun. Otherwise mark the missing proof as unresolved.
   - Keep changes to application source out of scope.

7. Coach me in Arabic or English, according to my preference.
   - Explain the daily loop: discover -> plan -> implement/test -> verify
     -> review -> handoff/release, with two realistic project examples.
   - Show the minimum commands for checking status, routing a task,
     recording progress, investigating failure, and running doctor.

Deliver a setup receipt with: repository path; OS; CLI version and package
source; public Skills installed; detected/configured hosts and integration
tiers; optional actions proposed/approved/skipped; changed files and how
to roll back each one; command exit codes; doctor warnings/errors; and a
short list of unresolved limitations. Never say "fully configured" unless
the observable checks prove it. No secrets in logs or final response.
```

The Skills-only installation is useful without the CLI. CLI state, hooks, and diagnostics require the separately installed runtime. A project's own tests are still required for any subsequent coding task; a passing installation doctor does not certify application behavior.
