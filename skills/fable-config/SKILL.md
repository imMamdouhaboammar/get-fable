---
name: fable-config
description: Configure agent harness settings, permissions allowlists, environment variables, keybindings, and lifecycle hooks. Use when updating settings.json, managing permissions, or configuring hooks.
version: 1.2.0
pack: system
inputs:
  - config_change
requires:
  - target_harness
produces:
  - settings_diff
gates:
  - valid_json
  - safe_permissions
fallback: fable-plan
mutatesWorkspace: true
parallelSafe: false
neural_links:
  precursors:
    - fable-plan
  continuations:
    - fable-verify
    - get-fable
  lateral_peers:
    - fable-plan
  recovery: fable-recover
---

# fable-config

Agent harness configuration and permissions management specialist.

## Purpose
Configure agent settings, tool permission allowlists, lifecycle hooks, and environment variables safely with strict validation.

## When to Use
- Managing permission allowlists to reduce interactive approval prompts for safe commands.
- Configuring Claude Code `settings.json`, Codex `config.json`, or Antigravity rules.
- Wiring and verifying lifecycle hook scripts.

## When NOT to Use
- Writing application business logic (use `fable-execute`).
- Storing unencrypted secret tokens in configuration files (use env vault).

## Inputs
- **`config_change`**: Target setting, permission pattern, or hook configuration.

## Expected Outputs
- **`settings_diff`**: Updated configuration file with preserved syntax.

## Procedure
1. Read existing configuration JSON/MDC file.
2. Apply scoped permission changes or hook mappings.
3. Validate JSON syntax and verify no syntax errors exist.
4. Test that the configured hook or permission takes effect.

## Decision Rules
- Scope command allowlists to specific commands (`bun test:*`) rather than open wildcards (`*`).
- Preserve existing user-defined settings and keybindings.

## Tool Policy
- Edit `settings.json`, `hooks.json`, or harness config files.

## Evidence Requirements
- Valid JSON schema pass and verified configuration diff.

## Failure Handling
- On malformed JSON or broken hooks, restore backup configuration.

## Completion Criteria
- Configuration updated, validated, and active in harness.

## Progressive Resources
- Rules: `references/harness-configuration-rules.md`
- Example: `examples/configure-allowlist.md`
