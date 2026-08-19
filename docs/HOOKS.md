# Lifecycle Hooks Specification

## Hook Lifecycle Events
- **`SessionStart`**: Restore state and verify active card.
- **`PreToolUse`**: Safety and routing guard.
- **`PostToolUse`**: Track file mutations and count consecutive test failures.
- **`PostToolUseFailure`**: Intercept tool execution failures.
- **`Stop`**: Gate agent termination on fresh passing verification.
