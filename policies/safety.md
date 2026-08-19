# Safety Policy

## Core Principle
Protect user property, prevent destructive operations, and enforce safety boundaries.

## Rules
1. **Sacred Untracked Files**: Untracked files not created during the active session must never be deleted, overwritten, or repurposed (`rm`, `git clean`).
2. **No Git History Rewrites**: Never run destructive git commands (`filter-branch`, `reset --hard`, rebase past commits, reflog purge) unless explicitly commanded.
3. **Refusal Invariants**: Refuse requests for malicious exploits, malware generation, or credential theft. Authorize defensive code auditing and CTFs.
