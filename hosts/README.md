# Host capability contract

Support level is based on what the current installer writes and registers. It is not a claim that every host exposes identical extension APIs.

| Host | Level | Skill Packages | Rules | Hooks registered | Mutation detection | Completion guard | CLI/Spark fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <img src="../assets/logos/claude.svg" width="18" height="18" alt="" /> Claude Code | FULL | Yes | Yes | Yes | Yes | Yes | Yes |
| <img src="../assets/logos/gemini.svg" width="18" height="18" alt="" /> Antigravity | FULL | Yes | Yes | Yes | Yes | Yes | Yes |
| <img src="../assets/logos/grok.svg" width="18" height="18" alt="" /> Grok Build | FULL | Yes | Yes | Yes | Yes | Yes | Yes |
| <img src="../assets/logos/openai.svg" width="18" height="18" alt="" /> Codex | PARTIAL | Yes | Yes | No | No | No | Yes |
| <img src="../assets/logos/devin.svg" width="18" height="18" alt="" /> Devin | PARTIAL | Yes | Yes | No | No | No | Yes |
| <img src="../assets/logos/roocode.svg" width="18" height="18" alt="" /> Roo Code | PARTIAL | Yes | Yes | No | No | No | Yes |
| <img src="../assets/logos/cline.svg" width="18" height="18" alt="" /> Cline | PARTIAL | Yes | Yes | No | No | No | Yes |
| <img src="../assets/logos/openhands.svg" width="18" height="18" alt="" /> OpenHands | PARTIAL | Yes | Yes | No | No | No | Yes |
| <img src="../assets/logos/opencode.svg" width="18" height="18" alt="" /> OpenCode | PARTIAL | Yes | Yes | No | No | No | Yes |
| <img src="../assets/logos/kilo.svg" width="18" height="18" alt="" /> Kilo Code | PARTIAL | Yes | Yes | No | No | No | Yes |
| <img src="../assets/logos/hermes.svg" width="18" height="18" alt="" /> Hermes Agent | PARTIAL | Yes | Yes | No | No | No | Yes |
| <img src="../assets/logos/cursor.svg" width="18" height="18" alt="" /> Cursor | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/copilot.svg" width="18" height="18" alt="" /> GitHub Copilot | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/windsurf.svg" width="18" height="18" alt="" /> Windsurf | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/replit.svg" width="18" height="18" alt="" /> Replit Agent | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/aws.svg" width="18" height="18" alt="" /> Amazon Q Dev | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/trae.svg" width="18" height="18" alt="" /> Trae | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/warp.svg" width="18" height="18" alt="" /> Warp AI | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/moonshot-kimi.svg" width="18" height="18" alt="" /> Kimi K3 | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/atlarix.svg" width="18" height="18" alt="" /> Atlarix | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/vellum.svg" width="18" height="18" alt="" /> Vellum | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/codegen.svg" width="18" height="18" alt="" /> Codegen | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/muse.svg" width="18" height="18" alt="" /> Muse Code | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/jetbrains.svg" width="18" height="18" alt="" /> Junie | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/qodo.svg" width="18" height="18" alt="" /> Qodo | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/aider.svg" width="18" height="18" alt="" /> Aider | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/continue.svg" width="18" height="18" alt="" /> Continue | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/plandex.svg" width="18" height="18" alt="" /> Plandex | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/autogpt.svg" width="18" height="18" alt="" /> AutoGPT | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/kiro.svg" width="18" height="18" alt="" /> Kiro | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/deepseek.svg" width="18" height="18" alt="" /> DeepSeek | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/pi.svg" width="18" height="18" alt="" /> Pi Code | ADVISORY | No | Yes | No | No | No | Yes |

`FULL` means the installer currently delivers canonical Skill Packages plus registered lifecycle hooks for state mutation and completion enforcement. `PARTIAL` means package/rule installation exists but lifecycle hooks are not registered. `ADVISORY` means the host receives rules only, or copied hook files without a proven host registration path.

The machine-readable source is `src/core/host-contract.ts`. Installer fixtures must be used for verification; tests must not write into real user host directories.
