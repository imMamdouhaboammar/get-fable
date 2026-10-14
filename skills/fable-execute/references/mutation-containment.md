# Mutation Containment & Blast Radius Control

## Purpose
Rules for bounding code modifications to accepted cards, preserving surrounding module invariants, and preventing unintended scope drift during execution.

## Invariants of Bounded Execution

### 1. Single Responsibility per Edit
Implement only the specific changes defined in the accepted work card. Do not perform opportunistic refactoring or reformat unrelated files during feature execution.

### 2. Workspace Invariant Preservation
- Preserve existing public API signatures unless the card explicitly specifies a breaking change.
- Keep third-party dependencies unchanged unless dependency modification is a card requirement.
- Maintain existing linting and code style rules without re-indenting unaffected code blocks.

### 3. Immediate Local Verification
Immediately after editing a file:
1. Run static type checking on the touched module.
2. Run the specific unit test file covering that module.
3. Verify that git diff shows only intentional, minimal edits.

### 4. Mutation Generation Synchronization
Every write operation advances the workspace `mutationGeneration`. Any previous verification evidence recorded before the mutation becomes stale and cannot be used to close the task until re-verified.
