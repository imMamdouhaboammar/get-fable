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

The initial state uses schema v2 with `mutationGeneration=0` and `verifiedGeneration=-1`. Workspace identity is derived from the canonical real project path, so path aliases of the same workspace do not create separate identities.

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

## Spark next move prediction

`fable-spark` is a situational awareness micro-policy running continuously over the lifecycle. It predicts the single most natural atomic next action based on 6 core signals (`USER INTENT`, `ACTIVE CARD`, `CURRENT SKILL`, `MISSING GATES`, `MUTATION DELTA`, `LATEST EVIDENCE / FAILS`):

```bash
# Print next move for agent or human
get-fable spark

# Structured machine output
get-fable spark "fix token refresh bug" --json
```

Output object format:
```json
{
  "suggestion": "run the affected refresh tests",
  "reasonCode": "verification-stale-after-mutation",
  "confidence": 0.93,
  "source": "mutation-delta",
  "silent": false
}
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

For normal implementation work, test, build, runtime, review, and observation can advance `verifiedGeneration`.

Security can advance `verifiedGeneration` when the routed job is itself a security review. A security pass alone does not prove a normal feature or bug repair. If a security repair changes product code, verify the changed behavior again with behavior-appropriate evidence.

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

Completion is rejected when the current mutation generation has no fresh passing evidence appropriate to the routed claim.

## Repeated failure

Two consecutive failure-relevant evidence records move active work into `recovering` and select `fable-recover`.

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

The Claude and Antigravity adapters use the same Python hook implementations for session context, delegation guard, failure recovery, mutation tracking, canonical workspace identity, and close enforcement.

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
bun ./bin/get-fable.js lint
```

Lint checks

- open ledger cards have an explicit acceptance check
- checked cards have substantive evidence annotations
- state JSON is valid when present
- substantial completed work contains passing evidence
- repeated failure is not left in the executing phase

## Lifecycle hooks

Hosts with hook support can enforce parts of the contract mechanically

### SessionStart

`fable_profile_inject.py` adds compact state context

```text
phase
failureStreak
substantial
selected canonical skill
open ledger cards
```

It does not assign a model tier or rank model names

### PreToolUse

`fable_spawn_guard.py` requires a live open ledger card before a large delegation

Small payloads, forks, and explicitly paused rounds are exempt

### PostToolUse and PostToolUseFailure

`fable_fail_streak.py` handles both Claude Bash result events. `PostToolUse`
resets the consecutive-failure streak after success. `PostToolUseFailure`
records a failure from Claude's top-level failure event, including failures that
do not expose a process exit code.

At two consecutive failures it selects `fable-recover` and injects the attribution order

```text
harness -> execution path -> product logic -> violated invariant
```

### Stop

`fable_close_guard.py` can block

- open cards
- checked cards without substantive ledger evidence
- substantial state without passing evidence
- substantial state whose phase has not reached `complete`

See `hooks/README.md` for the host-level contract

## Global install

```bash
bun ./bin/get-fable.js install
```

The installer can write to

```text
~/.claude/
~/.gemini/config/
~/.agent-kernel/   # only when the directory already exists
```

### Claude Code

The installer

- installs the canonical six-skill pack under `~/.claude/skills/`
- retains `fable-mode` as a compatibility skill
- copies four lifecycle hooks under the compatibility skill
- merges hook registrations into `settings.json`
- appends the Fable workflow rules to `CLAUDE.md` once

Malformed existing JSON stops installation instead of being replaced

### Antigravity / Gemini target

The installer

- installs the canonical skill pack into the get-fable plugin
- installs the same canonical skills globally under the configured skills directory
- retains `fable-mode` for compatibility
- installs the rule file
- gives the plugin its own hook copies
- registers those plugin-owned hook paths in `hooks.json`

The historical broad asset library is not the default workflow payload

Dedicated install

```bash
bun ./bin/get-fable.js install-antigravity
```

### Agent Kernel

If the configured Agent Kernel directory already exists, the global installer writes the Fable rule under `rules/`

It does not create a complete Agent Kernel installation

### Test-safe directory overrides

```text
CLAUDE_CONFIG_DIR
FABLE_GEMINI_CONFIG_DIR
FABLE_AGENT_KERNEL_DIR
```

## Local request proxy

Start in preview mode

```bash
bun ./bin/get-fable.js serve 8080
```

Alias

```bash
bun ./bin/get-fable.js router 8080
```

The proxy binds to `127.0.0.1` by default

Endpoints

```text
GET  /health
GET  /v1/health
POST /chat/completions
POST /v1/chat/completions
```

### Contextual compilation

For each valid request, the proxy

1. normalizes the supported request shape
2. finds the latest user intent when available
3. routes the task through the canonical skill registry
4. compiles a short core contract plus only the selected skill
5. includes compact project state when `.fable/state.json` is available
6. prepends the compiled directive while preserving the caller's original system context

Preview responses expose routing metadata

```json
{
  "fableEnriched": true,
  "previewMode": true,
  "routing": {
    "selectedSkill": "fable-verify",
    "confidence": 0.9,
    "reasons": ["task explicitly asks for adversarial verification"],
    "nextSkills": ["fable-recover", "fable-execute"]
  }
}
```

The reasons explain routing rules and are not private chain-of-thought

### Forwarding mode

```bash
export UPSTREAM_OPENAI_URL="https://your-provider.example/v1/chat/completions"
bun ./bin/get-fable.js serve 8080
```

The upstream URL must use HTTP or HTTPS

The proxy preserves upstream status, content type, and response bytes

The inbound `Authorization` header is forwarded only when an upstream is configured

Defaults

```text
FABLE_HOST                 127.0.0.1
FABLE_CORS_ORIGIN          disabled unless set
FABLE_MAX_BODY_BYTES       1048576
FABLE_UPSTREAM_TIMEOUT_MS  30000
UPSTREAM_OPENAI_URL        optional
```

The proxy has no built-in user authentication or authorization boundary

If you bind it beyond loopback, add appropriate external controls

## Supported request shapes

OpenAI-style messages

```json
{
  "model": "example-model",
  "messages": [
    { "role": "user", "content": "Review this change before merge" }
  ]
}
```

Gemini-style contents remain normalized by `ProviderTranslator`, including structured system instructions

Request-shape support is not a claim of complete compatibility with every provider API

## Historical assets

```bash
bun ./bin/get-fable.js assets
bun ./bin/get-fable.js prompt
```

`assets` reports the broader bundled reference library

Those assets are not automatically part of the canonical execution workflow

`prompt` prints the compatibility execution prompt and does not assign a synthetic model identity

Review `THIRD_PARTY_NOTICES.md` before redistributing bundled upstream material

## Development checks

```bash
bun install
>>>>>>> origin/master
bun run typecheck
bun test
bun run build
```

CI additionally runs the declared Bun floor, the pinned current Bun runtime on Linux and macOS, coverage, lifecycle smoke tests, and package inspection.
