# Host Platform Adapters

## Supported AI Coding Platforms & Latest Model Targets (August 2026)

| Host Platform | Config Surface | Primary Target Models (Aug 2026) | Capabilities |
|---|---|---|---|
| **Claude Code** | `.claude-plugin/`, `settings.json`, `CLAUDE.md` | `claude-fable-5`, `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5` | Adaptive thinking, 1M context, tool use, non-destructive hooks |
| **OpenAI Codex** | `.codex-plugin/`, `.codex/config.toml`, `instructions.md` | `o3`, `o3-mini`, `gpt-5`, `gpt-4o` | Structured outputs, reasoning tokens, fast generation |
| **ChatGPT** | `.chatgpt-plugin/`, `ai-plugin.json` | `gpt-5`, `o3`, `o1` | Multi-agent plugin ecosystem |
| **Google Antigravity / Gemini CLI** | `.gemini-plugin/`, `hooks.json`, `fable5-mode.md` | `gemini-3.1-pro`, `gemini-3.5-flash`, `gemini-2.5-pro` | Multimodal token context, AGY agent routing |
| **Cursor** | `.cursor-plugin/`, `.cursor/rules/fable-lifecycle.mdc` | `claude-sonnet-5`, `gpt-5`, `cursor-small` | Fast composer completions, semantic code indexing |
| **OpenCode** | `.opencode-plugin/`, skills directory | `deepseek-r1`, `deepseek-v3`, `claude-sonnet-5` | Local open-source model execution |
| **Moonshot Kimi** | `.kimi-plugin/`, `rules/fable.md` | `kimi-k1.5`, `kimi-chat` | Long-context document retrieval |
| **DeepSeek** | `.deepseek-plugin/`, `rules/fable.md` | `deepseek-r1`, `deepseek-v3` | Math & code reasoning, chain-of-thought verification |
| **Kiro** | `.kiro-plugin/`, hooks & rules | `claude-sonnet-5`, `gpt-5` | Terminal-first autonomous workflow |
| **Pi Code** | `.pi-plugin/`, `rules/fable.md` | `claude-sonnet-5`, `gpt-5` | Minimalist single-turn and interactive loops |
| **Generic** | Standard MCP & filesystem | Multi-provider fallback | Unified tool translation |
