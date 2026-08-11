<div align="center">

<img src="https://img.shields.io/badge/get--fable-v1.0.0-6C63FF?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01ek0yIDE3bDEwIDUgMTAtNS0xMC01TDIgMTd6TTE2IDE3bC00IDIgLTQtMiI+PC9wYXRoPjwvc3ZnPg==&labelColor=0D1117" alt="version" />

# 🛡️ get-fable

### *Make ANY AI model operate with the intelligence, process discipline,*
### *and engineering rigor of Anthropic's flagship Claude Fable 5 / Mythos Tier.*

<br/>

[![npm version](https://img.shields.io/npm/v/get-fable?style=for-the-badge&logo=npm&logoColor=white&color=CC3534&labelColor=0D1117)](https://www.npmjs.com/package/get-fable)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=0D1117)](https://opensource.org/licenses/MIT)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-FBF0DF?style=for-the-badge&logo=bun&logoColor=14151A&labelColor=0D1117)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0D1117)](https://www.typescriptlang.org/)

<br/>

[![Works with Claude Code](https://img.shields.io/badge/Claude%20Code-Supported-D97706?style=for-the-badge&logo=anthropic&logoColor=white&labelColor=0D1117)](https://claude.ai)
[![Works with Gemini CLI](https://img.shields.io/badge/Gemini%20CLI-Supported-4285F4?style=for-the-badge&logo=google&logoColor=white&labelColor=0D1117)](https://github.com/google-gemini/gemini-cli)
[![Works with OpenAI](https://img.shields.io/badge/OpenAI%20GPT--4o-Supported-10A37F?style=for-the-badge&logo=openai&logoColor=white&labelColor=0D1117)](https://openai.com)
[![Works with Ollama](https://img.shields.io/badge/Ollama-Supported-7C3AED?style=for-the-badge&logo=ollama&logoColor=white&labelColor=0D1117)](https://ollama.com)

<br/>

[![51 Skills](https://img.shields.io/badge/51-Leaked%20Skills-EC4899?style=for-the-badge&labelColor=0D1117)](./assets/skills)
[![10 Agents](https://img.shields.io/badge/10-Agent%20Definitions-F59E0B?style=for-the-badge&labelColor=0D1117)](./assets/agents)
[![4 Mechanical Hooks](https://img.shields.io/badge/4-Mechanical%20Hooks-06B6D4?style=for-the-badge&labelColor=0D1117)](./hooks)
[![3 System Prompts](https://img.shields.io/badge/3-System%20Prompts-8B5CF6?style=for-the-badge&labelColor=0D1117)](./assets/prompts)

<br/>

```
output quality = model capability × process discipline
```

</div>

---

## ⚡ Install in Seconds

Run a single command to install the Fable 5 System Prompt, process discipline engine, and mechanical guard hooks across **every** AI agent platform you use:

```bash
# Bun (recommended)
bunx get-fable install

# npm
npx get-fable install
```

> 🎯 **Zero config, zero setup.** Automatically detects and provisions Claude Code, Antigravity (Gemini CLI), Agent Kernel, and Cursor.

<br/>

### 🔮 Antigravity / Gemini CLI

Install `get-fable` as a native **Antigravity plugin** with global rules, skills, and hooks:

```bash
bunx get-fable install-antigravity
```

### 📁 Workspace Initialization

Bootstrap Fable Mode discipline into any existing project:

```bash
bunx get-fable init
```

Creates `.fable/LEDGER.md`, `docs/SPEC.md`, `.agents/skills/`, and `.agents/rules/` for process-locked work.

### 🌐 Mythos Router

Start the local proxy server and wrap **any LLM provider** (OpenAI, Gemini, Ollama, DeepSeek) with Fable-grade context injection:

```bash
bunx get-fable serve 8080
```

---

## 🧠 What is Fable Mode?

Fable Mode is Anthropic's internal process system that makes Claude Code operate at its peak performance. It enforces:

| Principle | What it enforces |
|---|---|
| 🗺️ **Plan Gate** | No implementation until a `SPEC.md` and `PLAN.md` are written and approved |
| 📒 **Ledger Discipline** | Every task tracked in `.fable/LEDGER.md` with acceptance criteria and `-- evidence:` annotations |
| 🔁 **Attribution Ladder** | On 3 consecutive failures → `Harness → Runtime → Product → Class fix` |
| 🛑 **Spawn Guard** | Enforces model capability ceilings before sub-agents are spawned |
| ✅ **Close Guard** | Blocks ending a turn if tasks are unverified or evidence is missing |

`get-fable` extracts this entire system and installs it onto **any AI model**, turning even lightweight local models into disciplined engineering agents.

---

## 📦 Bundled Asset Vault

`get-fable` bundles and operationalizes **13 primary Anthropic source asset groups** — leaked and reverse-engineered from production Claude deployments:

<br/>

<div align="center">

| Asset Group | Count | Source |
|:---|:---:|:---|
| 🤖 **System Prompts** | 3 | Claude Code Fable 5, Claude Design, Docs Assistant |
| 🧩 **Leaked Agents** | 10 | `Explore`, `Plan`, `general-purpose`, `claude-code-guide`, `observer`, `worker`… |
| 🛠️ **Claude Code Skills** | 29 | `dataviz`, `artifact-design`, `security-review`, `claude-api`, `deep-research`, `debug`… |
| 🎨 **Claude Design Skills** | 22 | `make-a-deck`, `3d-object`, `animated-video`, `hi-fi-design`, `create-design-system`… |
| ⌨️ **Slash Commands** | 9 | `/goal`, `/compact`, `/recap`, `/insights`, `/team-onboarding`… |
| 💡 **Injected Reminders** | 8 | Dynamic context + safety reminders fired at session boundaries |
| 🧱 **Starter Components** | 10 | `deck-stage.js`, `animations-v2.jsx`, `browser-window.jsx`, `tweaks-panel.jsx`… |
| 🌐 **Mythos Router** | 1 | Local proxy server adapted from `thewaltero/mythos-router` |

</div>

<br/>

Enumerate all assets anytime:

```bash
bunx get-fable assets
```

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         get-fable CLI                               │
│                      bunx get-fable <cmd>                           │
├──────────────────┬───────────────────┬────────────────┬────────────┤
│  Multi-Platform  │  Fable Discipline │  Mythos Router │  Asset     │
│  Installer       │  Engine           │  Proxy Server  │  Vault     │
│                  │                   │                │            │
│ • Claude Code    │ • Spec/Plan Gate  │ • HTTP Proxy   │ • Prompts  │
│ • Antigravity    │ • Ledger Lint     │ • Context Inj. │ • Skills   │
│ • Agent Kernel   │ • Guard Hooks ×4  │ • Model Router │ • Agents   │
│ • Cursor         │ • Fail-Streak     │ • Any Provider │ • Comps    │
└──────────────────┴───────────────────┴────────────────┴────────────┘
```

<br/>

> 📖 Deep-dive documentation:
> - [Architecture Overview →](docs/ARCHITECTURE.md)
> - [ADR-001: Fable SuperSystem →](docs/ADR-001-fable-supersystem.md)
> - [Full CLI Usage Guide →](docs/USAGE.md)

---

## 🔩 Mechanical Guard Hooks

Four production-grade hooks fire automatically at session boundaries and tool execution points:

```
SessionStart  →  🔒 Profile Injector   — injects dynamic discipline profile from ledger
PreToolUse    →  🛡️  Spawn Guard        — enforces Plan Gate before sub-agents spawn
PostToolUse   →  📊 Fail-Streak        — triggers Attribution Ladder on 3+ consecutive errors
Stop          →  ✅ Close Guard        — blocks turn end if ledger items lack evidence
```

---

## 💻 CLI Reference

```
get-fable v1.0.0 — Fable 5 Mythos System & Multi-Model Upgrade Suite

USAGE
  $ bunx get-fable <command> [options]

COMMANDS
  install               Install Fable 5 globally across Claude Code, Antigravity & Agent Kernel
  install-antigravity   Install as native Antigravity plugin (~/.gemini/config)
  init                  Bootstrap .fable/ ledger, .agents/ rules/skills, and SPEC.md
  serve [port]          Start Mythos Router proxy (default: 8080)
  lint                  Verify .fable/LEDGER.md for evidence annotations
  status                Display installation status across all platforms
  assets                List all bundled Anthropic agents, skills, and prompts
  prompt                Output the complete Claude Code Fable 5 System Prompt
  help                  Show this help menu
```

---

## 🌍 Platform Support

<div align="center">

| Platform | Install Command | Config Path |
|:---|:---|:---|
| **Claude Code** | `bunx get-fable install` | `~/.claude/` |
| **Antigravity / Gemini CLI** | `bunx get-fable install-antigravity` | `~/.gemini/config/` |
| **Agent Kernel** | `bunx get-fable install` | `~/.agent-kernel/` |
| **Cursor** | `bunx get-fable install` | `.cursorrules` |
| **Any Project** | `bunx get-fable init` | `.agents/` + `.fable/` |

</div>

---

## 🗂️ Repository Structure

```
get-fable/
├── src/
│   ├── cli.ts                    # CLI entrypoint — all commands
│   ├── installer.ts              # Multi-platform installer engine
│   ├── assets-manager.ts         # Asset vault API
│   ├── fable-lint.ts             # Ledger & spec linter
│   └── router/
│       ├── index.ts              # Mythos Router proxy server
│       ├── provider-translator.ts # Request normalizer & prompt injector
│       └── context-injector.ts   # Skill & agent context loader
├── assets/
│   ├── prompts/                  # 3 leaked system prompts
│   ├── agents/                   # 10 leaked agent definitions
│   ├── skills/
│   │   ├── claude-code/          # 29 production Claude Code skills
│   │   └── claude-design/        # 22 production Claude Design skills
│   ├── slash-commands/           # 9 slash command specs
│   ├── injected-reminders/       # 8 dynamic safety reminders
│   └── starter-components/       # 10 leaked JSX/JS components
├── hooks/                        # 4 mechanical Python/TS guard hooks
├── docs/
│   ├── ADR-001-fable-supersystem.md
│   ├── ARCHITECTURE.md
│   └── USAGE.md
└── bin/
    └── get-fable.js              # Compiled CLI binary
```

---

## 🙏 Acknowledgements & Sources

This project operationalizes and structures leaked / reverse-engineered assets from the following public sources:

- [`cozytab/fable5-mode`](https://github.com/cozytab/fable5-mode) — Fable Mode discipline system
- [`thewaltero/mythos-router`](https://github.com/thewaltero/mythos-router) — Mythos Router proxy design
- [`asgeirtj/system_prompts_leaks`](https://github.com/asgeirtj/system_prompts_leaks) — Anthropic system prompt leaks (Claude Code & Claude Design)

---

## 📄 License

MIT License © 2026 [Mamdouh Abo Ammar](https://github.com/imMamdouhaboammar)

<div align="center">
<br/>

**Built with ❤️ to make every AI model a Fable-grade engineering partner.**

[![GitHub Stars](https://img.shields.io/github/stars/imMamdouhaboammar/get-fable?style=social)](https://github.com/imMamdouhaboammar/get-fable/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/imMamdouhaboammar/get-fable?style=social)](https://github.com/imMamdouhaboammar/get-fable/forks)

</div>
