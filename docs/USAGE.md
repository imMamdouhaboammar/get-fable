# Usage: get-fable 1.1

This guide documents behavior implemented in the repository

Model names and historical prompt assets are not evidence of vendor affiliation or model equivalence

## Requirements

- Bun 1.3.0 or newer
- Python 3 for lifecycle hooks on hosts that use them
- Git for source-based setup

## Inspect before installing

```bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable

bun ./bin/get-fable.js help
bun ./bin/get-fable.js status
bun ./bin/get-fable.js doctor
```

Running the CLI without a command shows help and does not install anything

## Initialize a project

From the project you want to prepare

```bash
bun /path/to/get-fable/bin/get-fable.js init
```

Missing files are created under

```text
.fable/
  LEDGER.md
  PROGRESS.md
  VERIFIER_PROMPT.md
  state.json

.agents/
  rules/fable5-mode.md
  skills/
    registry.json
    get-fable/SKILL.md
    fable-discover/SKILL.md
    fable-plan/SKILL.md
    fable-execute/SKILL.md
    fable-verify/SKILL.md
    fable-recover/SKILL.md
    fable-mode/SKILL.md       # compatibility alias

docs/
  SPEC.md
```

Existing project-owned targets are skipped rather than replaced

## Inspect a routing decision

Routing does not require an LLM call

```bash
bun ./bin/get-fable.js route "Review this diff before merge"
```

Machine-readable output

```bash
bun ./bin/get-fable.js route "The same test failed twice" --json
```

The decision contains

- selected skill
- confidence
- concise reasons
- whether planning is required
- allowed next skills
- diagnostic scores

Routing priority

1. repeated or stale failure selects recovery
2. completion, proof, or review selects verification
3. unresolved repository or current documentation facts select discovery
4. architecture and broad decomposition select planning
5. bounded concrete edits select execution

## Apply routing to durable state

For an initialized project

```bash
bun ./bin/get-fable.js route "Design a modular migration across several files" --apply
```

`--apply` persists the decision in `.fable/state.json`, marks broad/recovery/verification work as substantial, and moves the phase to the selected workflow

Use `--json` together with `--apply` for machine output

```bash
bun ./bin/get-fable.js route "Review this change" --apply --json
```

## Drive the workflow state

Explicit phase transitions

```bash
bun ./bin/get-fable.js state executing
bun ./bin/get-fable.js state verifying
```

Mark an otherwise small round as substantial when needed

```bash
bun ./bin/get-fable.js state executing --substantial
```

Machine output

```bash
bun ./bin/get-fable.js state verifying --json
```

Invalid transitions return an error instead of silently rewriting state

For substantial work, `state complete` is rejected until passing evidence exists

## Record evidence

Evidence syntax

```text
get-fable evidence <pass|fail> <test|build|runtime|review|observation> <source> <detail>
```

Examples

```bash
bun ./bin/get-fable.js evidence pass test "bun test" "42 affected tests passed"
bun ./bin/get-fable.js evidence pass runtime "smoke request" "POST /v1/chat/completions returned 200"
bun ./bin/get-fable.js evidence fail runtime "smoke request" "request still returns 500"
```

A passing record resets the failure streak

A failing record increments it

Two consecutive failures move non-complete durable state to

```text
phase=recovering
currentSkill=fable-recover
```

That transition is also performed by the Bash failure lifecycle hook on supported hosts

## Complete a substantial round

A complete lifecycle can be driven explicitly

```bash
bun ./bin/get-fable.js route "Design a modular migration" --apply
bun ./bin/get-fable.js state executing
# perform the bounded implementation
bun ./bin/get-fable.js state verifying
# run the affected checks
bun ./bin/get-fable.js evidence pass test "bun test" "42 affected tests passed"
bun ./bin/get-fable.js state complete
```

On hosts with lifecycle hooks, the Stop guard will refuse to close substantial work before both passing state evidence and phase `complete` exist

## Doctor

```bash
bun ./bin/get-fable.js doctor
bun ./bin/get-fable.js doctor --json
```

Checks include

- canonical skill registry and transition targets
- OpenAI plugin manifest
- project state schema when `.fable` is active
- canonical project skill presence
- Python 3 availability for lifecycle hooks

Warnings do not make the command fail

Error-severity checks return a nonzero exit code

The get-fable source repository validates against root `skills/` while initialized consumer projects validate their `.agents/skills/` copies

## Status

```bash
bun ./bin/get-fable.js status
bun ./bin/get-fable.js status --json
```

Status reports Claude, Antigravity, Agent Kernel, and current project installation state

JSON output contains no ANSI formatting

## Lint task state

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

### PostToolUse

`fable_fail_streak.py` updates durable failure state after Bash results

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
bun run typecheck
bun test
bun run build
bun run check
```

CI verifies Bun 1.3.0 as the runtime floor, Bun 1.3.14 with coverage and package inspection on Ubuntu, and Bun 1.3.14 on macOS

Each matrix job also exercises the durable CLI lifecycle from `init` through routing, execution, verification, evidence, and `complete`
