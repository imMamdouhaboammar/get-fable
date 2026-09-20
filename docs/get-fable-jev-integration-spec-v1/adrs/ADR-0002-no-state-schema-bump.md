# ADR-0002: Do not add Jev provenance to RoutingDecision v1

Status: Accepted

## Decision

Keep `RoutingDecision` and state schema v3 unchanged for the first integration. Store Jev/reflex provenance in an internal `RouteResolution` and optional `.fable/reflex/events.jsonl` ledger.

## Rationale

A state-schema change would unnecessarily couple provider experimentation to durable lifecycle compatibility and Rust parity.
