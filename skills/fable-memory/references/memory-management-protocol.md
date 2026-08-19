# File-Based Memory Management Protocol

## Rules
1. **Single-Fact Files**: Each memory file stores exactly one atomic fact with frontmatter.
2. **Index Parity**: Every file in `.memory/` must have a corresponding entry in `MEMORY.md`.
3. **No Duplicates**: Update existing memory records rather than creating conflicting notes.
