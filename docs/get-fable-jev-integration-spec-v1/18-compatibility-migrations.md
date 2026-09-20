# Compatibility and migration policy

## Public API

`routeTask()` remains synchronous and deterministic in v1.

Existing importers must not be forced to handle Promises.

## State schema

No `.fable/state.json` schema bump is required for initial Jev integration.

`RoutingDecision` persists unchanged.

Jev provenance is sidecar/internal.

## JSON CLI contracts

Existing `route --json` / `--json-v1` outputs remain compatible.

New reflex commands have their own schema version.

If hybrid metadata is later added to ordinary route output, it must be additive in a new explicit contract version.

## Registry

No registry schema bump is required if semantic boundaries live in a separate generated/advisory table.

Preferred approach:

- reuse current `description`, `intents`, `requires`, `produces`, `gates`
- add a code-owned `skill-boundaries.ts` only for contrastive `not_when` notes that the registry cannot express

Do not mutate registry semantics solely to improve a vendor prompt without review.

## Dependencies

Adding `@typesafe-ai/sdk` is conditional on Bun spike evidence.

## Offline behavior

Every existing offline workflow must continue to operate with no API key and no network.
