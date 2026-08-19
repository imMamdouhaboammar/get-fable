---
name: fable-memory
description: Manage persistent file-based memory, indexing cross-session user preferences, feedback, and project constraints. Use when storing durable facts or recalling user instructions across sessions.
version: 1.3.0
pack: system
inputs:
  - memory_fact
requires:
  - fact_metadata
produces:
  - memory_record
  - updated_index
gates:
  - single_fact_file
  - index_synced
fallback: fable-discover
mutatesWorkspace: true
parallelSafe: true
neural_links:
  precursors:
    - fable-discover
  continuations:
    - fable-plan
    - fable-discover
  lateral_peers:
    - fable-handoff
  recovery: fable-recover
---

# fable-memory

Cross-session file-based memory and preference indexing specialist.

## Purpose
Record durable user preferences, project constraints, and architectural feedback into atomic single-fact files with synced index catalogs.

## When to Use
- Storing user preferences (e.g. preferred test runner, styling conventions).
- Recording durable project constraints and architectural decisions.
- Indexing and recalling historical facts across multiple agent sessions.

## When NOT to Use
- Storing temporary session state or work cards (use `.fable/state.json` or `.fable/LEDGER.md`).
- Storing secret credentials or API tokens (use environment vault).

## Inputs
- **`memory_fact`**: Key technical fact, user preference, or project constraint.

## Expected Outputs
- **`memory_record`**: Structured markdown file with YAML frontmatter.
- **`updated_index`**: Updated `MEMORY.md` index catalog.

## Procedure
1. Create or update an atomic fact file in `.memory/<slug>.md`.
2. Format YAML frontmatter (`name`, `description`, `type`).
3. Synchronize `MEMORY.md` table of contents.
4. Verify no duplicate or conflicting facts exist.

## Decision Rules
- One fact per file; never aggregate multiple unrelated facts in one file.
- Update existing memory records rather than creating conflicting notes.

## Tool Policy
- Read and write `.memory/` files and `MEMORY.md`.

## Evidence Requirements
- Valid markdown fact file and updated index entry.

## Failure Handling
- If duplicate facts are detected, merge into a single canonical record.

## Completion Criteria
- Memory fact stored, indexed, and immediately retrievable.

## Progressive Resources
- Protocol: `references/memory-management-protocol.md`
- Template: `templates/memory-fact.template.md`
- Example: `examples/recording-user-preference.md`
