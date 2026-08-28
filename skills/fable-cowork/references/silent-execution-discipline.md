# Silent Execution Discipline & Autonomous Cowork

## Purpose
Establishes the behavioral invariants and operational protocol for autonomous cowork execution, eliminating conversational noise, batching tool chains, and leading with concise outcome-first reporting.

## The Principle of Conversational Silence
During autonomous background execution, chat noise degrades developer velocity and wastes token budgets. The agent operates under a strict communication discipline:
1. **Zero Conversational Chatter During Execution**: Do not output conversational filler such as "I will now edit file X", "Running tests...", or "Checking the output...".
2. **Continuous Silent Tool Chaining**: Invoke tools consecutively without intervening natural language commentary until the bounded task completes or an unrecoverable blocker is encountered.
3. **Outcome-First Delivery**: When the entire batch finishes, output a clear, structured summary starting with the completed outcome, verified evidence, and changed files.

## Autonomy Boundaries & Checkpoint Triggers

### Green Light (Proceed Silently)
- Executing planned work cards within agreed file boundaries.
- Running automated test suites, typechecks, and linters.
- Refactoring internal logic where all existing unit tests continue to pass.
- Creating temporary test fixtures and scratch files in designated directories.

### Red Light (Stop and Alert the User)
- **Unresolved Load-Bearing Decision**: The task requires choosing an external architectural dependency or altering public API contracts not in the plan.
- **Repeated Test Failure**: An attempted fix fails twice consecutively with the same error signature (`failureStreak >= 2`).
- **Destructive Operation**: Workspace state contains uncommitted modifications that would be overwritten by a branch switch or revert.
- **Security Trust Boundary Violation**: Uncovered hardcoded secrets, injection vectors, or unauthenticated endpoints.

## Delivery Template
Upon completing an autonomous cowork session, deliver a compact, evidence-backed summary:

```markdown
### Outcome Delivered
[Concise 1-2 sentence statement of what was accomplished]

### Key Changes
- `src/path/to/fileA.ts`: Implemented bounded feature logic
- `src/path/to/fileB.ts`: Added unit test coverage

### Verification Evidence
- [x] Typecheck: `tsc --noEmit` (Passed in 2.1s)
- [x] Test Suite: `bun test` (14 tests passed, 0 failed)
- [x] Invariants: Zero scope drift across unaffected modules
```
