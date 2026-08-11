# Usage Guide — `get-fable`

## Installation Options

### Global Automated Installation
Run the command below using `bunx` or `npx`:

```bash
bunx get-fable install
```

This command automatically:
1. Installs the Fable 5 System Prompt and Fable Mode skill to `~/.claude/skills/fable-mode`.
2. Registers all 4 mechanical hooks into `~/.claude/settings.json`.
3. Injects Fable 5 Mythos rules into `~/.gemini/config/rules/fable5-mode.md`.
4. Registers rules in `~/.agent-kernel/rules/fable5-mode.md`.

---

## Project Initialization

To enforce Fable Mode discipline on a specific project:

```bash
cd /path/to/my-project
bunx get-fable init
```

This creates:
- `.fable/LEDGER.md`: Machine-checkable task card ledger.
- `.fable/PROGRESS.md`: Execution context memory.
- `.fable/VERIFIER_PROMPT.md`: Independent verifier prompt.
- `docs/SPEC.md`: Architecture & requirements specification with source tagging (`[measured]`, `[inferred]`, `[not-shown]`).

---

## Running the Mythos Router Proxy

To route requests from third-party LLMs (OpenAI GPT-4o, Gemini 3.5, Ollama, DeepSeek) through the Fable 5 Mythos Router:

```bash
bunx get-fable serve 8080
```

Set `UPSTREAM_OPENAI_URL` in your environment to forward enriched requests to your target API endpoint:

```bash
export UPSTREAM_OPENAI_URL="https://api.openai.com/v1/chat/completions"
bunx get-fable serve 8080
```

---

## Inspecting System Status & Assets

Check registered hooks and active project status:

```bash
bunx get-fable status
```

List all bundled Anthropic agents, skills, and prompts:

```bash
bunx get-fable assets
```

Output the complete Anthropic Claude Code Fable 5 System Prompt:

```bash
bunx get-fable prompt
```
