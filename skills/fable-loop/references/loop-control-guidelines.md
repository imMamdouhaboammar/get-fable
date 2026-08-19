# Loop Control Guidelines

## Invariants
1. **Bounded Iterations**: Always specify a maximum iteration count (e.g. `maxIterations: 10`).
2. **Explicit Exit Condition**: Define exact pass criteria to terminate the loop early upon success.
3. **Exponential Backoff**: When polling external services, increase delay between retries to avoid rate limits.
