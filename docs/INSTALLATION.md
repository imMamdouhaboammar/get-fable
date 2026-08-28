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

## 5. AI Coding Agent & IDE Setup Matrix (30 Platforms)

Get Fable provides native integrations for all 30 major AI coding assistants and IDEs. Run `get-fable install <host>` or `get-fable install all`.

### Proprietary & Commercial Markets

| Agent / Tool | Integration Tier | Config Command | Key Files |
|---|---|---|---|
| <img src="../assets/logos/claude.svg" width="20" height="20" alt="" /> **Claude Code** | Full Lifecycle | `get-fable install claude` | `~/.claude/settings.json`, `CLAUDE.md`, 5 hooks |
| <img src="../assets/logos/gemini.svg" width="20" height="20" alt="" /> **Google Antigravity & Gemini CLI** | Full Lifecycle | `get-fable install antigravity` | `~/.gemini/config/hooks.json`, `rules/fable5-mode.md`, plugin |
| <img src="../assets/logos/grok.svg" width="20" height="20" alt="" /> **xAI Grok & Grok Bot** | Full Lifecycle | `get-fable install grok` | `~/.grok/hooks.json`, `rules/fable.md`, Grok plugin |
| <img src="../assets/logos/openai.svg" width="20" height="20" alt="" /> **OpenAI Codex & ChatGPT** | Skill + Rule + Plugin | `get-fable install codex` | `.codex-plugin/plugin.json`, `~/.codex/skills/`, `rules/` |
| <img src="../assets/logos/cursor.svg" width="20" height="20" alt="" /> **Cursor IDE** | Advisory Rule + Plugin | `get-fable install cursor` | `~/.cursor/rules/fable-lifecycle.mdc`, `.cursor-plugin/` |
| <img src="../assets/logos/copilot.svg" width="20" height="20" alt="" /> **GitHub Copilot Agent Mode** | Advisory Rule | `get-fable install copilot` | `~/.copilot/rules/fable.md`, `.github/copilot-instructions.md` |
| <img src="../assets/logos/devin.svg" width="20" height="20" alt="" /> **Devin** | Skill + Rule | `get-fable install devin` | `~/.devin/instructions.md`, `rules/fable.md`, `skills/` |
| <img src="../assets/logos/windsurf.svg" width="20" height="20" alt="" /> **Windsurf** | Advisory Rule | `get-fable install windsurf` | `~/.codeium/windsurf/rules.md`, `.windsurfrules` |
| <img src="../assets/logos/replit.svg" width="20" height="20" alt="" /> **Replit Agent** | Advisory Rule | `get-fable install replit` | `~/.replit/rules/fable.md`, `.replit.md` |
| <img src="../assets/logos/aws.svg" width="20" height="20" alt="" /> **Amazon Q Dev** | Advisory Rule | `get-fable install amazonq` | `~/.aws/amazon-q/rules/fable.md`, `.amazonq/rules.md` |
| <img src="../assets/logos/trae.svg" width="20" height="20" alt="" /> **Trae** | Advisory Rule | `get-fable install trae` | `~/.trae/rules/fable.md`, `.trae/rules/fable.md` |
| <img src="../assets/logos/warp.svg" width="20" height="20" alt="" /> **Warp AI** | Advisory Rule | `get-fable install warp` | `~/.warp/rules/fable.md` |
| <img src="../assets/logos/moonshot-kimi.svg" width="20" height="20" alt="" /> **Moonshot Kimi Code** | Advisory Rule | `get-fable install kimi` | `~/.kimi/rules/fable.md` |
| <img src="../assets/logos/atlarix.svg" width="20" height="20" alt="" /> **Atlarix** | Advisory Rule | `get-fable install atlarix` | `~/.atlarix/rules/fable.md` |
| <img src="../assets/logos/vellum.svg" width="20" height="20" alt="" /> **Vellum** | Advisory Rule | `get-fable install vellum` | `~/.vellum/rules/fable.md` |
| <img src="../assets/logos/codegen.svg" width="20" height="20" alt="" /> **Codegen** | Advisory Rule | `get-fable install codegen` | `~/.codegen/rules/fable.md` |
| <img src="../assets/logos/muse.svg" width="20" height="20" alt="" /> **Muse Code** | Advisory Rule | `get-fable install muse` | `~/.muse/rules/fable.md` |
| <img src="../assets/logos/jetbrains.svg" width="20" height="20" alt="" /> **Junie** | Advisory Rule | `get-fable install junie` | `~/.junie/rules/fable.md`, `.junie/rules/fable.md` |
| <img src="../assets/logos/qodo.svg" width="20" height="20" alt="" /> **Qodo** | Advisory Rule | `get-fable install qodo` | `~/.qodo/rules/fable.md`, `.qodo/rules/fable.md` |
| <img src="../assets/logos/roocode.svg" width="20" height="20" alt="" /> **Roo Code** | Skill + Rule | `get-fable install roocode` | `~/.roo/rules/fable.md`, `skills/`, `.roomodes` |

### Open-Source & Community Markets

| Agent / Tool | Integration Tier | Config Command | Key Files |
|---|---|---|---|
| <img src="../assets/logos/aider.svg" width="20" height="20" alt="" /> **Aider** | Advisory Rule | `get-fable install aider` | `~/.aider/rules/fable.md`, `.aider.prompt.md` |
| <img src="../assets/logos/cline.svg" width="20" height="20" alt="" /> **Cline** | Skill + Rule | `get-fable install cline` | `~/.cline/rules/fable.md`, `skills/`, `.clinerules` |
| <img src="../assets/logos/openhands.svg" width="20" height="20" alt="" /> **OpenHands** | Skill + Rule | `get-fable install openhands` | `~/.openhands/microagents/fable.md`, `skills/` |
| <img src="../assets/logos/opencode.svg" width="20" height="20" alt="" /> **OpenCode** | Skill + Rule | `get-fable install opencode` | `~/.opencode/rules/fable.md`, `skills/` |
| <img src="../assets/logos/continue.svg" width="20" height="20" alt="" /> **Continue** | Advisory Rule | `get-fable install continue` | `~/.continue/rules/fable.md`, `.continue/rules/fable.md` |
| <img src="../assets/logos/kilo.svg" width="20" height="20" alt="" /> **Kilo Code** | Skill + Rule | `get-fable install kilo` | `~/.kilo/rules/fable.md`, `skills/`, `.kilo/rules/fable.md` |
| <img src="../assets/logos/plandex.svg" width="20" height="20" alt="" /> **Plandex** | Advisory Rule | `get-fable install plandex` | `~/.plandex/rules/fable.md`, `.plandex/context.md` |
| <img src="../assets/logos/autogpt.svg" width="20" height="20" alt="" /> **AutoGPT** | Advisory Rule | `get-fable install autogpt` | `~/.autogpt/rules/fable.md` |
| <img src="../assets/logos/hermes.svg" width="20" height="20" alt="" /> **Hermes Agent** | Skill + Rule | `get-fable install hermes` | `~/.hermes/rules/fable.md`, `skills/` |
| <img src="../assets/logos/kiro.svg" width="20" height="20" alt="" /> **Kiro** | Rule + Hooks | `get-fable install kiro` | `~/.kiro/rules/fable.md`, lifecycle hooks |
| <img src="../assets/logos/deepseek.svg" width="20" height="20" alt="" /> **DeepSeek Harness (DSH)** | Advisory Rule | `get-fable install deepseek` | `~/.deepseek/rules/fable.md` |
| <img src="../assets/logos/pi.svg" width="20" height="20" alt="" /> **Pi Code** | Advisory Rule | `get-fable install pi` | `~/.pi/rules/fable.md` |

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
