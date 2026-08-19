# Falsification Heuristics

## Falsification Checklist
1. **Edge Values**: Empty strings, nulls, negative numbers, maximum array bounds, unexpected Unicode.
2. **Concurrency & Race Conditions**: Simultaneous writes, rapid retries, socket timeouts.
3. **State Mutation Invalidation**: Verify that tests ran AFTER the latest code edit, not before.
4. **Adversarial Input**: Path traversal, SQL injection characters, malformed payloads.
