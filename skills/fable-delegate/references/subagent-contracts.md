# Subagent Delegation Contracts & Workspace Boundaries

## Purpose
Defines the protocol for creating unambiguous subagent ownership contracts, workspace isolation boundaries, merge convergence rules, and acceptance criteria when delegating independent tasks to parallel workers.

## The Contract Invariant
Subagent delegation is permitted **only for genuinely disjoint work**. If two tasks mutate the same files, share mutable in-memory state, or require sequential design iterations, delegation is prohibited.

## The 4 Components of a Delegation Contract

### 1. Explicit File Ownership Boundary
Every worker receives a disjoint whitelist of files it is permitted to create or modify.
- Worker A: `src/components/UserCard.tsx`, `test/components/UserCard.test.tsx`
- Worker B: `src/api/user-routes.ts`, `test/api/user-routes.test.ts`
- **Zero Overlap Rule**: Any file not listed in the whitelist is strictly read-only for that worker.

### 2. Upstream Context & Shared Types
Provide the worker with immutable input interfaces, API schemas, and architectural invariants before launching. The worker must not redesign shared type definitions independently.

### 3. Machine-Checkable Acceptance Criterion
Each delegated contract must define an exact, executable command that determines whether the worker's deliverable is complete:
- `bun test test/components/UserCard.test.tsx`
- `tsc --noEmit`

### 4. Convergence & Integration Gate
Upon completion of all parallel subagents:
1. Validate that no worker mutated files outside its declared whitelist.
2. Run the unified repository test suite across the combined workspace.
3. Re-verify that mutation generations align and no stale assumptions remain.
