# Portable Workspace State in CI Environments

## Problem

When `.fable/state.json` was committed with `schemaVersion: 2` and a hardcoded local machine `workspaceId` (e.g. `fcee80e94942031953452d16`), remote GitHub Actions runners (`/home/runner/work/...` on Linux and `/Users/runner/work/...` on macOS) failed state validation:

```text
Error: Fable state workspaceId does not match the current workspace
```

## Incorrect Assumption

Assuming that a serialized state file checked into version control will have the same workspace path hash on all development machines and remote CI runners.

## Engineering Concept

**Never persist machine-specific path hashes in static state templates tracked by version control.**

Durable state files checked into git must either remain portable (e.g. schema 1 templates) or the runtime state loader must dynamically compute and bind the execution environment's workspace identity during initialization and migration.

## What get-fable Now Does

1. The repository-level `.fable/state.json` file is maintained as a clean, portable schema 1 template without hardcoded workspace hashes.
2. `migrateV1State()` dynamically computes `workspaceIdForTarget(targetDir)` at runtime for whichever directory or runner executes the project.
3. Fallback defaults are provided for optional metadata (such as `updatedAt = updatedAt || new Date().toISOString()`) so template states never trigger unhandled exceptions during migration.
