# Get Fable Installation Guide

Complete installation, configuration, and host integration guide for **Get Fable** — the evidence-driven coding lifecycle and situational awareness engine for AI coding agents.

---

## Quick Start Matrix

| Target / Platform | Recommended Command | Output / Integration |
|---|---|---|
| **Vercel / skills.sh CLI** | \`npx skills add imMamdouhaboammar/get-fable\` | Full 25-skill canonical pack in local \`.skills/\` |
| **Homebrew (macOS/Linux)** | \`brew tap imMamdouhaboammar/get-fable && brew install get-fable\` | Global CLI binary + shell completions + man |
| **Bun (Mandatory JS/TS)** | \`bun add -g get-fable\` | Global \`get-fable\` CLI binary |
| **npm Global CLI** | \`npm install -g get-fable\` | Global \`get-fable\` CLI binary |
| **Universal Curl Script** | \`curl -fsSL https://raw.githubusercontent.com/imMamdouhaboammar/get-fable/master/install.sh \| bash\` | Automated clone, build, and global installation |
| **All AI Coding Agents** | \`get-fable install all\` | Configures Claude, Antigravity, Codex, Cursor, etc. |

---

## 1. Vercel / skills.sh CLI Installation

Install Get Fable skills directly into your current project or workspace using the official skills package manager:

\`\`\`bash
# Using npx
npx skills add imMamdouhaboammar/get-fable

# Or using bunx
bunx skills add imMamdouhaboammar/get-fable
\`\`\`

### What happens:
1. Resolves \`skills.sh.json\` from the repository.
2. Installs the complete 25-skill canonical library across all 8 lifecycle packs (Core, Intelligence, Build, Proof, Delivery, Evolution, System, Creator).
3. Configures each skill with valid frontmatter, Deep Playbook V2 documentation, progressive references, templates, and evaluation benchmarks.

---

## 2. Homebrew Installation (macOS & Linux)

Install the official Homebrew package formula for system-wide availability:

\`\`\`bash
# 1. Tap the repository
brew tap imMamdouhaboammar/get-fable

# 2. Install get-fable
brew install get-fable

# 3. Verify installation
get-fable --version
get-fable doctor
\`\`\`

### Shell Integrations & Situational Awareness Prompt Hooks
Add real-time prompt hints and aliases to your shell profile:

#### **Zsh** (\`~/.zshrc\`):
\`\`\`zsh
eval "$(get-fable shell zsh)"
\`\`\`

#### **Bash** (\`~/.bashrc\` or \`~/.bash_profile\`):
\`\`\`bash
eval "$(get-fable shell bash)"
\`\`\`

#### **Fish** (\`~/.config/fish/config.fish\`):
\`\`\`fish
get-fable shell fish | source
\`\`\`

*Enables handy aliases (\`gfr\`, \`gfs\`, \`gfe\`, \`gfc\`, \`gfl\`, \`gfd\`, \`gfm\`, \`gfst\`) and real-time prompt updates when mutations occur.*

---

## 3. Global Package Manager Installation

### Via Bun (Preferred)
\`\`\`bash
bun add -g get-fable
\`\`\`

### Via npm
\`\`\`bash
npm install -g get-fable
\`\`\`

---

## 4. Universal One-Line Shell Installer

For automated environments, CI/CD runners, and Docker containers:

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/imMamdouhaboammar/get-fable/master/install.sh | bash
```

---

## 5. AI Coding Agent & IDE Setup Matrix

Get Fable provides native integrations for all major AI coding assistants and IDEs. Run `get-fable install <host>` or `get-fable install all`.

| Agent / IDE | Integration Tier | Config Command |
|---|---|---|
| <img src="../assets/logos/claude-color.svg" width="20" height="20" alt="" /> **Claude Code** | Full Lifecycle | `get-fable install claude` |
| <img src="../assets/logos/gemini-color.svg" width="20" height="20" alt="" /> **Google Antigravity & Gemini CLI** | Full Lifecycle | `get-fable install antigravity` |
| <img src="../assets/logos/openai.svg" width="20" height="20" alt="" /> **OpenAI Codex & ChatGPT** | Skill + Rule + Plugin | `get-fable install codex` |
| <img src="../assets/logos/cursor.svg" width="20" height="20" alt="" /> **Cursor IDE** | Rule + Plugin | `get-fable install cursor` |
| <img src="../assets/logos/opencode.svg" width="20" height="20" alt="" /> **OpenCode** | Skill + Rule | `get-fable install opencode` |
| <img src="../assets/logos/deepseek-color.svg" width="20" height="20" alt="" /> **DeepSeek Harness (DSH)** | Advisory Rule | `get-fable install deepseek` |
| <img src="../assets/logos/moonshot-kimi.svg" width="20" height="20" alt="" /> **Moonshot Kimi Code** | Advisory Rule | `get-fable install kimi` |
| <img src="../assets/logos/kiro.svg" width="20" height="20" alt="" /> **Kiro** | Rule + Lifecycle Hooks | `get-fable install kiro` |
| <img src="../assets/logos/pi.svg" width="20" height="20" alt="" /> **Pi Code** | Advisory Rule | `get-fable install pi` |
| <img src="../assets/logos/vscode.svg" width="20" height="20" alt="" /> **VS Code** | IDE & Terminal Workflow | `get-fable init` |
| <img src="../assets/logos/windsurf.svg" width="20" height="20" alt="" /> **Windsurf** | IDE & Terminal Workflow | `get-fable init` |

---

### <img src="../assets/logos/claude-color.svg" width="20" height="20" /> 1. Claude Code
```bash
get-fable install claude
```
- **Skills**: Installs 25 canonical skills into `~/.claude/skills/`.
- **Hooks**: Registers 5 Python lifecycle hooks in `~/.claude/settings.json`:
  - `SessionStart`: `fable_profile_inject.py`
  - `PreToolUse`: `fable_spawn_guard.py`
  - `PostToolUse` & `PostToolUseFailure`: `fable_fail_streak.py` & `fable_mutation.py`
  - `Stop`: `fable_close_guard.py`
- **Rules**: Appends Fable workflow rules to `~/.claude/CLAUDE.md`.
- **Plugin Manifest**: Compatible with `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.

---

### <img src="../assets/logos/gemini-color.svg" width="20" height="20" /> 2. Google Antigravity & Gemini CLI
```bash
get-fable install antigravity
```
- **Plugin**: Registers `get-fable` plugin in `~/.gemini/plugins/get-fable/`.
- **Skills**: Installs canonical skills into `~/.gemini/config/skills/` and `.agents/skills/`.
- **Hooks**: Configures lifecycle events in `~/.gemini/config/hooks.json`.
- **Constitution**: Installs `~/.gemini/config/rules/fable5-mode.md`.

---

### <img src="../assets/logos/openai.svg" width="20" height="20" /> 3. OpenAI Codex & ChatGPT
```bash
get-fable install codex
```
- **Codex**: Installs skills into `~/.codex/skills/` and rules into `~/.codex/rules/`.
- **Codex Plugin**: Configures `.codex-plugin/plugin.json`.
- **ChatGPT Custom Actions**: Import `.chatgpt-plugin/openapi.json` and `.chatgpt-plugin/ai-plugin.json` into your Custom GPT configuration.
- **Custom Instructions**: Load `prompts/chatgpt-custom-instructions.md` for ChatGPT sessions.

---

### <img src="../assets/logos/cursor.svg" width="20" height="20" /> 4. Cursor IDE
```bash
get-fable install cursor
```
- **Rules**: Installs `.cursor/rules/fable-lifecycle.mdc` in your home directory or active workspace.
- **Marketplace**: Configured in `.cursor-plugin/marketplace.json`.

---

### <img src="../assets/logos/opencode.svg" width="20" height="20" /> 5. OpenCode
```bash
get-fable install opencode
```
- **Rules**: Installs `~/.opencode/rules/fable.md`.
- **Skills**: Installs skills into `~/.opencode/skills/`.

---

### <img src="../assets/logos/moonshot-kimi.svg" width="20" height="20" /> 6. Kimi Code
```bash
get-fable install kimi
```
- **Rules**: Installs `~/.kimi/rules/fable.md`.

---

### <img src="../assets/logos/deepseek-color.svg" width="20" height="20" /> 7. DeepSeek Harness (DSH)
```bash
get-fable install deepseek
```
- **Rules**: Installs `~/.deepseek/rules/fable.md`.

---

### <img src="../assets/logos/kiro.svg" width="20" height="20" /> 8. Kiro
```bash
get-fable install kiro
```
- **Rules & Hooks**: Installs `~/.kiro/rules/fable.md` and registers hook triggers.

---

### <img src="../assets/logos/pi.svg" width="20" height="20" /> 9. Pi Code
```bash
get-fable install pi
```
- **Rules**: Installs `~/.pi/rules/fable.md`.

---

### <img src="../assets/logos/github.svg" width="20" height="20" /> 10. Agent Kernel & IDEs
```bash
get-fable install agent-kernel
```
- **Constitution**: Installs `~/.agent-kernel/rules/fable.md`.
- **VS Code / Zed / Windsurf**: Run `get-fable init` to bind project state directly.

---

## 6. Initializing a Project & Universal Git Hooks

### Initialize Project State
In any repository root, initialize the Fable lifecycle:

\`\`\`bash
get-fable init
\`\`\`

Creates the durable tracking files:
- \`.fable/state.json\` (Schema version 3 state machine)
- \`.fable/LEDGER.md\` (Work card checklist with required machine-checkable tests)
- \`.fable/PROGRESS.md\` (Human-readable progress log)
- \`docs/SPEC.md\` (Technical specification with measured claims)

### Install Universal Git Hooks
Enforce lifecycle verification at commit and push boundaries:

\`\`\`bash
get-fable githooks install
\`\`\`

Installs:
- \`pre-commit\`: Verifies state integrity and blocks unverified substantial commits.
- \`post-commit\`: Advances mutation generation and resets stale verification flags.
- \`post-checkout\`: Re-syncs workspace ID across branch switches.
- \`pre-push\`: Ensures full test gate is green before pushing to remote.

---

## 7. Verifying Health & Diagnostics

Inspect the full health of your installation across all hosts, skills, and projects:

\`\`\`bash
# Human-readable summary
get-fable doctor

# Machine-readable JSON diagnostic
get-fable doctor --json

# Run project lint checks
get-fable lint
\`\`\`
