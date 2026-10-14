# ADR 0005: Model as a Provider Capability

**Status:** Proposed for acceptance after M0 review  
**Date:** 2026-09-11

## Context

A coding-agency runtime may need different reasoning characteristics for issue analysis, planning, code generation, review, security, classification or summarization. It also has Tasks that require no LLM at all.

Treating one LLM as the runtime root would force every operation through one model, blur policy with model preference and make multi-provider routing an afterthought.

DSH already demonstrates a useful separation between provider route and model ID through its provider-neutral LLM adapter runtime, but Fable requires higher-level workload routing and policy metadata that must remain host-independent.

## Decision

Treat Models as Providers of versioned reasoning/vision Capabilities.

Examples:

```text
reasoning.issue_analysis.v1
reasoning.planning.v1
reasoning.architecture.v1
reasoning.code.v1
reasoning.review.v1
reasoning.security.v1
reasoning.summarize.v1
reasoning.judge.v1
vision.inspect.v1
```

A Worker declares required reasoning capabilities. The Capability Broker resolves a model route using hard constraints and Runtime policy before optional model-assisted ranking.

Different Workers in one Run may use different model routes. Deterministic Tasks do not invoke a model merely for architectural uniformity.

## Decision drivers

- model/provider interchangeability;
- workload-specific routing;
- explicit cost/privacy/latency constraints;
- ability to use local/non-LLM deterministic providers;
- avoid LLM authority over hard security/policy gates;
- preserve DSH host optionality.

## Alternatives considered

### One configured primary model for the whole Run

Rejected as the architecture contract. A user may set a default preference, but it remains a resolver input rather than a structural limitation.

### One model per Agent role encoded in prompts/config only

Rejected. Prompt configuration cannot enforce availability, privacy, cost, trust or provider health and is difficult to observe/recover transactionally.

### Expose DSH `LlmAdapter` as the Fable model ABI

Rejected. It is a valuable Host Adapter implementation seam but does not define Fable workload capability policy.

## Consequences

The model registry may store:

```text
provider route
model ID
supported workload capabilities
context limits
reasoning/tool/multimodal support
privacy restrictions
cost hints
latency hints
availability/health
user preference
historical evaluation metrics
```

The Runtime records the resolved model route per Worker for observability and reproducibility.

## Risks

- capability labels can become subjective marketing categories;
- historical evaluation can overfit narrow tasks;
- model catalogs and prices change frequently.

Mitigations:

- keep v1 workload taxonomy small and tied to actual M6 tasks;
- treat provider metadata as hints unless empirically verified;
- keep health/cost/catalog data freshness-bounded;
- require evaluation evidence before automated preference promotion.

## Compatibility implications

DSH LLM adapters, direct model APIs or remote model providers can all implement the Fable model provider contract through transport adapters. Fable public Worker state stores Fable route refs rather than DSH adapter instances.

## Security implications

Model selection occurs only among providers that already pass trust/privacy/permission hard gates. A model cannot recommend itself or another rejected provider back into the candidate set.

Sensitive context is materialized only after a route satisfies effective data/privacy policy.

## Migration implications

Existing get-fable or DSH “provider/model” configuration can seed Fable model candidates without changing the public Worker contract.

## Verification

Tests must prove:

- two Workers in one Run can resolve different model routes;
- a no-model Task can complete without an LLM call;
- privacy/permission hard rejection occurs before ranking;
- optional model-assisted selection receives only admissible candidates;
- model route/version/provenance is recorded with Worker output;
- provider failure can trigger policy-approved fallback without rewriting Task semantics.

## Revisit trigger

Revisit the workload taxonomy after the Issue-to-PR evaluation corpus identifies stable task classes that are missing or misleading. Do not add categories solely because a model vendor advertises them.
