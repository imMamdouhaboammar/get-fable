# Using get-fable day to day

Once the public Skills and optional CLI are installed, use get-fable to make your engineering loop explicit and easy to resume.

## Start in your project

```bash
get-fable --version
get-fable status --json-v1
get-fable doctor --json-v1
```

If this project is new to get-fable, read the [installation guide](INSTALLATION.md) before running `get-fable init`.

## Choose the next step

```bash
get-fable route "investigate checkout failures before changing code"
```

Routing guidance should be grounded in current evidence and repo state. A read-only route call does not implement or test the requested feature.

## Work on a bounded task

1. Locate the real code path and reproduce the issue.
2. Define acceptance criteria in a work card or project spec.
3. Use a failing test when behavior can be tested safely.
4. Make the smallest useful production change.
5. Rerun the relevant checks **after** the last change.
6. Review the diff and summarize proof, risks, and remaining work.

Typical CLI commands include:

```bash
get-fable card "Investigate duplicate payment event handling"
get-fable status --json-v1
get-fable lint
```

CLI support and argument details can change between releases. Run `get-fable --help` and the relevant subcommand help in your installed version before automating an unfamiliar operation.

## Handle failure honestly

When an attempted fix or setup fails repeatedly, stop repeating the same command. Capture the error, verify which artifact and configuration are actually in use, and choose a discriminating diagnostic probe before trying again.

Treat a passing doctor as evidence about the harness, not as proof that the application's tests passed.

## Host setup and optional tools

```bash
get-fable install all
get-fable skills install all
get-fable eco discover --json-v1
```

Host setup can change files outside the project and `fable-eco` can propose external tool installation. Inspect the plan and obtain the user's consent for global configuration, git hook changes, credentials, or optional package provisioning.

## Skills and the CLI are different

The public Skills are readable markdown playbooks. They can influence the agent's work even without the CLI installed. CLI-backed state, host adapters, diagnostics, and hooks require the separately published runtime. The source-only public GitHub repository does not ship an executable `bin/get-fable.js` file.

For a guided automated setup, send your agent the [setup prompt](AGENT_SETUP_PROMPT.md) and ask it to follow the [onboarding playbook](install-and-init-get-fable.md).
