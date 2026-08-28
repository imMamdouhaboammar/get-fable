# Host capability contract

Support level is based on what the current installer writes and registers. It is not a claim that every host exposes identical extension APIs.

| Host | Level | Skill Packages | Rules | Hooks registered | Mutation detection | Completion guard | CLI/Spark fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <img src="../assets/logos/claude-color.svg" width="18" height="18" alt="" /> Claude Code | FULL | Yes | Yes | Yes | Yes | Yes | Yes |
| <img src="../assets/logos/gemini-color.svg" width="18" height="18" alt="" /> Antigravity | FULL | Yes | Yes | Yes | Yes | Yes | Yes |
| <img src="../assets/logos/openai.svg" width="18" height="18" alt="" /> Codex | PARTIAL | Yes | Yes | No | No | No | Yes |
| <img src="../assets/logos/opencode.svg" width="18" height="18" alt="" /> OpenCode | PARTIAL | Yes | Yes | No | No | No | Yes |
| <img src="../assets/logos/kiro.svg" width="18" height="18" alt="" /> Kiro | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/cursor.svg" width="18" height="18" alt="" /> Cursor | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/moonshot-kimi.svg" width="18" height="18" alt="" /> Kimi | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/deepseek-color.svg" width="18" height="18" alt="" /> DeepSeek | ADVISORY | No | Yes | No | No | No | Yes |
| <img src="../assets/logos/pi.svg" width="18" height="18" alt="" /> Pi Code | ADVISORY | No | Yes | No | No | No | Yes |

`FULL` means the installer currently delivers canonical Skill Packages plus registered lifecycle hooks for state mutation and completion enforcement. `PARTIAL` means package/rule installation exists but lifecycle hooks are not registered. `ADVISORY` means the host receives rules only, or copied hook files without a proven host registration path.

The machine-readable source is `src/core/host-contract.ts`. Installer fixtures must be used for verification; tests must not write into real user host directories.
