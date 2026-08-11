# Usage: `get-fable`

This guide documents behavior implemented in the repository

It does not treat bundled prompts, model names, or community material as proof of vendor affiliation or model equivalence

## Requirements

- Bun 1.1 or newer
- Python 3 for lifecycle hooks
- Git for source-based setup

## 1. Clone and inspect

```bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable

bun ./bin/get-fable.js status
bun ./bin/get-fable.js assets
```

Running `get-fable` without a command only shows help

Installation is always explicit

```bash
bun ./bin/get-fable.js install
```

## 2. Initialize one project

From the project you want to prepare

```bash
bun /path/to/get-fable/bin/get-fable.js init
```

This creates missing targets under

```text
.fable/
  LEDGER.md
  PROGRESS.md
  VERIFIER_PROMPT.md

.agents/
  skills/fable-mode/SKILL.md
  rules/fable5-mode.md

docs/
  SPEC.md
```

Existing target files are skipped rather than replaced

That rule applies to the project ledger/spec templates as well as the workspace skill and rules

## 3. Global install

```bash
bun ./bin/get-fable.js install
```

The installer can write to

```text
~/.claude/
~/.gemini/config/
~/.agent-kernel/   # only when this directory already exists
```

### Claude Code

The installer

- writes `~/.claude/skills/fable-mode/SKILL.md`
- copies the lifecycle hooks under that skill directory
- merges hook registrations into `~/.claude/settings.json`
- appends the Fable workflow rules to `~/.claude/CLAUDE.md` once

If `settings.json` exists but is not valid JSON, installation stops instead of replacing it with a new object

### Antigravity / Gemini config target

The installer

- writes `~/.gemini/config/rules/fable5-mode.md`
- writes `~/.gemini/config/plugins/get-fable/plugin.json`
- copies bundled skills into the plugin directory
- copies lifecycle hooks into `~/.gemini/config/plugins/get-fable/hooks/`
- writes `~/.gemini/config/skills/fable-mode/SKILL.md`
- registers the plugin-owned hook paths in `~/.gemini/config/hooks.json`

The Antigravity install no longer depends on Claude Code hook files being present

### Agent Kernel

If `~/.agent-kernel` already exists, the installer writes

```text
~/.agent-kernel/rules/fable5-mode.md
```

It does not create a complete Agent Kernel installation

### Test-safe directory overrides

The following environment variables can redirect configuration targets

```text
CLAUDE_CONFIG_DIR
FABLE_GEMINI_CONFIG_DIR
FABLE_AGENT_KERNEL_DIR
```

They are useful for isolated testing and controlled environments

## 4. Dedicated Antigravity install

```bash
bun ./bin/get-fable.js install-antigravity
```

This command installs the rule, plugin, skill, hook files, and hook registrations required by the Antigravity / Gemini config target

It does not require a previous Claude Code installation

## 5. Status

```bash
bun ./bin/get-fable.js status
```

Current checks include

- Claude Fable skill presence
- Claude lifecycle hook registration count
- Antigravity / Gemini rule presence
- Antigravity plugin presence
- Antigravity lifecycle hook registration count
- Agent Kernel rule presence
- whether the current project has a `.fable` directory

`status` checks installation state, not the correctness of every bundled skill

## 6. Bundled assets

```bash
bun ./bin/get-fable.js assets
bun ./bin/get-fable.js prompt
```

`assets` counts the current repository directories rather than relying on a marketing total

`prompt` prints the bundled prompt file used by the command

See `THIRD_PARTY_NOTICES.md` before redistributing bundled third-party material

## 7. Local request proxy

Start the proxy

```bash
bun ./bin/get-fable.js serve 8080
```

Alias

```bash
bun ./bin/get-fable.js router 8080
```

The port must be an integer from 1 through 65535

The server binds to `127.0.0.1` by default

Health endpoints

```text
GET /health
GET /v1/health
```

Chat endpoints

```text
POST /chat/completions
POST /v1/chat/completions
```

Requests should use `Content-Type: application/json`

Malformed JSON and unsupported request shapes return `400`

Unsupported content types return `415`

The default request-body limit is 1 MiB and oversized requests return `413`

Oversized chunked requests stop being consumed once the limit is crossed and the response closes the connection

### Preview mode

If `UPSTREAM_OPENAI_URL` is not set, the server does not call a model provider

It returns a synthetic completion-style response with `previewMode: true`, `fableEnriched: true`, and prompt-size metadata

### Forwarding mode

Set one absolute HTTP or HTTPS upstream URL

```bash
export UPSTREAM_OPENAI_URL="https://your-provider.example/v1/chat/completions"
bun ./bin/get-fable.js serve 8080
```

The proxy forwards the normalized and enriched body and passes through the inbound `Authorization` header when one is present

Upstream response status, bytes, and content type are passed through without assuming the body is JSON

The default upstream timeout is 30 seconds

### Proxy environment variables

```text
FABLE_HOST                 default 127.0.0.1
FABLE_CORS_ORIGIN          no default, CORS is off unless configured
FABLE_MAX_BODY_BYTES       default 1048576
FABLE_UPSTREAM_TIMEOUT_MS  default 30000
UPSTREAM_OPENAI_URL        optional forwarding target
```

If you set `FABLE_HOST` to a non-loopback interface, apply your own network access controls and authentication boundary

The proxy itself does not provide user authentication or authorization

## Request shapes normalized today

### OpenAI-style `messages`

```json
{
  "model": "example-model",
  "messages": [
    { "role": "user", "content": "Review this change" }
  ]
}
```

### Gemini-style `contents`

```json
{
  "model": "example-model",
  "systemInstruction": {
    "parts": [{ "text": "Follow the project rules" }]
  },
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "Review this change" }]
    }
  ]
}
```

The normalizer converts these supported shapes into the repository's generic chat request format before context injection

This is not a complete protocol adapter for every model provider

## Command reference

```text
install               Install supported global integrations
install-antigravity   Install the Antigravity / Gemini config target
init                  Create missing project-local Fable files
serve [port]          Start the local request proxy, default 8080
router [port]         Alias for serve
lint                  Verify the current project ledger
status                Report selected installation state
assets                Count bundled asset groups
prompt                Print the bundled prompt
version               Print the package version
help                  Show CLI help
```

## Development checks

Install development dependencies

```bash
bun install
```

Run all checks

```bash
bun run check
```

Individual checks

```bash
bun run typecheck
bun test
bun test --coverage
bun run build
```

CI runs typechecking, the full test suite with coverage, a build, CLI smoke checks, and an npm package-content dry run

## Rollback

There is no automated uninstall command yet

For project initialization, remove only files you have inspected and no longer need

For global integrations, inspect the affected configuration before removing hook entries or files

If an existing JSON configuration is malformed, `get-fable` refuses to rewrite it. Repair or restore that file first
