# Example: Code Review Finding

## Context
Reviewing PR adding connection pool to database adapter.

## Finding
- **File**: `src/db/pool.ts#L48`
- **Issue**: Connection acquired in `executeQuery` was not released in a `finally` block when queries threw an error, causing pool starvation.
- **Action**: Return bounded repair to `fable-execute` to wrap in `try/finally`.
