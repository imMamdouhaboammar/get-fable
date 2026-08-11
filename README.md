# 🛡️ get-fable

**English** | [العربية](#-باللغة-العربية)

> **Make Opus 4.8, Gemini 3.5/3.6, or ANY AI Model work like Claude Fable 5 (Anthropic's Mythos-Class Tier)** — A unified system prompt installer, Fable Mode discipline engine, and mechanical guard hooks for Claude Code, Antigravity / Gemini CLI, Agent Kernel, Cursor, and AI coding agents.

```
output quality = model capability × work discipline
```

---

## ⚡ Quickstart

Install Fable 5 System Prompt & Fable Mode globally across all your AI agent platforms with **one command**:

```bash
bunx get-fable install
# OR
npx get-fable install
```

To turn on Fable Mode mechanical discipline in your current project:

```bash
bunx get-fable init
```

Check installation status and active hooks:

```bash
bunx get-fable status
```

---

## 🎯 What `get-fable` Does

1. **Claude Fable 5 System Prompt**: Injects Anthropic's official Mythos-tier intelligence standards, outcome-first reporting, transparent status updates, readable summaries, and high-discipline operating model into your global instructions (`~/.claude/CLAUDE.md`, `~/.gemini/config/rules/fable5-mode.md`, `~/.agent-kernel/rules/`).
2. **Fable Mode Discipline Engine**:
   - **Plan Gate**: Requires `SPEC.md` and `.fable/LEDGER.md` with *machine-checkable* acceptance tests before code changes.
   - **Small-Card Execution**: Runs each task in isolation, advancing only when acceptance commands pass.
   - **Adversarial Self-Check**: Refutes critical output before shipping.
   - **Real-Product Verification**: End-to-end execution evidence before marking items complete (`- [x]`).
   - **Context Hygiene**: External SPEC/PROGRESS memory instead of transcript bloat.
   - **Checkpoint Autonomy**: Resumable checkpoints for background tasks.
3. **Mechanical Guard Hooks** (`SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`):
   - **Profile Injector**: Auto-injects dynamic session context.
   - **Spawn Guard**: Enforces plan gate before sub-agent spawns & enforces model ceilings.
   - **Fail-Streak Reminder**: Triggers attribution ladder after 3 consecutive errors.
   - **Close Guard**: Blocks ending turn if ledger items are unverified or missing `-- evidence:`.

---

## 💻 CLI Usage

| Command | Action |
|---|---|
| `get-fable install` | Installs Fable 5 Mode & System Prompt globally |
| `get-fable init` | Initializes `.fable/` ledger & `docs/SPEC.md` in project |
| `get-fable lint` | Lints `.fable/LEDGER.md` and `docs/SPEC.md` |
| `get-fable status` | Displays system status and registered hooks |
| `get-fable prompt` | Prints the complete Claude Code Fable 5 System Prompt |

---

## 🌐 باللغة العربية

> **اجعل أي موديل ذكاء اصطناعي يعمل بكفاءة Claude Fable 5 (فئة Mythos الأسطورية من Anthropic)** — نظام شامل يثبت السيستم برومبت الرسمي ومهارات وانضباط Fable Mode مع هوكس ميكانيكية لجميع أدوات البرمجة (Claude Code, Antigravity / Gemini CLI, Agent Kernel, Cursor).

### 🚀 التشغيل السريع

تثبيت السيستم برومبت ونظام الفابل عالمياً ببرومبت واحد:

```bash
bunx get-fable install
```

لتفعيل الانضباط والمهمات الميكانيكية في مشروعك الحالي:

```bash
bunx get-fable init
```

للتحقق من حالة التثبيت والهوكس الشغالة:

```bash
bunx get-fable status
```

---

## 📄 License

MIT License © 2026 Mamdouh Abo Ammar
