# 🛡️ get-fable

> **Make ANY AI Model work with the performance, intelligence, and process discipline of Anthropic's flagship Claude models (Claude Fable 5 / Mythos Tier).**

`get-fable` is a zero-dependency full system that bundles Anthropic's leaked Claude Code & Claude Design system prompts, agents, skills, and components, alongside a model router and mechanical guard hooks to elevate **any** LLM (Claude, Gemini 3.5/3.6, GPT-4o, Ollama, Llama, DeepSeek) into a Fable-grade engineering system.

```
output quality = model capability × work discipline
```

---

## ⚡ Quickstart

Install Fable 5 System Prompt, discipline engine, and mechanical hooks globally across all AI agent platforms (**Claude Code**, **Antigravity / Gemini CLI**, **Agent Kernel**, **Cursor**, **OpenCode**):

```bash
bunx get-fable install
# OR
npx get-fable install
```

### Dedicated Antigravity Installation

To install `get-fable` specifically into **Antigravity / Gemini CLI** as a native plugin (`~/.gemini/config/plugins/get-fable`), registering global rules, skills, and hooks:

```bash
bunx get-fable install-antigravity
```

### Workspace Initialization

Initialize Fable Mode process discipline (`.fable/LEDGER.md`, `docs/SPEC.md`, `.agents/skills/`, `.agents/rules/`) in your current project:

```bash
bunx get-fable init
```

Start the Mythos Router proxy server to wrap requests for any LLM provider (OpenAI, Gemini, Ollama):

```bash
bunx get-fable serve 8080
```

Inspect installation status and active hooks:

```bash
bunx get-fable status
```

---

## 📦 Bundled Assets & Leaks Engine

`get-fable` aggregates and operationalizes 13 primary Anthropic source assets:

| Asset Group | Count | Description |
|---|---|---|
| **System Prompts** | 3 Prompts | Official leaked Anthropic System Prompts for Claude Code Fable 5, Claude Design, and Docs Assistant. |
| **Leaked Agents** | 10 Agents | Specialized agent definitions (`Explore`, `Plan`, `general-purpose`, `claude-code-guide`, `statusline-setup`, `observer`, `worker`, etc.). |
| **Claude Code Skills** | 30 Skills | Complete set of bundled Claude Code skills (`dataviz`, `artifact-design`, `claude-api`, `simplify`, `security-review`, `schedule`, `loop`, etc.). |
| **Claude Design Skills** | 22 Skills | Leaked Claude Design skills (`create-design-system`, `make-a-deck`, `3d-object`, `animated-video`, `save-as-pdf`, `hi-fi-design`, etc.). |
| **Slash Commands** | 9 Commands | Slash command specs (`/goal`, `/compact`, `/recap`, `/session-title`, `/team-onboarding`, etc.). |
| **Injected Reminders** | 8 Reminders | Dynamic context reminders and safety hooks. |
| **Starter Components** | 10 Components | Leaked Claude Design JSX/JS components (`deck-stage`, `animations-v2`, `browser-window`, `tweaks-panel`, `macos-window`, `doc-page`). |
| **Mythos Router** | 1 Proxy | Local HTTP proxy server adapted from `thewaltero/mythos-router` for dynamic model wrapping. |

List all bundled assets anytime:

```bash
bunx get-fable assets
```

---

## 🏛️ System Architecture

```
+-----------------------------------------------------------------------------------+
|                                  get-fable CLI                                    |
+---------------------+-----------------------+----------------------+--------------+
| Multi-Platform      | Fable Mode Discipline | Mythos Router Proxy  | Asset Vault  |
| Installer (Claude,  | Engine (Hooks,        | Server (HTTP Proxy,  | (Prompts,    |
| Antigravity, Kernel)| Spec/Ledger Lint)     | Context Injector)    | Skills, MCP) |
+---------------------+-----------------------+----------------------+--------------+
```

Detailed architecture specifications are documented in:
- [docs/ADR-001-fable-supersystem.md](docs/ADR-001-fable-supersystem.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/USAGE.md](docs/USAGE.md)

---

## 🛠️ Mechanical Guard Hooks

Fable Mode turns process discipline into mechanical blocks via four Python/TS hooks:

1. **Profile Injector** (`SessionStart`): Auto-injects dynamic project discipline sized to ledger state.
2. **Spawn Guard** (`PreToolUse`): Enforces the Plan Gate before sub-agents spawn and enforces model capability ceilings.
3. **Fail-Streak Reminder** (`PostToolUse`): Triggers the **Attribution Ladder** (Harness -> Runtime -> Product -> Class fix) after 3 consecutive errors.
4. **Close Guard** (`Stop`): Blocks ending the turn if ledger items are unverified or missing `-- evidence:` annotations.

---

## 💻 CLI Command Reference

```text
get-fable v1.2.0 — Fable 5 Mythos System & Multi-Model Upgrade Suite

USAGE:
  $ bunx get-fable [command]

COMMANDS:
  install              Installs Fable 5 Mode & System Prompt globally across Claude Code, Antigravity, & Agent Kernel
  install-antigravity  Installs Fable 5 Plugin, Rules, Skills, and Hooks specifically into Antigravity (~/.gemini/config)
  init                 Initializes .fable/ ledger, .agents/ rules/skills, and SPEC.md in current project
  serve                Starts the Mythos Router proxy server to wrap any LLM provider (OpenAI, Gemini, Ollama)
  lint                 Verifies .fable/LEDGER.md for acceptance criteria and evidence annotations
  status               Displays current installation status across Claude Code & Antigravity
  assets               Lists all bundled Anthropic Claude Code & Design agents, skills, and prompts
  prompt               Outputs the complete Anthropic Claude Code Fable 5 System Prompt
  help                 Displays the help menu
```

---

## 📄 License

MIT License © 2026 Mamdouh Abo Ammar
