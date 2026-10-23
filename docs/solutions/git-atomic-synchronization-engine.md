# Git Atomic Synchronization Engine (High-Granularity Dirty Tree Decomposition)

## Context
In large agentic coding sessions or autonomous multi-agent loops, dozens or hundreds of files across multiple layers (contracts, core runtime, Rust crates, tests, static sites, package manifests, and lifecycle state) can accumulate in the working copy. Pushing a monolithic commit obscures reviewability and breaks bisectability, while naive sequential commits trigger pre-commit/post-commit hook debt or leave incomplete interim states.

## Architecture & Operational Flow

```
+-------------------------------------------------------------------------------+
|                    STAGE 1: AUDIT & DRIFT DISCOVERY                           |
|  - Parse `git status --porcelain`                                             |
|  - Compare local HEAD vs upstream remote (`origin/master`, `origin/main`)     |
|  - Detect uncommitted implementation drift vs cosmetic version bumps          |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|               STAGE 2: TOPOLOGICAL ATOMIC PLAN COMPILATION                    |
|  Sort diffs into strictly ordered dependency layers:                          |
|    1. Schemas & Type Contracts (`src/core/types.ts`)                          |
|    2. Core Engine Implementation (`src/core/*`)                               |
|    3. Native Crates & Lockfiles (`crates/*`, `Cargo.lock`)                    |
|    4. Tool Registry & Skill Definitions (`registry.json`, `skills/*`)         |
|    5. Entrypoints & CLI Runners (`src/cli.ts`, `bin/`)                        |
|    6. Compiled Distribution Bundles (`dist/*`)                                |
|    7. Multi-Platform Plugins & Adapters (`.plugin/*`, `tools/*`)              |
|    8. Packs & Feature Groupings (`packs/*.json`)                              |
|    9. Evaluations & Holdouts (`evals/*`)                                      |
|   10. Automated Test Suites (`test/*.test.ts`)                                |
|   11. Failure Lessons Knowledge Base (`Failure-lessons/*`)                    |
|   12. Architecture & Technical Documentation (`docs/*`)                       |
|   13. Public Distribution Descriptors (`public/skills/*.json`)                |
|   14. Site Portal Descriptors & Pages (`site/skills/*.json`, `site/*`)        |
|   15. Release Metadata (`Formula/*`, `package.json`, `manifests`)             |
|   16. Lifecycle State & Evidence Stamps (`.fable/*`, `state.json`)            |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                 STAGE 3: HOOK-SAFE ATOMIC EXECUTION                           |
|  - Execute individual `git add` and `git commit -m` without `--no-verify`     |
|  - Handle post-commit lifecycle side effects deterministically                |
|  - Record fresh passing evidence (`get-fable evidence pass`) at final gate    |
|  - Stage lifecycle metadata (`.fable/state.json`) as terminal atomic commit   |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                  STAGE 4: CLEAN PROMOTION & PUSH                              |
|  - Fast-forward merge feature branch into default branch (`master`/`main`)    |
|  - Verify 0 conflicts and working tree clean parity                           |
|  - Push both primary branches to remote `origin`                              |
+-------------------------------------------------------------------------------+
```

## Key Principles & Invariants
1. **Zero-Bypass Policy**: Never use `--no-verify`, `--no-gpg-sign`, or `-n` to skip pre-commit guards. Hooks are safety rails; if a hook rejects a commit, the underlying invariant was violated.
2. **Topological Dependency Order**: Dependencies and type contracts must be committed before consumers. Broken interim commits break `git bisect`.
3. **Terminal Lifecycle Synchronization**: Workspace state and verification evidence must advance in lockstep. The final commit in any sequence must capture verified generation matching mutation generation.
