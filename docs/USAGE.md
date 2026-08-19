# Usage: get-fable 1.2

This guide documents behavior implemented in the repository. Model names and historical prompt assets are not evidence of vendor affiliation or model equivalence.

## Requirements

- Bun 1.3.0 or newer
- Python 3 for lifecycle hooks on hosts that use them
- Git for source-based setup

## Inspect first

```bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable
bun ./bin/get-fable.js help
bun ./bin/get-fable.js doctor
```

Running the CLI without a command is non-mutating.

## Initialize a project

```bash
bun /path/to/get-fable/bin/get-fable.js init
```

Initialization creates missing working files and installs the canonical lifecycle skills under `.agents/skills/`. Existing project-owned targets are preserved.

The initial state uses schema v2 with `mutationGeneration=0` and `verifiedGeneration=-1`.

## Route work

```bash
get-fable route "Check the latest official API docs before implementation"
get-fable route "Fix this regression test-first"
get-fable route "Review this diff before merge"
get-fable route "Review this authorization change for vulnerabilities"
```

Persist a routing decision when you want the durable state to follow it:

```bash
get-fable route "Design the migration" --apply --json
```

## Work cards

Set the current bounded unit of work:

```bash
get-fable card "Add migration reader and prove legacy compatibility"
```

Clear it when no card is active:

```bash
get-fable card --clear
```

## Record mutations

Hosts with write hooks do this automatically. On a host without mutation events, record the workspace change explicitly:

```bash
get-fable mutation "updated migration reader"
```

A mutation advances `mutationGeneration`. Earlier verification remains recorded but becomes stale for completion.

## Record evidence

```bash
get-fable evidence pass test "bun test" "affected tests passed"
get-fable evidence fail runtime "smoke" "integration path still fails"
get-fable evidence pass security "diff review" "no reportable finding in changed trust boundary"
get-fable evidence pass research "official docs" "API contract confirmed"
```

Evidence kinds:

```text
test
build
runtime
review
observation
security
research
receipt
handoff
```

Only test, build, runtime, review, observation, and security can advance `verifiedGeneration`.

Research supports decisions. Receipt supports execution provenance. Handoff supports continuity. None of those three proves behavior correctness.

## Complete substantial work

Typical explicit CLI flow:

```bash
get-fable state executing --substantial
get-fable mutation "implemented accepted card"
get-fable state verifying
get-fable evidence pass test "bun test" "all affected tests passed"
get-fable state complete
```

Completion is rejected when the current mutation generation has no fresh passing completion-capable evidence.

## Repeated failure

Two consecutive completion-evidence failures move active work into `recovering` and select `fable-recover`.

Recovery checks harness and environment first, actual execution path second, product logic third, and the violated invariant last.

## Lifecycle skills

```text
Core
  get-fable
  fable-discover
  fable-plan
  fable-execute
  fable-verify
  fable-recover

Intelligence
  fable-research

Build
  fable-tdd
  fable-delegate

Proof
  fable-review
  fable-security

Delivery
  fable-release
  fable-handoff

Evolution
  fable-eval
```

The registry decides which specialist is needed. Do not load the whole pack into context for every task.

## Install host integrations

```bash
get-fable install
```

Supported installation paths include Claude Code and the repository's Antigravity / Gemini target. Agent Kernel rules are copied only when an existing Agent Kernel directory is detected.

The Claude and Antigravity adapters use the same Python hook implementations for session context, delegation guard, failure recovery, mutation tracking, and close enforcement.

## Request proxy

```bash
get-fable serve 8080
```

The proxy binds to loopback by default, does not enable permissive CORS by default, limits request bodies, accepts only HTTP/HTTPS upstream URLs, and does not provide its own authentication boundary.

## Diagnostics

```bash
get-fable status
get-fable status --json
get-fable doctor
get-fable doctor --json
get-fable lint
```

`lint` checks human ledger contracts together with durable-state completion semantics.

## Repository gate

For changes to get-fable itself:

```bash
bun run typecheck
bun test
bun run build
```

CI additionally runs the declared Bun floor, the pinned current Bun runtime on Linux and macOS, coverage, lifecycle smoke tests, and package inspection.
