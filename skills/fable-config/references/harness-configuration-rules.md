# Agent Harness Configuration Rules

## Best Practices
1. **Scoped Permissions**: Prefer narrow glob patterns (`test/**`, `src/utils/**`) over open-ended access.
2. **Safe Environment Variables**: Never hardcode API tokens directly in shared settings files.
3. **JSON Validity**: Always validate JSON syntax before writing configuration files.
