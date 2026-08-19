# Host capability contract

Support level is based on what the current installer writes and registers. It is not a claim that every host exposes identical extension APIs.

| Host | Level | Skill Packages | Rules | Hooks registered | Mutation detection | Completion guard | CLI/Spark fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Claude Code | FULL | Yes | Yes | Yes | Yes | Yes | Yes |
| Antigravity | FULL | Yes | Yes | Yes | Yes | Yes | Yes |
| Codex | PARTIAL | Yes | Yes | No | No | No | Yes |
| OpenCode | PARTIAL | Yes | Yes | No | No | No | Yes |
| Kiro | ADVISORY | No | Yes | No | No | No | Yes |
| Cursor | ADVISORY | No | Yes | No | No | No | Yes |
| Kimi | ADVISORY | No | Yes | No | No | No | Yes |
| DeepSeek | ADVISORY | No | Yes | No | No | No | Yes |
| Pi Code | ADVISORY | No | Yes | No | No | No | Yes |

`FULL` means the installer currently delivers canonical Skill Packages plus registered lifecycle hooks for state mutation and completion enforcement. `PARTIAL` means package/rule installation exists but lifecycle hooks are not registered. `ADVISORY` means the host receives rules only, or copied hook files without a proven host registration path.

The machine-readable source is `src/core/host-contract.ts`. Installer fixtures must be used for verification; tests must not write into real user host directories.
