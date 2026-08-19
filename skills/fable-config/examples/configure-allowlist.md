# Example: Adding Read-Only Tool Allowlist

## Action
Configure Claude Code `settings.json` to allow auto-approved read commands.

```json
{
  "permissions": {
    "allow": [
      "Bash(bun test:*)",
      "Bash(git status)",
      "Bash(git diff)"
    ]
  }
}
```
