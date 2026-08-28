---
name: fable-config
description: >
  Configure and audit AI agent harness settings, permissions allowlists, environment variables, editor keybindings, and lifecycle hook integrations. Use when modifying settings.json, adjusting tool permissions, setting up environment variables, or configuring agent lifecycle hooks — even if the user does not explicitly say "fable-config" (e.g. "update settings", "allow command permissions", "configure agent hooks", "setup environment variables"). Do NOT use for application-level business configuration.

version: 1.3.0
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

# Fable Config

Change harness/configuration behavior with explicit precedence, least privilege, secret-safe handling, and a verified rollback path.

## Mission
Configuration is executable behavior. A syntactically valid JSON/TOML/YAML file can still disable a guard, broaden permissions, write to the wrong scope, or be ignored because another source has higher precedence.

The Skill must prove both **configuration validity** and **effective behavior**.

## Activate When
- changing host/harness settings, permissions, hooks, keybindings, model/tool config, or environment references;
- adding/removing lifecycle enforcement;
- troubleshooting why a setting is not taking effect;
- configuring safe command/tool allowlists;
- migrating configuration formats/scopes.

## Do Not Activate When
- storing raw credentials/secrets;
- application business logic is the real change;
- a host capability is unknown and needs research/discovery first;
- the requested change is to weaken a safety boundary merely to bypass an error without understanding it.

## Configuration Classification
| Change | Main risk |
| --- | --- |
| Permission/allowlist | excessive privilege/wildcard scope |
| Hook registration | hook exists but is never invoked / blocks wrong phase |
| Environment config | precedence, secret leakage, type/format |
| Host settings | wrong user/project scope, unsupported keys |
| Model/tool config | changed behavior/cost/access unexpectedly |
| Keybindings/UI | collision/override |
| Generated config | manual edit overwritten by generator |

## Protocol
### Stage 1 — Locate source and effective scope
Identify:
- target host/version;
- project vs user/global scope;
- all configuration sources and precedence;
- generated vs hand-maintained files;
- existing user customizations to preserve.

Do not edit the first file with the right name until you know it is effective.

### Stage 2 — Define desired behavior and least privilege
State exactly what capability should become allowed/blocked/triggered and what must remain unchanged.

For permissions, prefer narrow command/tool/path patterns. Wildcards need explicit justification and threat consideration.

### Stage 3 — Protect secrets
Configuration may reference environment variable names or secure stores, but should not embed raw tokens/passwords/private keys unless the target's secure format explicitly requires protected encrypted storage.

If an existing secret is found in plaintext, do not echo it; route exposure handling appropriately.

### Stage 4 — Make a minimal merge
Preserve unknown/user-defined settings. Avoid replacing an entire config object/file when one scoped key can be merged.

For generated config, modify source/generator then regenerate.

### Stage 5 — Validate structure and semantics
Run available parser/schema/host diagnostics. Check:
- syntax;
- key types/enums;
- duplicate/conflicting entries;
- unsupported/deprecated keys;
- permission pattern scope;
- hook command/path existence.

### Stage 6 — Prove effective behavior
A valid file is not enough. Test the configured behavior safely:
- target command is allowed while broader command remains denied;
- hook fires at intended lifecycle point;
- project override wins as expected;
- setting is visible to the target host;
- rollback restores previous behavior.

### Stage 7 — Record rollback and handoff
Capture changed source, effective scope, validation, behavioral proof, and how to revert if the host fails after restart/update.

## Decision Rules
- Preserve existing user settings not owned by the task.
- Prefer exact allowlists over `*`, shell wildcards, root/global permissions.
- A config key accepted by parser but ignored by host is not a successful change; verify effect.
- Host integration levels differ; do not claim hooks/enforcement where the host only supports advisory rules.
- Environment variable name may be stored; secret value should remain in secure environment/credential store.
- If config precedence is uncertain, investigate before editing more files.
- Do not disable security/approval checks simply because they are blocking an unsafe action.
- If a malformed edit can lock out the host, keep a reversible backup/atomic write strategy.

## Invariants
- Least privilege is preserved or any broadening is explicit and justified.
- Raw secrets are not introduced into repository/config logs.
- Existing unrelated user configuration is preserved.
- Edited source is the effective source-of-truth.
- Syntax/schema and actual host behavior both verify.
- Rollback is possible for material changes.

## Failure Taxonomy
### Precedence mismatch
Edited file is shadowed by another scope/source. Trace effective configuration.

### Schema-valid but ignored
Host accepts file but does not support/use key. Verify host version/capability.

### Permission overreach
Pattern allows more than requested. Narrow and test negative case.

### Hook misregistration
Script exists but lifecycle never invokes it. Validate registration path/event and permissions.

### Secret leakage
Credential embedded/logged. Remove safely and rotate if exposure occurred.

### User-config clobber
Whole-file rewrite loses existing settings. Restore/merge surgically.

### Generated drift
Manual edit is overwritten. Change generator/source instead.

## Anti-Patterns
- `"allow": ["*"]` to stop approval prompts;
- editing global config when project scope suffices;
- copying API tokens into settings examples;
- validating JSON syntax and calling the hook configured;
- claiming full lifecycle enforcement on a host with advisory-only integration;
- resetting the whole config file for one key;
- disabling security controls to make a command pass;
- manually patching generated config.

## Configuration Packet
```text
Target host/version/scope:
Effective config sources + precedence:
Desired behavior:
Settings changed:
Permissions before/after:
Secret handling:
Syntax/schema validation:
Behavioral proof + negative case:
Preserved user settings:
Rollback:
```

## Completion Criteria
Configuration completes when:
- correct effective source/scope was changed minimally;
- configuration parses and satisfies schema/capability constraints;
- permissions remain least-privilege;
- secrets/unrelated settings remain safe;
- target behavior is empirically observed, including important negative case;
- rollback and host limitations are explicit.

## Progressive Resources
- Deep guide: `references/config-precedence-permissions-and-hooks.md`
- Existing rules: `references/harness-configuration-rules.md`
- Example: `examples/configure-allowlist.md`
