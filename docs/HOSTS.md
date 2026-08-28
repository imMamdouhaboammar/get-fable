# Multi-Host Platform Matrix (August 2026)

`get-fable` provides universal harness support across 30 leading AI coding agents, platforms, and IDEs.

## Supported Hosts & Integration Tiers

### Proprietary & Commercial Markets

| Agent / Tool | Vendor / Team | Integration Tier | Global Config Path | Rule & Skill Files |
|:---|:---|:---|:---|:---|
| <img src="../assets/logos/claude.svg" width="20" height="20" alt="" /> **Claude Code** | Anthropic | **Full Lifecycle** | `~/.claude/` | `settings.json`, `CLAUDE.md`, 5 lifecycle hooks, skills in `skills/` |
| <img src="../assets/logos/gemini.svg" width="20" height="20" alt="" /> **Gemini CLI / Google Antigravity** | Google | **Full Lifecycle** | `~/.gemini/config/` | `hooks.json`, `rules/fable5-mode.md`, plugin manifest, skills in `skills/` |
| <img src="../assets/logos/grok.svg" width="20" height="20" alt="" /> **Grok Build** | xAI | **Full Lifecycle** | `~/.grok/` | `hooks.json`, `rules/fable.md`, Grok plugin, skills in `skills/` |
| <img src="../assets/logos/openai.svg" width="20" height="20" alt="" /> **OpenAI Codex & ChatGPT** | OpenAI | **Skill + Rule + Plugin** | `~/.codex/` | `.codex-plugin/plugin.json`, `rules/fable5-mode.md`, skills in `skills/` |
| <img src="../assets/logos/cursor.svg" width="20" height="20" alt="" /> **Cursor** | Anysphere | **Advisory Rule + Plugin** | `~/.cursor/` | `rules/fable-lifecycle.mdc`, `.cursor-plugin/marketplace.json` |
| <img src="../assets/logos/copilot.svg" width="20" height="20" alt="" /> **GitHub Copilot Agent Mode** | GitHub / Microsoft | **Advisory Rule** | `~/.copilot/` | `rules/fable.md`, `.github/copilot-instructions.md` |
| <img src="../assets/logos/devin.svg" width="20" height="20" alt="" /> **Devin** | Cognition | **Skill + Rule** | `~/.devin/` | `instructions.md`, `rules/fable.md`, skills in `skills/` |
| <img src="../assets/logos/windsurf.svg" width="20" height="20" alt="" /> **Windsurf** | Codeium | **Advisory Rule** | `~/.codeium/windsurf/` | `rules.md`, `rules/fable.md`, `.windsurfrules` |
| <img src="../assets/logos/replit.svg" width="20" height="20" alt="" /> **Replit Agent** | Replit | **Advisory Rule** | `~/.replit/` | `rules/fable.md`, `.replit.md` |
| <img src="../assets/logos/aws.svg" width="20" height="20" alt="" /> **Amazon Q Dev** | AWS | **Advisory Rule** | `~/.aws/amazon-q/` | `rules/fable.md`, `.amazonq/rules.md` |
| <img src="../assets/logos/trae.svg" width="20" height="20" alt="" /> **Trae** | ByteDance | **Advisory Rule** | `~/.trae/` | `rules/fable.md`, `.trae/rules/fable.md` |
| <img src="../assets/logos/warp.svg" width="20" height="20" alt="" /> **Warp AI** | Warp Terminal | **Advisory Rule** | `~/.warp/` | `rules/fable.md` |
| <img src="../assets/logos/moonshot-kimi.svg" width="20" height="20" alt="" /> **Kimi K3** | Moonshot AI | **Advisory Rule** | `~/.kimi/` | `rules/fable.md` |
| <img src="../assets/logos/atlarix.svg" width="20" height="20" alt="" /> **Atlarix** | Atlarix Desktop | **Advisory Rule** | `~/.atlarix/` | `rules/fable.md` |
| <img src="../assets/logos/vellum.svg" width="20" height="20" alt="" /> **Vellum** | Vellum Workflow | **Advisory Rule** | `~/.vellum/` | `rules/fable.md` |
| <img src="../assets/logos/codegen.svg" width="20" height="20" alt="" /> **Codegen** | Codegen Platforms | **Advisory Rule** | `~/.codegen/` | `rules/fable.md` |
| <img src="../assets/logos/muse.svg" width="20" height="20" alt="" /> **Muse Code** | Muse | **Advisory Rule** | `~/.muse/` | `rules/fable.md` |
| <img src="../assets/logos/jetbrains.svg" width="20" height="20" alt="" /> **Junie** | JetBrains | **Advisory Rule** | `~/.junie/` | `rules/fable.md`, `.junie/rules/fable.md` |
| <img src="../assets/logos/qodo.svg" width="20" height="20" alt="" /> **Qodo** | Qodo (CodiumAI) | **Advisory Rule** | `~/.qodo/` | `rules/fable.md`, `.qodo/rules/fable.md` |
| <img src="../assets/logos/roocode.svg" width="20" height="20" alt="" /> **Roo Code** | Roo Community | **Skill + Rule** | `~/.roo/` | `rules/fable.md`, skills in `skills/`, `.roomodes` |

### Open-Source & Community Markets

| Agent / Tool | Team / Platform | Integration Tier | Global Config Path | Rule & Skill Files |
|:---|:---|:---|:---|:---|
| <img src="../assets/logos/aider.svg" width="20" height="20" alt="" /> **Aider** | Paul Gauthier | **Advisory Rule** | `~/.aider/` | `rules/fable.md`, `.aider.prompt.md` |
| <img src="../assets/logos/cline.svg" width="20" height="20" alt="" /> **Cline** | Cline Bot Inc | **Skill + Rule** | `~/.cline/` | `rules/fable.md`, skills in `skills/`, `.clinerules` |
| <img src="../assets/logos/openhands.svg" width="20" height="20" alt="" /> **OpenHands** | All-Hands AI | **Skill + Rule** | `~/.openhands/` | `microagents/fable.md`, `rules/fable.md`, skills in `skills/` |
| <img src="../assets/logos/opencode.svg" width="20" height="20" alt="" /> **OpenCode** | SST | **Skill + Rule** | `~/.opencode/` | `rules/fable.md`, skills in `skills/` |
| <img src="../assets/logos/continue.svg" width="20" height="20" alt="" /> **Continue** | Continue Dev | **Advisory Rule** | `~/.continue/` | `rules/fable.md`, `.continue/rules/fable.md` |
| <img src="../assets/logos/kilo.svg" width="20" height="20" alt="" /> **Kilo Code** | Kilo Platform | **Skill + Rule** | `~/.kilo/` | `rules/fable.md`, skills in `skills/`, `.kilo/rules/fable.md` |
| <img src="../assets/logos/plandex.svg" width="20" height="20" alt="" /> **Plandex** | Plandex AI | **Advisory Rule** | `~/.plandex/` | `rules/fable.md`, `.plandex/context.md` |
| <img src="../assets/logos/autogpt.svg" width="20" height="20" alt="" /> **AutoGPT** | Significant Gravitas | **Advisory Rule** | `~/.autogpt/` | `rules/fable.md` |
| <img src="../assets/logos/hermes.svg" width="20" height="20" alt="" /> **Hermes Agent** | Nous Research | **Skill + Rule** | `~/.hermes/` | `rules/fable.md`, skills in `skills/` |
| <img src="../assets/logos/kiro.svg" width="20" height="20" alt="" /> **Kiro** | Kiro | **Rule + Hooks** | `~/.kiro/` | `rules/fable.md`, lifecycle triggers |
| <img src="../assets/logos/deepseek.svg" width="20" height="20" alt="" /> **DeepSeek Harness (DSH)** | DeepSeek / Community | **Advisory Rule** | `~/.deepseek/` | `rules/fable.md` |
| <img src="../assets/logos/pi.svg" width="20" height="20" alt="" /> **Pi Code** | Pi | **Advisory Rule** | `~/.pi/` | `rules/fable.md` |

