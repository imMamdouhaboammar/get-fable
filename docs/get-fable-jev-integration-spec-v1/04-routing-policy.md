# Routing policy and fusion algorithm

## Principle

Jev may advise on semantics. Code owns authority boundaries.

## Hard-policy classes

The following are deterministic locks in v1 and cannot be downgraded by Jev:

1. Recovery lock when state or explicit repeated-failure rules require `fable-recover`.
2. Explicit red-team request routes to `fable-redteam`.
3. Explicit heal/remediation request routes to `fable-heal` when current deterministic policy identifies it.
4. Explicit release/publish/tag/merge-readiness request remains bounded by deterministic release policy.
5. Explicit handoff/session-continuation request remains bounded by deterministic handoff policy.
6. Explicit user suppressions remain constraints.
7. Registry validity, skill existence, gates, fallbacks, and next-skill graph are always deterministic.
8. State transition legality and evidence/completion policy are always deterministic.

Jev may recommend escalation into a hard class, but never de-escalate out of a hard class.

## Fusion modes

### `off`

No network call. Existing behavior only.

### `shadow`

Jev runs. Its advice is recorded. Returned decision is identical to deterministic router output.

### `recommend`

Returned canonical decision remains deterministic. Optional non-persisted diagnostics include Jev suggestion for UI/CLI maintainer visibility.

### `guarded`

Jev may override only when all of these hold:

- route is not hard-locked
- Jev selected skill exists in canonical registry
- Jev choice confidence clears the skill risk threshold
- top-1 probability margin clears the configured margin
- second-stage verification, when required, confirms the selection
- no explicit user suppression conflicts
- candidate route does not violate lifecycle/registry policy
- model version is approved

### `authority`

Same as guarded, but broader approved route classes may be model-driven. Hard-policy classes remain deterministic.

Authority is not a required milestone.

## Bootstrap risk tiers

These values are starting hypotheses only and must be tuned with get-fable evaluation data.

```text
low-risk advisory route      min confidence 0.72
medium-risk route            min confidence 0.80
high-risk route              min confidence 0.88
minimum top1-top2 margin     0.20
```

Risk tiers are assigned in code by route class, not by Jev.

Suggested high-risk classes:

- `fable-recover`
- `fable-security`
- `fable-redteam`
- `fable-heal`
- `fable-release`
- `fable-handoff`
- `fable-run`
- `fable-cowork`
- `fable-loop`
- `fable-config`
- `fable-architecture`
- `fable-eco`

Initially, high-risk classes are escalation-only and not Jev override targets.

## Two-stage ambiguity handling

First pass uses the complete canonical skill roster.

If any of the following are true:

- Choice confidence below direct-action threshold
- top1-top2 margin below configured margin
- top two skills share a pack or are known semantic neighbors
- deterministic and Jev routes disagree on a medium/high-risk class

then run a second Jev call with only the top three candidates plus `none_of_these`, using richer skill criteria.

If second-stage confidence remains below threshold, abstain and use deterministic routing.

## Semantic escalation Nouls

Companion Nouls are advisory signals, not direct route selectors:

- `needs_recovery`
- `security_relevant`
- `needs_current_external_research`
- `needs_planning`
- `needs_behavior_verification`
- `is_behavior_change`
- `benefits_from_delegation`

Noul thresholds must be tuned independently. Do not reuse Choice confidence thresholds for Noul probabilities.

## Final decision construction

Jev must not supply:

- pack
- required gates
- fallback
- next skills
- mutation semantics
- state transition

Once a final skill is selected, those fields are populated from the canonical registry and deterministic helpers.

`reasons` should contain concise, inspectable provenance such as:

```text
semantic router selected fable-research (p=0.86, confidence=0.78)
second-stage disambiguation confirmed fable-research over fable-discover
```

Do not persist model chain-of-thought.
