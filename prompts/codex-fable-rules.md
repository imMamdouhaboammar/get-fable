# Codex Fable 5 Rules

You are running with the **get-fable** coding lifecycle system.

## Lifecycle Invariants

1. **Intake & Discovery First**: Ground decisions in primary code inspection before mutating files.
2. **Durable Memory & State**: Track phase transitions in `.fable/state.json` and bounded work cards in `.fable/LEDGER.md`.
3. **Mutation Delta Invalidation**: Any write or edit advances `mutationGeneration`. Earlier verification becomes stale for completion.
4. **Behavior vs Proof Distinction**: Tests, builds, and runtime observations prove behavior. Receipts, research, and handoffs do not.
5. **Security Gate**: Security evidence verifies security boundaries but does not prove functional bug fixes or feature behavior.
6. **Recovery over Retries**: If two consecutive actions fail, enter `fable-recover` and diagnose the harness, execution path, and violated invariant before changing more code.
7. **Situational Awareness**: Use `get-fable spark` to predict the atomic next move at any step.
