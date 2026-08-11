<div align="center">

# get-fable

### The Fable 5 Mythos System for every AI model.

Install Anthropic's internal Claude Code process engine — leaked system prompts, agent definitions, 51 production skills, and mechanical guard hooks — across Claude Code, Gemini CLI, OpenAI, Ollama, and any coding agent you run.

<br/>

[![npm version](https://img.shields.io/npm/v/get-fable?style=for-the-badge&logo=npm&logoColor=white&color=CC3534&labelColor=0D1117)](https://www.npmjs.com/package/get-fable)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=0D1117)](https://opensource.org/licenses/MIT)
[![Built with Bun](https://img.shields.io/badge/Built%20with-Bun-FBF0DF?style=for-the-badge&logo=bun&logoColor=14151A&labelColor=0D1117)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0D1117)](https://www.typescriptlang.org/)

<br/>

[![Claude Code](https://img.shields.io/badge/Claude%20Code-Supported-D97706?style=for-the-badge&logo=anthropic&logoColor=white&labelColor=0D1117)](https://claude.ai)
[![Gemini CLI](https://img.shields.io/badge/Gemini%20CLI-Supported-4285F4?style=for-the-badge&logo=google&logoColor=white&labelColor=0D1117)](https://github.com/google-gemini/gemini-cli)
[![OpenAI](https://img.shields.io/badge/OpenAI%20GPT--4o-Supported-10A37F?style=for-the-badge&logo=openai&logoColor=white&labelColor=0D1117)](https://openai.com)
[![Ollama](https://img.shields.io/badge/Ollama-Supported-7C3AED?style=for-the-badge&logo=ollama&logoColor=white&labelColor=0D1117)](https://ollama.com)

<br/>

[![Skills](https://img.shields.io/badge/51%20Skills-Leaked-EC4899?style=for-the-badge&labelColor=0D1117)](./assets/skills)
[![Agents](https://img.shields.io/badge/10%20Agents-Defined-F59E0B?style=for-the-badge&labelColor=0D1117)](./assets/agents)
[![Hooks](https://img.shields.io/badge/4%20Mechanical%20Hooks-Active-06B6D4?style=for-the-badge&labelColor=0D1117)](./hooks)
[![Prompts](https://img.shields.io/badge/3%20System%20Prompts-Bundled-8B5CF6?style=for-the-badge&labelColor=0D1117)](./assets/prompts)

<br/>

```
output quality = model capability × process discipline
```

</div>

---

## Install

One command. Provisions every platform it detects automatically.

```bash
# Bun
bunx get-fable install

# npm
npx get-fable install
```

### Antigravity / Gemini CLI

Installs as a native Antigravity plugin — global rules, skills, and hooks registered at `~/.gemini/config`:

```bash
bunx get-fable install-antigravity
```

### Project initialization

Bootstrap Fable Mode discipline into any project directory:

```bash
bunx get-fable init
```

Creates `.fable/LEDGER.md`, `docs/SPEC.md`, `.agents/skills/`, and `.agents/rules/`.

### Mythos Router

Wrap any LLM provider with Fable-grade context injection via a local proxy:

```bash
bunx get-fable serve 8080
```

---

## What is Fable Mode?

Fable Mode is Anthropic's internal process system for Claude Code. It replaces ad-hoc prompting with mechanical discipline: no implementation before a plan is written and approved, every task tracked with evidence, sub-agents blocked until capability checks pass.

`get-fable` extracts that system and installs it on any model you run.

| Principle | Enforcement |
|---|---|
| **Plan Gate** | Implementation blocked until `SPEC.md` and `PLAN.md` exist and are approved |
| **Ledger Discipline** | Every task tracked in `.fable/LEDGER.md` with acceptance criteria and `-- evidence:` annotations |
| **Attribution Ladder** | On 3 consecutive failures: `Harness → Runtime → Product → Class fix` escalation |
| **Spawn Guard** | Model capability ceiling enforced before sub-agents are created |
| **Close Guard** | Turn cannot end if tasks are unverified or evidence is missing |

---

## Asset Vault

13 primary Anthropic source asset groups — reverse-engineered and structured from production Claude deployments.

<div align="center">

| Asset | Count | Contents |
|:---|:---:|:---|
| **System Prompts** | 3 | Claude Code Fable 5, Claude Design, Docs Assistant |
| **Leaked Agents** | 10 | `Explore`, `Plan`, `general-purpose`, `claude-code-guide`, `observer`, `worker` |
| **Claude Code Skills** | 29 | `dataviz`, `artifact-design`, `security-review`, `claude-api`, `deep-research`, `debug` |
| **Claude Design Skills** | 22 | `make-a-deck`, `3d-object`, `animated-video`, `hi-fi-design`, `create-design-system` |
| **Slash Commands** | 9 | `/goal`, `/compact`, `/recap`, `/insights`, `/team-onboarding` |
| **Injected Reminders** | 8 | Dynamic context and safety reminders at session boundaries |
| **Starter Components** | 10 | `deck-stage.js`, `animations-v2.jsx`, `browser-window.jsx`, `tweaks-panel.jsx` |
| **Mythos Router** | 1 | Local proxy server — wraps any LLM with Fable context |

</div>

```bash
bunx get-fable assets
```

---

## Architecture

```
+----------------------------------------------------------+
|                      get-fable CLI                       |
+----------------+----------------+----------+------------+
| Multi-Platform | Fable          | Mythos   | Asset      |
| Installer      | Discipline     | Router   | Vault      |
|                | Engine         | Proxy    |            |
| Claude Code    | Spec/Plan Gate | HTTP     | Prompts    |
| Antigravity    | Ledger Lint    | Context  | Skills     |
| Agent Kernel   | Guard Hooks x4 | Injector | Agents     |
| Cursor         | Fail-Streak    | Any LLM  | Components |
+----------------+----------------+----------+------------+
```

Documentation:
- [Architecture Overview](docs/ARCHITECTURE.md)
- [ADR-001: Fable SuperSystem](docs/ADR-001-fable-supersystem.md)
- [CLI Usage Guide](docs/USAGE.md)

---

## Mechanical Guard Hooks

Four hooks fire automatically at session boundaries and tool execution points:

```
SessionStart  →  Profile Injector   Injects dynamic discipline profile from ledger state
PreToolUse    →  Spawn Guard        Enforces Plan Gate before sub-agents spawn
PostToolUse   →  Fail-Streak        Triggers Attribution Ladder after 3 consecutive errors
Stop          →  Close Guard        Blocks turn end if ledger items lack evidence annotations
```

---

## CLI Reference

```
get-fable v1.0.0

USAGE
  $ bunx get-fable <command>

COMMANDS
  install               Install Fable 5 globally across Claude Code, Antigravity, Agent Kernel
  install-antigravity   Install as native Antigravity plugin at ~/.gemini/config
  init                  Bootstrap .fable/ ledger, .agents/ rules/skills, and SPEC.md
  serve [port]          Start Mythos Router proxy (default port: 8080)
  lint                  Verify .fable/LEDGER.md for evidence annotations
  status                Display installation status across all platforms
  assets                List all bundled agents, skills, and prompts
  prompt                Output the complete Claude Code Fable 5 System Prompt
  help                  Show this menu
```

---

## Platform Support

<div align="center">

| Platform | Command | Config Path |
|:---|:---|:---|
| **Claude Code** | `bunx get-fable install` | `~/.claude/` |
| **Antigravity / Gemini CLI** | `bunx get-fable install-antigravity` | `~/.gemini/config/` |
| **Agent Kernel** | `bunx get-fable install` | `~/.agent-kernel/` |
| **Cursor** | `bunx get-fable install` | `.cursorrules` |
| **Any Project** | `bunx get-fable init` | `.agents/` + `.fable/` |

</div>

---

## Repository Structure

```
get-fable/
├── src/
│   ├── cli.ts                      CLI entrypoint
│   ├── installer.ts                Multi-platform installer
│   ├── assets-manager.ts           Asset vault API
│   ├── fable-lint.ts               Ledger and spec linter
│   └── router/
│       ├── index.ts                Mythos Router proxy server
│       ├── provider-translator.ts  Request normalizer and prompt injector
│       └── context-injector.ts     Skill and agent context loader
├── assets/
│   ├── prompts/                    3 system prompts
│   ├── agents/                     10 agent definitions
│   ├── skills/
│   │   ├── claude-code/            29 Claude Code skills
│   │   └── claude-design/          22 Claude Design skills
│   ├── slash-commands/             9 slash command specs
│   ├── injected-reminders/         8 safety reminders
│   └── starter-components/         10 JSX/JS components
├── hooks/                          4 mechanical guard hooks
├── docs/
│   ├── ADR-001-fable-supersystem.md
│   ├── ARCHITECTURE.md
│   └── USAGE.md
└── bin/
    └── get-fable.js                Compiled CLI binary
```

---

## Sources

- [`cozytab/fable5-mode`](https://github.com/cozytab/fable5-mode) — Fable Mode discipline system
- [`thewaltero/mythos-router`](https://github.com/thewaltero/mythos-router) — Mythos Router proxy design
- [`asgeirtj/system_prompts_leaks`](https://github.com/asgeirtj/system_prompts_leaks) — Anthropic system prompt leaks

---

## License

MIT License © 2026 [Mamdouh Abo Ammar](https://github.com/imMamdouhaboammar)

<div align="center">

[![GitHub Stars](https://img.shields.io/github/stars/imMamdouhaboammar/get-fable?style=social)](https://github.com/imMamdouhaboammar/get-fable/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/imMamdouhaboammar/get-fable?style=social)](https://github.com/imMamdouhaboammar/get-fable/forks)

</div>
