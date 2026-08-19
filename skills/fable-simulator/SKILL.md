---
name: fable-simulator
description: Use when verifying complex code changes, inspecting repository contracts before editing, establishing independent testing oracles, conducting headless browser playthroughs, or enforcing non-destructive workspace safety.
---

# fable-simulator

Specialist skill for rigorous truthfulness, independent verification oracles, contract derivation, headless UI inspection, and non-destructive workspace preservation.

## Overview
Ground every claim in executed proof, treat user workspace property as inviolable, and never rely on self-confirming assumptions as verification oracles.

## When to Use
- Before editing code: Deriving the true contract from existing tests, call sites, and caller types across the repository.
- During verification: Setting up independent test oracles (golden files, repo tests, secondary methods) where assumption checks prove nothing.
- Verifying UI/interactive deliverables: Conducting headless browser playthroughs with causal evidence rows and pixel-level screenshot inspection.
- Workspace safety: Guarding untracked user files, preventing unauthorized cleanups, and refusing git history rewrites.

## Core Invariants & Rules

### 1. Derive Contract from Repository Before Editing
- Search every call site of the symbol or behavior being changed.
- Read existing tests, types, and callers to identify exact error/exception types, return shapes, defaults, and sync/async semantics.
- Match existing codebase API patterns and reuse existing helpers instead of inventing divergent shapes.
- Enumerate every clause of the requirement: happy path, error handling, edge cases, negative clauses, and platform variants.

### 2. Independent Verification Oracles
- A check built from the assumption being tested proves nothing.
- Re-running the same script or comparing against a similarly-configured reference is not proof.
- The oracle must be independent: repository test suites, golden fixtures, named external sources, or a second falsifying method.
- When output diff is nonzero or byte counts differ, the task is NOT done.

### 3. Headless UI & Interactive Verification
- Use headless browsers (never visible focus-stealing windows).
- Build a causal evidence matrix before testing: `public input/action → expected observable outcome → actual causal evidence`.
- For visual deliverables: Capture screenshots, open them with image-reading tools, and inspect pixels before claiming success.
- For interactive deliverables: Exercise at least 4 distinct documented controls in a real browser playthrough and measure responsiveness/FPS.

### 4. Non-Destructive Workspace Protection
- Untracked files not created in the current session are the user's sacred property.
- NEVER delete, overwrite, or repurpose untracked files (`rm`, `git clean`).
- Never rewrite git history (`filter-branch`, rebase/amend past commits, `reset --hard`, reflog purge) unless explicitly commanded.
- Clean up only processes and temporary files created in the current session.

### 5. Professional Truthfulness
- Prioritize technical accuracy over false agreement or pleasing the user.
- Disagree constructively when technical facts contradict an assumption.
- Ground all claims in observed output (real log lines, exit codes, concrete values). Label unobserved claims as inferred.
