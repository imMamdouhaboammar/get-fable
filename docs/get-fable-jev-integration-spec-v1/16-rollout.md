# Rollout plan

## Phase 0: compatibility spike

Deliverables:

- Bun compatibility evidence for `@typesafe-ai/sdk`
- decision: SDK vs direct fetch
- provider adapter test harness
- ADR update

No product behavior changes.

## Phase 1: internal types and pure fusion

Add internal schemas/interfaces and pure fusion policy with fixtures.

No network calls in ordinary product paths.

## Phase 2: reflex CLI + shadow engine

Add explicit `get-fable reflex route --live` and shadow ledger.

Existing `get-fable route` remains unchanged.

## Phase 3: benchmark integration

Add deterministic/Jev/hybrid arms, calibration, and report artifact.

Run known/negative/ambiguous/adversarial corpora. Holdout only at promotion gate.

## Phase 4: shadow on ordinary route

With explicit user opt-in, ordinary routing executes Jev shadow call but returns deterministic decision.

Collect local shadow evidence.

## Phase 5: recommend mode

Expose Jev recommendation in diagnostics/UI but do not persist model-selected route.

## Phase 6: guarded override

Enable only approved low/medium-risk route classes and only after acceptance gates.

Hard classes remain deterministic.

## Rollback

Rollback must always be one configuration change:

```text
FABLE_REFLEX_MODE=off
```

No state migration is required to disable the feature.

If a code rollback is needed, removing the async orchestration/provider layer must leave `routeTask()` and state semantics intact.
