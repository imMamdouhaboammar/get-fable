---
name: fable-config
description: Configure the agent harness, settings.json, permissions allowlists, environment variables, keybindings, and lifecycle hooks.
---

# fable-config

Specialist skill for configuring agent harness parameters, permission modes, hooks, and environment settings.

## When to Use
- Managing permissions, allowlists, and reducing permission prompts for read-only tools.
- Modifying `settings.json`, `hooks.json`, environment variables, or custom keybindings.
- Diagnosing and debugging hook execution and tool interception.

## Core Rules & Invariants
1. **Explicit Permissions**:
   - Add tool and command permissions only for verified, safe, and scoped operations.
2. **Hook Integrity**:
   - Validate hook scripts and matchers before updating harness settings.
