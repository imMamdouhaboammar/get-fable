# Fable Eco Observability and Doctor Specification

## 1. Observability model

Eco is local-first. Observability is structured local diagnostics, not mandatory telemetry

Event fields:
- timestamp
- event schema version
- transaction ID when present
- command
- phase
- operation ID
- capability ID
- host ID
- status
- duration_ms
- error code
- redacted details

## 2. Event storage

Normal events can be written to a rotating local JSONL log under `~/.fable/eco/logs/`. Rotation is size-bounded. Debug logging is opt-in. Logs never include full environment dumps or secret values

## 3. Doctor checks

`get-fable eco doctor` runs ordered checks:

### State integrity
- state root safe
- no unresolved journal
- inventory schema valid
- lock schema valid
- receipt references valid
- catalog digests available

### Capability integrity
- installed path exists
- resolved binary/package identity matches inventory
- expected version is observable when health contract supports it
- artifact digest matches for Eco-owned immutable files
- health check passes

### Host integrity
- host still detected
- owned binding exists
- no duplicate owned registration
- config parse succeeds
- owned fragment has not drifted
- enforcement grade still satisfies bound playbooks

### Project binding
When run in a repository:
- `.fable/eco.json` schema valid
- bound profile exists
- required capabilities installed
- minimum contract versions satisfied

## 4. Doctor statuses

- PASS: expected state confirmed
- WARN: degraded but safe, such as optional host missing
- FAIL: capability or binding cannot operate
- BLOCKED: state ambiguity or open recovery prevents safe mutation

Doctor exit code is non-zero for FAIL or BLOCKED

## 5. Repair plan

`doctor --repair-plan` emits a non-mutating plan. `repair` applies only operations categorized safe repair. Version changes require update, not repair

## 6. Support bundle

`eco doctor --support-bundle <path>` creates a redacted archive containing:
- get-fable version
- platform facts
- catalog IDs and digests
- inventory with user paths normalized
- lock with URLs but no credentials
- doctor report
- recent Eco event logs
- active journal if present, redacted

Excluded:
- source code
- repository contents
- raw prompts
- environment variable values
- auth tokens
- browser profiles
- vendor credentials

## 7. Explainable diagnostics

Every FAIL includes:
- stable check ID
- observed fact
- expected fact
- likely cause category
- safe next command

Doctor should not recommend destructive deletion as the first remediation
