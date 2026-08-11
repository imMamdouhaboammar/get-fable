# ADR-001: Fable Supersystem Architecture & Multi-Model Adaptability Engine

## Status
Accepted

## Context
AI coding models vary significantly in native process discipline, reasoning depth, and context management capabilities. While Anthropic's flagship models (Claude Fable 5 / Mythos tier) excel due to specialized system prompt engineering, multi-agent routing, and strict mechanical discipline, other models (Gemini, GPT-4o, Llama, Ollama, DeepSeek) often fail due to process breakdown rather than raw token intelligence.

To turn **any** AI model into a Fable-grade engineering assistant, we require a unified, zero-dependency supersystem that combines:
1. Leaked Anthropic Claude Code & Claude Design system prompts, agents, skills, and MCP configurations.
2. The `mythos-router` proxy architecture for dynamic model routing and context enrichment.
3. The `fable5-mode` mechanical guard hooks (Plan Gate, Small-Card Execution, Adversarial Self-Check, Real-Product Verification, Context Hygiene, Checkpoint Autonomy).

## Decision
We will build **`get-fable`** as a modular, full-suite CLI and architecture framework in TypeScript (executing natively on Bun and Node.js) with zero external runtime dependencies.

### Bounded Contexts & Components

```
+-----------------------------------------------------------------------------------+
|                                  get-fable CLI                                    |
+---------------------+-----------------------+----------------------+--------------+
| Installer Subsystem | Fable Mode Discipline | Mythos Router Proxy  | Asset Vault  |
| (Claude, Gemini,    | (Guard Hooks, Ledger, | (Model translation,  | (Prompts,    |
| Kernel, Cursor)     | Acceptance Linting)   | context injection)   | Skills,      |
|                     |                       |                      | Agents, MCP) |
+---------------------+-----------------------+----------------------+--------------+
```

1. **Asset Vault (`assets/` / `prompts/` / `skills/` / `agents/`)**:
   - Holds raw and processed leaks: Claude Code Fable 5 System Prompt, Claude Design Prompt, Docs Assistant, Agents (6+), Skills (15+), Slash Commands, Injected Reminders, MCP Servers, and Starter Components.
2. **Mechanical Guard Engine (`hooks/`)**:
   - Python & TypeScript hooks enforcing Plan Gate, Spawn Guard, Fail-Streak Attribution, Stop Guard, and Spec/Ledger Verification.
3. **Mythos Router Subsystem (`src/router/`)**:
   - A local HTTP proxy/middleware server adapted from `thewaltero/mythos-router` that wraps API calls to any LLM provider (OpenAI, Anthropic, Google Gemini, Ollama, OpenRouter) and dynamically injects Fable 5 Mythos system prompts, context reminders, and tool schemas.
4. **Multi-Target Installer (`src/installer.ts`)**:
   - Synchronizes global configurations across Claude Code (`~/.claude`), Antigravity / Gemini CLI (`~/.gemini/config`), Agent Kernel (`~/.agent-kernel`), and IDE setups (`.cursorrules`, `.windsurfrules`).

## Consequences

### Positive
- **Universal Model Elevation**: Enables any LLM (local or cloud) to perform with Fable 5 rigor and structure.
- **Zero-Dependency Core**: Executable using native `bun` or `node` without fragile npm dependency chains.
- **Modular Asset Extraction**: All Anthropic Claude Code & Claude Design assets are organized cleanly for standalone or framework use.

### Trade-offs
- Orchestration overhead: Fable Mode discipline introduces plan gates and verification steps, which increases overall turn count for complex tasks in exchange for dramatically higher accuracy and zero hallucinations.
