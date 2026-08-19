# Spark Silence Policy

## When to Stay Silent (`silent: true`, `suggestion: null`)
1. **Idle with no intent**: When state is `idle` and no user input is provided.
2. **Scope Complete**: When phase is `complete` and verified.
3. **Ambiguous Context**: When no single obvious next move is deterministically clear.
4. **Forbidden Moves**: Never suggest speculative actions, broad refactors, or unrequested features.
