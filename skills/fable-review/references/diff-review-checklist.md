# Diff Review Checklist

## Review Pillars
1. **Spec Alignment**: Does the diff satisfy the requested user outcome without unrequested side effects?
2. **Correctness & Robustness**: Error handling, null/undefined safety, resource cleanup, race conditions.
3. **Security**: Input validation, secret leakage, permission checks.
4. **Performance & Footprint**: Unnecessary allocations, unbounded loops, unindexed queries.
5. **Maintainability**: Clear naming, absence of dead code, test coverage.
