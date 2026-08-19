# Host Platform Adapters

## Supported AI Coding Platforms & Latest Model Lineup (August 19, 2026)

| Host Platform | Config Surface | Primary Target Models (Aug 2026) | Capabilities |
|---|---|---|---|
| **Claude Code** | `.claude-plugin/`, `settings.json`, `CLAUDE.md` | `claude-opus-5`, `claude-sonnet-5`, `claude-fable-5`, `claude-mythos-5`, `claude-haiku-4-5` | Adaptive thinking, 1M context, tool use, non-destructive hooks |
| **OpenAI Codex / ChatGPT** | `.codex-plugin/`, `.chatgpt-plugin/`, `instructions.md` | `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `o3`, `o3-mini`, `o1` | Multi-tiered reasoning (Sol / Terra / Luna), structured outputs |
| **Google Antigravity / Gemini CLI** | `.gemini-plugin/`, `hooks.json`, `fable5-mode.md` | `gemini-3.7-flash`, `gemini-3.1-pro`, `gemini-2.5-pro` | Multimodal token context, AGY agent routing, ultra-fast latency |
| **Cursor** | `.cursor-plugin/`, `.cursor/rules/fable-lifecycle.mdc` | `claude-sonnet-5`, `gpt-5.6-sol`, `gemini-3.7-flash` | Fast composer completions, semantic code indexing |
| **OpenCode** | `.opencode-plugin/`, skills directory | `deepseek-r1`, `deepseek-v3`, `claude-sonnet-5` | Local open-source model execution |
| **Moonshot Kimi** | `.kimi-plugin/`, `rules/fable.md` | `kimi-k1.5`, `kimi-chat` | Long-context document retrieval |
| **DeepSeek** | `.deepseek-plugin/`, `rules/fable.md` | `deepseek-r1`, `deepseek-v3` | Math & code reasoning, chain-of-thought verification |
| **Kiro** | `.kiro-plugin/`, hooks & rules | `claude-opus-5`, `gpt-5.6-terra` | Terminal-first autonomous workflow |
| **Pi Code** | `.pi-plugin/`, `rules/fable.md` | `claude-sonnet-5`, `gemini-3.7-flash` | Minimalist single-turn and interactive loops |
| **Generic** | Standard MCP & filesystem | Multi-provider fallback | Unified tool translation |
