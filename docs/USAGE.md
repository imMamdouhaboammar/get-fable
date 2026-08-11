# Usage: `get-fable`

This guide documents the behavior present in the repository today

It avoids model-version claims and provider promises that are not implemented in source

## Requirements

- Bun
- Python 3 for lifecycle hooks
- Git for source-based setup

## 1. Clone and inspect

```bash
git clone https://github.com/imMamdouhaboammar/get-fable.git
cd get-fable

bun ./bin/get-fable.js status
bun ./bin/get-fable.js assets
```

`status` reports the configuration targets the CLI can currently inspect

`assets` reads the repository and reports the bundled asset counts from disk

## 2. Initialize one project

Project initialization is the narrowest way to use `get-fable`

From your target project

```bash
bun /path/to/get-fable/bin/get-fable.js init
```

This creates

```text
.fable/LEDGER.md
.fable/PROGRESS.md
.fable/VERIFIER_PROMPT.md
.agents/skills/fable-mode/SKILL.md
.agents/rules/fable5-mode.md
docs/SPEC.md
```

Existing template targets are skipped rather than replaced

The generated files are meant to keep requirements, progress, and verification evidence outside the chat transcript

## 3. Global install

```bash
bun ./bin/get-fable.js install
```

The global installer currently touches these locations

```text
~/.claude/
~/.gemini/config/
~/.agent-kernel/   # only when this directory already exists
```

### Claude Code changes

The installer currently

- writes `~/.claude/skills/fable-mode/SKILL.md`
- copies four Python hooks under the same skill directory
- merges hook registrations into `~/.claude/settings.json`
- appends the Fable rules to `~/.claude/CLAUDE.md` once, based on the repository marker

### Antigravity / Gemini config changes

The installer currently

- writes `~/.gemini/config/rules/fable5-mode.md`
- writes `~/.gemini/config/plugins/get-fable/plugin.json`
- copies the bundled skills into the plugin directory
- writes `~/.gemini/config/skills/fable-mode/SKILL.md`
- registers Antigravity hook entries when the referenced hook files are available

### Agent Kernel changes

If `~/.agent-kernel` already exists, the installer writes

```text
~/.agent-kernel/rules/fable5-mode.md
```

It does not create a complete Agent Kernel installation

## Before a global install

Back up important custom agent configuration

The current JSON helper merges valid JSON and writes the updated result back to disk

Malformed JSON cannot be preserved reliably by the current helper, so global installation should not be used as a repair mechanism for broken configuration files

## 4. Dedicated Antigravity target

```bash
bun ./bin/get-fable.js install-antigravity
```

This writes the Antigravity / Gemini config files described above without running the full global installer

Hook registration is conditional on the referenced hook files being available

If you need the full Claude Code hook setup as well, use the global `install` command

## 5. Check status

```bash
bun ./bin/get-fable.js status
```

Current checks include

- Claude Fable skill presence
- number of registered Claude lifecycle hooks
- Antigravity / Gemini rule presence
- Antigravity plugin presence
- whether the current project has a `.fable` directory

`status` is an installation check, not a functional test of every bundled skill

## 6. Inspect bundled material

```bash
bun ./bin/get-fable.js assets
```

This counts the current repository directories for prompts, agents, skill families, slash commands, reminders, and starter components

To print the prompt file used by the CLI command

```bash
bun ./bin/get-fable.js prompt
```

Treat bundled material as inspectable source material, not as proof of official vendor provenance or endorsement

See [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)

## 7. Start the request proxy

```bash
bun ./bin/get-fable.js serve 8080
```

Aliases

```bash
bun ./bin/get-fable.js router 8080
```

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

The server normalizes supported request bodies, injects the Fable prompt context, and then does one of two things

### Preview mode

If `UPSTREAM_OPENAI_URL` is not set, the server returns a synthetic response describing the enriched request

No model provider is called by the router in this mode

### Forwarding mode

Set one upstream URL

```bash
export UPSTREAM_OPENAI_URL="https://your-provider.example/v1/chat/completions"
bun ./bin/get-fable.js serve 8080
```

The router forwards the normalized body and passes through the inbound `Authorization` header

The environment variable name reflects the current OpenAI-compatible transport shape. It should not be read as a promise that every OpenAI API feature or every provider API is supported

## Request shapes currently normalized

### `messages`

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
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "Review this change" }]
    }
  ]
}
```

The normalizer converts supported fields into the repository's generic chat request shape before context injection

This does not make the proxy a complete Gemini, Anthropic, OpenAI, Ollama, or OpenRouter protocol adapter

## Router security note

The current router has permissive CORS and no built-in authentication or authorization check

Do not expose it directly to an untrusted network

If it must be reachable beyond a trusted development environment, put it behind your own authenticated gateway and network controls

## Command reference

```text
install               Install supported global integrations
install-antigravity   Install the Antigravity / Gemini config target
init                  Create project-local Fable files
serve [port]          Start the request-enrichment proxy, default 8080
router [port]         Alias for serve
lint                  Verify the current project ledger
status                Report selected installation state
assets                Count and list bundled asset groups
prompt                Print the bundled Fable prompt used by the CLI command
help                   Show CLI help
```

## Rollback

The current CLI does not include an automated uninstall command

For project-local initialization, remove only the files created by `init` after confirming they do not contain work you want to keep

For global installation, inspect the changed files under `~/.claude` and `~/.gemini/config` before removing entries manually

If you keep important custom configuration in those locations, restore from your own backup rather than deleting the whole directory

## Compatibility language used in these docs

- **automatic target** means installer code exists for that target
- **request-shape support** means the normalizer handles the documented request structure
- **reusable asset** means a file can be consumed manually where another agent accepts that format

Those three meanings are deliberately kept separate
