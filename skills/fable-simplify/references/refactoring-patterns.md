# Safe Refactoring Patterns

## Simplification Rules
1. **Preserve Behavior**: Never alter input/output signatures or runtime contracts without explicit tests.
2. **Deduplication**: Extract common logic into focused utility functions.
3. **Dead Code Elimination**: Remove uncalled private functions and unused imports.
4. **Early Returns**: Flatten nested if-else blocks using guard clauses.
