# Session Source Resolution

## Purpose
Explain how to locate and parse session transcripts across Antigravity, Claude Code,
OpenAI Codex, and local file inputs.

---

## 1. Antigravity Session Transcripts

### Directory Structure
```
~/.gemini/antigravity/brain/<conversation-id>/
  .system_generated/logs/
    transcript.jsonl          # Compact, large fields truncated (primary scan)
    transcript_full.jsonl     # Complete, untruncated (deep read when needed)
```

### Transcript Lookup
```bash
# Locate latest session
LATEST_SESSION=$(ls -t ~/.gemini/antigravity/brain/ | head -1)
TRANSCRIPT_PATH="$HOME/.gemini/antigravity/brain/$LATEST_SESSION/.system_generated/logs/transcript.jsonl"
```

### JSONL Format Details
- `USER_INPUT`: User messages, requirements, corrections, feedback.
- `PLANNER_RESPONSE`: Assistant reasoning, planned steps, generated tool calls.
- `SYSTEM`: Tool execution outputs, test results, compiler errors.

---

## 2. Claude Code Transcripts

Claude Code stores session logs in `~/.claude/logs/` or passes transcript chunks via lifecycle hook payloads (e.g. `Stop`, `SessionEnd`).

```bash
# Claude logs directory
ls -lt ~/.claude/logs/ 2>/dev/null | head -10
```

---

## 3. Codex Transcripts

OpenAI Codex plugin lifecycle hooks receive workspace context and execution events through `PLUGIN_ROOT/hooks/fable_hook_dispatch.py`.

---

## 4. Local File Input

Fable Learning accepts direct transcript files in formats:
- `.jsonl` (Antigravity format)
- `.md` / `.txt` (Formatted conversations, chat exports)
- Inline pasted text blocks
