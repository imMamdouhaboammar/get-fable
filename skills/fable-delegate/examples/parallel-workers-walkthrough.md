# Example: Parallelizing Independent Adapters

## Task
Implement GitHub and GitLab webhook adapters in parallel.

## Contracts
- Worker 1: Owns `src/adapters/github.ts` and `test/github.test.ts`. Acceptance: `bun test test/github.test.ts`.
- Worker 2: Owns `src/adapters/gitlab.ts` and `test/gitlab.test.ts`. Acceptance: `bun test test/gitlab.test.ts`.
- Parent: Integrates into router, runs full test suite.
