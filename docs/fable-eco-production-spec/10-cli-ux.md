# Fable Eco CLI and TUI Specification

## 1. Command surface

```text
get-fable eco
get-fable eco discover
get-fable eco catalog list
get-fable eco profiles
get-fable eco plan [profile|capability...]
get-fable eco install [profile|capability...]
get-fable eco update [capability...]
get-fable eco status
get-fable eco doctor
get-fable eco repair
get-fable eco recover
get-fable eco remove <capability...>
get-fable eco bind [profile|capability...]
get-fable eco unbind
get-fable eco hosts
get-fable eco explain <capability>
get-fable eco explain-run <contract-id>
```

The invisible Unicode separator shown in this design document must not be copied into implementation. Actual command token is plain `get-fable`

## 2. Default interactive command

`get-fable eco` performs discovery and opens the selector. It must not mutate before user reaches an explicit plan approval screen

Selector groups:
- Core Engineering
- Code Intelligence
- Browser and QA
- Frontend Quality
- Research
- Security
- Context and Efficiency
- Review and Delivery
- Optional Memory and Delegation

Each item shows:
- name
- one-line function
- support tier
- platform compatibility
- already installed state
- host compatibility summary
- additional runtime dependency count

## 3. Selection controls

- Space: toggle item
- A: select all compatible in current scope
- N: select none
- P: choose profile
- F: filter
- Enter: resolve selection
- Esc: exit without mutation

`select all` never selects blocked or hard-conflicting alternatives simultaneously

## 4. Plan screen

Human plan groups changes:
- capability installs
- capability updates
- dependencies
- downloads
- host config changes
- project config changes
- skipped items
- conflicts
- privilege requirements
- network destinations
- health checks

Approval prompt includes transaction count and a clear no-op path

## 5. Non-interactive use

Examples:

```bash
get-fable eco plan core --json-v1
get-fable eco install core --yes
get-fable eco install fable/rtk fable/codegraph --hosts codex,claude --yes
get-fable eco update --locked --yes
get-fable eco status --json-v1
```

`--yes` approves only a plan generated in the same invocation. For high-risk operations defined by policy, `--yes` may still be insufficient and the command exits with approval-required code

## 6. JSON envelope

All machine output:

```json
{
  "schema_version": 1,
  "command": "eco.plan",
  "ok": true,
  "result": {},
  "warnings": [],
  "errors": []
}
```

Errors contain:

```json
{
  "code": "ECO_RESOLUTION_CONFLICT",
  "message": "Selected capabilities have a hard conflict",
  "capability_ids": ["fable/a", "fable/b"],
  "operation_id": null,
  "remediation": ["remove fable/b from selection"]
}
```

## 7. Exit codes

- 0 success
- 2 invalid user input
- 10 discovery incomplete for required fact
- 11 catalog invalid
- 12 incompatible selection
- 13 resolution conflict
- 14 policy denied
- 20 network or metadata fetch failure
- 21 artifact verification failure
- 22 apply failure with successful rollback
- 23 recovery required
- 24 rollback failed
- 30 health check failed and transaction rolled back
- 40 host integration unsupported

Exact numeric assignments are part of V1 CLI contract and require migration notes if changed

## 8. Explain commands

`eco explain fable/codegraph` reports source, resolved version strategy, permissions, supported platforms, dependencies, conflicts, hosts, playbook roles, health check, and support tier

`eco plan --why` adds resolver reasons for selected, skipped, and alternative providers

## 9. Accessibility and terminal behavior

TUI must:
- work without color
- support narrow terminals down to 80 columns with reflow
- use text indicators in addition to color
- preserve keyboard-only operation
- degrade to numbered prompt when full-screen TUI cannot initialize
- respect `NO_COLOR`
- not emit control sequences in `--json-v1`

## 10. Logging

Default human output is concise. `--verbose` prints operation progress. `--debug` prints structured diagnostics but still redacts secrets. Debug logs identify source file or adapter only when useful and must avoid dumping full environment variables
