# Observability and routing provenance

## Local-first telemetry

The reflex integration does not introduce mandatory external telemetry.

Default telemetry is local and task-content-minimized.

## Routing provenance object

Internal, non-state schema:

```ts
interface RoutingProvenanceV1 {
  schemaVersion: 1;
  mode: ReflexMode;
  deterministicSkill: FableSkillId;
  finalSkill: FableSkillId;
  hardLocked: boolean;
  overrideApplied: boolean;
  overrideReason?: string;
  provider?: {
    id: string;
    model: string;
    selectedSkill?: FableSkillId;
    confidence?: number;
    topProbability?: number;
    secondProbability?: number;
    margin?: number;
    latencyMs: number;
    inputTokens?: number;
    stage2Used: boolean;
  };
  providerError?: ReflexProviderError;
}
```

## Human-readable diagnostics

`get-fable reflex route` may display:

```text
Deterministic: fable-discover
Jev:           fable-research (p=.81, confidence=.74)
Runner-up:     fable-discover (.14)
Policy:        recommend-only
Final:         fable-discover
Reason:        Jev cannot override in recommend mode
```

This is routing provenance, not chain-of-thought.

## Dashboard metrics

If surfaced in DSH UI later, show:

- agreement rate
- override precision
- abstention rate
- latency
- provider health
- model version
- latest calibration evidence age

Avoid vanity metrics such as "AI confidence average" without calibration context.
