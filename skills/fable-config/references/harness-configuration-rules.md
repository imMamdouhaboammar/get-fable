# Harness Configuration, Permissions & Environment Rules

## Purpose
Defines the authoritative rules for configuring AI agent harness settings, permissions allowlists, environment variable isolation, editor keybindings, and lifecycle hook integrations across diverse runtime hosts.

## Precedence Hierarchy
When resolving configuration settings, adhere to the strict precedence ladder:
1. **Explicit CLI Invocation Flags**: Flags passed directly in the current command line override all file-based configurations.
2. **Project-Local State & Config**: Project settings in `.fable/state.json` and `.agents/config.json` override user-level defaults for project-scoped tasks.
3. **User-Global Agent Config**: Settings in `~/.claude/settings.json`, `~/.gemini/config/`, `~/.codex/config.json`, or `~/.cursor/rules/`.
4. **Default System Fallbacks**: Built-in fallback constants defined by get-fable.

## Permission Model & Command Allowlists

### Safe Commands (Auto-Executable)
Read-only commands and non-destructive inspection tools may be executed without interactive blocking:
- Repository discovery: `git status`, `git diff`, `git log`, `fd`, `rg`, `ls`
- Static type checking: `tsc --noEmit`, `mypy`, `pyright`
- Package inspections: `bun pm ls`, `npm list`, `cargo check`
- Health diagnostics: `get-fable doctor --json`, `get-fable lint`

### Guarded Commands (Explicit Confirmation / Hook Gated)
Mutating commands that alter disk state or environment state require explicit approval or mutation tracking:
- Code edits and writes: `write_to_file`, `replace_file_content`
- Package installs: `bun add`, `npm install`, `cargo add`
- Process execution: `bun run build`, `bun test`, `pytest`

### Prohibited Commands (Blocked by Default)
Destructive operations that risk unrecoverable data loss or host compromise:
- Recursive forced deletions: `rm -rf /`, `rm -rf ~`
- Arbitrary privilege escalation: `sudo`, `chmod 777`
- Secret printing: `cat .env`, `env`, `printenv` (must be masked or vault-resolved)

## Environment Variable Hygiene
- Never commit `.env` files or plaintext secrets to source control.
- Ensure all agent processes read sensitive credentials from secure environment vaults or masked process injections.
- Isolate runtime variables by prefixing with `FABLE_` or standard vendor namespaces.
