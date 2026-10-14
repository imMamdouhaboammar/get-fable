# Autonomous Cowork Execution Plan

## 1. Objective & Boundaries
- **Task Goal**: [Concise statement of autonomous deliverable]
- **Permitted File Scope**:
  - `src/path/to/target1.ts`
  - `test/path/to/target1.test.ts`
- **Zero-Touch Boundaries**: All configuration files, database credentials, and external manifests.

## 2. Execution Batches
1. **Batch 1 (Scaffolding & Red Test)**: Create regression test fixture and verify honest failure.
2. **Batch 2 (Core Implementation)**: Implement minimal logic to satisfy the test.
3. **Batch 3 (Verification & Cleanup)**: Run full test suite and clean up temporary fixtures.

## 3. Outcome Deliverable Contract
- Command to verify: `bun test test/path/to/target1.test.ts`
- Invariant check: `git diff --stat` matches permitted file scope.
