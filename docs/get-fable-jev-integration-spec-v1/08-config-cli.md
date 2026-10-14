# Configuration and CLI surface

## Configuration model

Initial configuration is environment-driven plus optional project-local non-secret config.

Suggested values:

```text
FABLE_REFLEX_MODE=off|shadow|recommend|guarded|authority
FABLE_REFLEX_PROVIDER=typesafe-jev
FABLE_REFLEX_MODEL=jev-1.13.0
FABLE_REFLEX_TIMEOUT_MS=800
FABLE_REFLEX_MIN_MARGIN=0.20
FABLE_REFLEX_TELEMETRY=local|off
TYPESAFE_API_KEY=<secret>
```

Default mode is `off`.

No installation flow may silently enable remote routing.

## Project config

If get-fable's config system supports project-local settings, allow non-secret values only:

```json
{
  "reflex": {
    "mode": "shadow",
    "provider": "typesafe-jev",
    "model": "jev-1.13.0",
    "timeoutMs": 1200,
    "minMargin": 0.2
  }
}
```

Environment variables take precedence for operational overrides.

## CLI additions

Suggested commands:

```text
get-fable reflex status
get-fable reflex doctor
get-fable reflex route "<task>" [--live] [--json]
get-fable reflex eval [--live] [--include-holdout]
get-fable reflex calibrate <recorded-results.jsonl>
get-fable reflex ledger [--limit N]
get-fable reflex clear-cache
```

Existing:

```text
get-fable route <task>
```

must remain deterministic unless an explicit project/user config enables a reflex mode.

For maximum backward compatibility, the first shipped version may keep existing `route` deterministic regardless of config and introduce the hybrid path behind `reflex route`. Wiring hybrid into ordinary `route` is a later rollout card after shadow evidence.

## Doctor checks

Add checks:

- provider configured
- credential present without exposing it
- model pinned when mode is guarded/authority
- SDK/runtime compatibility proven
- local ledger writable and safe
- mode is valid
- thresholds in range
- provider live check only when explicitly requested

Normal `doctor` should not create a remote request unless the user asks for a live provider check.
