# Diagnostic Attribution Ladder & Failure Recovery

## Purpose
A 5-level diagnostic hierarchy to isolate root causes of repeated failures, distinguishing harness/environment issues from true application code bugs before editing source code.

## The 5-Level Attribution Ladder
When a command or test fails repeatedly, climb the ladder from lowest level (environment) to highest level (application logic):

```
Level 5: Application Logic Bug ── [Falsified by isolated unit test]
Level 4: Test Harness & Assertions ── [Falsified by verifying test assumptions]
Level 3: Build, Transpilation & Caches ── [Falsified by clean rebuild]
Level 2: Workspace & Git State ── [Falsified by git status / branch check]
Level 1: Host Environment & Runtime ── [Falsified by checking tool binary & versions]
```

### Level 1: Environment & Runtime
- Verify node/bun/python versions match expected engines.
- Check environment variables and path precedence (`which bun`, `node -v`).

### Level 2: Workspace & Branch State
- Check `git status` for dirty working directories, merge conflicts, or wrong active branch.
- Verify that required submodules or linked worktrees are properly initialized.

### Level 3: Build & Cache Artifacts
- Check if tests are executing stale files in `dist/`, `.turbo/`, `.cache/`, or `node_modules/`.
- Run a clean build (`rm -rf dist && bun run build`) before modifying code.

### Level 4: Test Harness & Fixtures
- Check if test mock fixtures reflect current API contracts.
- Check for race conditions, unhandled async promises, or shared test database pollution.

### Level 5: Application Logic Bug
- Only after Levels 1-4 are verified clean, diagnose the algorithm or code logic using `fable-tdd`.
