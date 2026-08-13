# Usage: get-fable 1.1

This guide documents behavior implemented in the repository. Model names and historical prompt assets are not evidence of vendor affiliation or model equivalence.

## Requirements

- Bun 1.1 or newer
- Python 3 for lifecycle hooks on hosts that use them
- Git for source-based setup

## Inspect before installing

```bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable

bun ./bin/get-fable.js help
bun ./bin/get-fable.js status
```

Running the CLI without a command shows help and does not install anything.

## Initialize a project

From the project you want to prepare:

```bash
bun /path/to/get-fable/bin/get-fable.js init
```

Missing files are created under:

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

Existing project-owned targets are skipped rather than replaced.

## Route a task without calling a model

```bash
bun ./bin/get-fable.js route "Review this diff before merge"
```

Machine-readable output:

```bash
bun ./bin/get-fable.js route "The same test failed twice" --json
```

The decision contains:

- selected skill
- confidence
- concise reasons
- whether planning is required
- allowed next skills
- diagnostic scores

Routing is deterministic. Repeated failure selects recovery before another edit. Completion/review requests select verification. Unknown repository or documentation facts select discovery. Architecture and broad decomposition select planning. Bounded concrete edits select execution.

## Doctor

```bash
bun ./bin/get-fable.js doctor
bun ./bin/get-fable.js doctor --json
```

Checks include:

- canonical skill registry and transition targets
- OpenAI plugin manifest
- project state schema when `.fable` is active
- project-local canonical skill presence
- Python 3 availability for lifecycle hooks

Warnings do not make the command fail. Error-severity checks return a nonzero exit code.

## Status

```bash
bun ./bin/get-fable.js status
bun ./bin/get-fable.js status --json
```

Status reports Claude, Antigravity, Agent Kernel, and current project installation state. JSON output is stable enough for automation and does not include ANSI formatting.

## Lint task state

```bash
bun ./bin/get-fable.js lint
```

Lint checks:

- open ledger cards have an explicit acceptance check
- closed cards have substantive evidence annotations
- state JSON is valid when present
- substantial completed work contains passing evidence
- repeated failure is not left in the executing phase

## Global install

```bash
bun ./bin/get-fable.js install
```

The installer can write to:

```text
~/.claude/
~/.gemini/config/
~/.agent-kernel/   # only when the directory already exists
```

### Claude Code

The installer:

- installs the canonical six-skill pack under `~/.claude/skills/`
- retains `fable-mode` as a compatibility skill
- copies four lifecycle hooks under the compatibility skill
- merges hook registrations into `settings.json`
- appends the Fable workflow rules to `CLAUDE.md` once

Malformed existing JSON stops installation instead of being replaced.

### Antigravity / Gemini target

The installer:

- installs the canonical skill pack into the get-fable plugin
- installs the same canonical skills globally under the configured skills directory
- retains `fable-mode` for compatibility
- installs the rule file
- gives the plugin its own hook copies
- registers those plugin-owned hook paths in `hooks.json`

The historical broad asset library is no longer the default workflow payload.

Dedicated install:

```bash
bun ./bin/get-fable.js install-antigravity
```

### Agent Kernel

If the configured Agent Kernel directory already exists, the global installer writes the Fable rule under `rules/`. It does not create a complete Agent Kernel installation.

### Test-safe directory overrides

```text
CLAUDE_CONFIG_DIR
FABLE_GEMINI_CONFIG_DIR
FABLE_AGENT_KERNEL_DIR
```

## Local request proxy

Start in preview mode:

```bash
bun ./bin/get-fable.js serve 8080
```

Alias:

```bash
bun ./bin/get-fable.js router 8080
```

The proxy binds to `127.0.0.1` by default.

Endpoints:

```text
GET  /health
GET  /v1/health
POST /chat/completions
POST /v1/chat/completions
```

### Contextual compilation

For each valid request, the proxy:

1. normalizes the supported request shape
2. finds the latest user intent when available
3. routes the task through the canonical skill registry
4. compiles a short core contract plus only the selected skill
5. includes compact project state when `.fable/state.json` is available
6. prepends the compiled directive while preserving the caller's original system context

Preview responses expose routing metadata:

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

The reasons explain the routing rule. They are not private chain-of-thought.

### Forwarding mode

```bash
export UPSTREAM_OPENAI_URL="https://your-provider.example/v1/chat/completions"
bun ./bin/get-fable.js serve 8080
```

The upstream URL must use HTTP or HTTPS. The proxy preserves upstream status, content type, and response bytes. The inbound `Authorization` header is forwarded only when an upstream is configured.

Defaults:

```text
FABLE_HOST                 127.0.0.1
FABLE_CORS_ORIGIN          disabled unless set
FABLE_MAX_BODY_BYTES       1048576
FABLE_UPSTREAM_TIMEOUT_MS  30000
UPSTREAM_OPENAI_URL        optional
```

The proxy has no built-in user authentication or authorization boundary. If you bind it beyond loopback, add appropriate external controls.

## Supported request shapes

OpenAI-style messages:

```json
{
  "model": "example-model",
  "messages": [
    { "role": "user", "content": "Review this change before merge" }
  ]
}
```

Gemini-style contents remain normalized by `ProviderTranslator`, including structured system instructions.

Request-shape support is not a claim of complete compatibility with every provider API.

## Historical assets

```bash
bun ./bin/get-fable.js assets
bun ./bin/get-fable.js prompt
```

`assets` reports the broader bundled reference library. Those assets are not automatically part of the canonical execution workflow.

`prompt` prints the compatibility execution prompt. It does not assign a synthetic model identity.

Review `THIRD_PARTY_NOTICES.md` before redistributing bundled upstream material.

## Development checks

```bash
bun install
bun run typecheck
bun test
bun run build
bun run check
```

CI verifies the declared Bun floor and the pinned current Bun runtime on Ubuntu, plus the pinned current runtime on macOS.
