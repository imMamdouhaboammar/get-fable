---
name: fable-memory
description: Persistent file-based memory system, indexing cross-session user preferences, feedback, project constraints, and relational knowledge.
---

# fable-memory

Specialist skill for managing persistent project and user memory across sessions.

## When to Use
- Storing user preferences, workflow corrections, project constraints, and architectural facts.
- Indexing memory files into `MEMORY.md` and connecting related concepts with `[[slug]]` links.
- Retrieving relevant historical decisions before starting complex planning.

## Core Rules & Invariants
1. **Single-Fact Files**:
   - Each memory file must capture exactly one clear fact with standard YAML frontmatter:
     ```markdown
     ---
     name: <kebab-case-slug>
     description: <one-line summary>
     metadata:
       type: user | feedback | project | reference
     ---
     ```
2. **Index Parity**:
   - Every memory file must have a single-line entry in `MEMORY.md`.
3. **No Duplication**:
   - Update existing memory files rather than creating duplicates. Delete obsolete or disproven facts.
