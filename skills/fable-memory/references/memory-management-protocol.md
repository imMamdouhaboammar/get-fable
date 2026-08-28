# Memory Management Protocol & Durable Fact Lifecycle

## Purpose
Defines the file-based persistence protocol for recording, indexing, recalling, and updating cross-session user preferences, project conventions, and architectural constraints in `MEMORY.md`.

## The Memory Lifecycle

```
[User Feedback / Constraint] ──> [Synthesize Fact] ──> [Validate Invariant]
                                                            │
[Purge Stale Facts] <── [Index in MEMORY.md] <── [Write Single Fact File]
```

### 1. Capture & Synthesis
- Extract durable preferences from user corrections and explicit rules (e.g. "always use Bun first", "never use Colima").
- Formulate the fact as a clear, positive invariant statement with its original rationale.

### 2. Storage & Single Fact Files
- Save individual memory records in `.fable/memory/facts/<fact-slug>.md`.
- Include metadata: category (convention, preference, architecture, security), created date, and source conversation.

### 3. Central Index Synchronization
- Maintain a concise, scannable index in `MEMORY.md` at the project or user root.
- Keep the central index under 150 lines by linking out to detailed fact files.

### 4. Contradiction Resolution & Purging
- When a user explicitly changes a previously stored preference, locate the superseded fact file, mark it as deprecated or deleted, and update the index immediately.
