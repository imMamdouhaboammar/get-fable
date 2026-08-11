# System Architecture — `get-fable`

## Overview

`get-fable` is an open-source, zero-dependency supersystem designed to bring the process discipline, system prompt engineering, agent orchestration, and component ecosystem of Anthropic's flagship Claude models (Claude Fable 5 / Mythos tier) to **any** AI model and coding environment.

---

## High-Level Architecture

```
                  +-----------------------------------+
                  |           User / Agent            |
                  +-----------------+-----------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
          v                                                   v
+------------------+                                 +------------------+
| Global Installer |                                 |  Mythos Router   |
|  (Claude Code,   |                                 |   Proxy Server   |
|   Antigravity,   |                                 | (OpenAI/Gemini/  |
|   Agent Kernel)  |                                 |  Ollama Adapter) |
+--------+---------+                                 +--------+---------+
         |                                                    |
         v                                                    v
+-----------------------------------------------------------------------+
|                             Asset Vault                               |
|  - System Prompts (Fable 5, Claude Design, Docs Assistant)            |
|  - Leaked Agents (Explore, Plan, Guide, Observer, Worker)             |
|  - Bundled Skills (Claude Code & Claude Design)                       |
|  - Starter Components (Deck, Animations, Windows, Stage)              |
+-----------------------------------------------------------------------+
         |
         v
+-----------------------------------------------------------------------+
|                    Mechanical Guard Hooks Engine                      |
|  - Profile Injector (SessionStart)                                    |
|  - Spawn Guard (PreToolUse - Plan Gate & Model Ceilings)              |
|  - Fail-Streak Attribution Ladder (PostToolUse - 3 Error Trigger)      |
|  - Stop Guard (Stop - Evidence Verification Enforcement)              |
+-----------------------------------------------------------------------+
```

---

## Core Subsystems

### 1. Multi-Target Installer Subsystem (`src/installer.ts`)
Configures system instructions and mechanical hooks across target platforms:
- **Claude Code**: Installs skills into `~/.claude/skills/fable-mode`, updates `~/.claude/settings.json` hook events, and updates `~/.claude/CLAUDE.md`.
- **Antigravity / Gemini CLI**: Injects rules into `~/.gemini/config/rules/fable5-mode.md` and skills into `~/.gemini/config/skills/fable-mode`.
- **Agent Kernel**: Registers rules in `~/.agent-kernel/rules/fable5-mode.md`.
- **IDE Environments**: Generates `.cursorrules` and `.windsurfrules` compatibility specs.

### 2. Mythos Router Proxy (`src/router/`)
Adapted from `thewaltero/mythos-router`, this subsystem runs a lightweight HTTP server on port 8080. It intercepts standard OpenAI/Gemini/Ollama requests, transforms payloads, injects Fable 5 Mythos system prompts and context reminders, and forwards calls to any upstream provider.

### 3. Fable Mode Mechanical Guard Engine (`hooks/`)
Four python scripts hook directly into LLM agent lifecycles:
- `fable_profile_inject.py`: Injects project state at session start.
- `fable_spawn_guard.py`: Blocks subagent spawning unless a valid `.fable/LEDGER.md` exists.
- `fable_fail_streak.py`: Injects the 4-level attribution ladder upon 3 consecutive command failures.
- `fable_close_guard.py`: Blocks session completion unless all ledger items are closed with empirical `-- evidence:`.

### 4. Asset Vault (`assets/`)
Houses ingested assets from Anthropic leaks:
- `assets/prompts/`: 3 system prompts.
- `assets/agents/`: 10 agent definitions.
- `assets/skills/`: 52 skills across Claude Code and Claude Design.
- `assets/slash-commands/`: 9 command definitions.
- `assets/injected-reminders/`: 8 context injection rules.
- `assets/starter-components/`: 10 JSX/JS components.
