# ADR 0003: Fable-Owned Provider Boundary

**Status:** Proposed for acceptance after M0 review  
**Date:** 2026-09-11

## Context

Fable needs to coordinate DSH-native implementations, MCP servers, local CLIs, SDK libraries, HTTP services, model APIs and remote agents. If Fable public semantics copy any one transport's API, host changes will become product-breaking changes and provider selection will become vendor-specific routing.

## Decision

Introduce a Fable-owned Provider ABI between agency semantics and every host/transport implementation.

```text
Fable Runtime
  -> Fable Provider ABI
     -> transport/Host Adapter
        -> DSH / MCP / CLI / SDK / HTTP / model API / remote agent
```

The Provider ABI describes outcome capabilities, permissions, side effects, trust, compatibility, health, invocation, cancellation, reconciliation, artifacts and evidence provenance.

DSH/Cordis types are private implementation details of the DSH Host Adapter.

## Decision drivers

- preserve Fable semantics across host evolution;
- allow deterministic and model-backed capabilities to share one resolver;
- keep security/policy enforcement at the Runtime boundary;
- avoid vendor-named capability APIs;
- make provider conformance independently testable.

## Alternatives considered

### Expose DSH plugin/service APIs directly

Rejected. This would make host implementation details public Fable contracts and would couple every provider to DSH/Cordis lifecycle.

### Standardize only on MCP

Rejected for v1. MCP is useful transport but does not replace in-process host services, model adapter metadata, local filesystem/shell providers or Fable-specific evidence/policy contracts.

### Build a different API for each provider kind

Rejected. Domain-specific schemas remain capability-specific, but lifecycle/security/provenance/cancellation must share one provider envelope to keep the Runtime coherent.

## Consequences

Positive:

- host replacement is possible without changing Run/Task/Worker semantics;
- provider testing can use fake transports;
- Runtime policy sees one normalized permission/side-effect model;
- model providers become ordinary capability providers.

Negative:

- adapters must translate transport-specific behavior;
- lowest-common-denominator design is a risk if capability schemas are over-generalized;
- ABI versioning becomes a maintained public contract.

## Risks

The largest design risk is attempting to encode every future provider feature in v1. The mitigation is a small common envelope plus capability-specific input/output schemas and an M6-bounded capability taxonomy.

## Compatibility implications

Breaking Provider ABI changes require a new ABI major. Capability semantic breaks require a new capability major identifier. Host Adapter changes can remain private when the public provider contract is unchanged.

## Security implications

Provider manifests request permissions; they do not grant them. Provider output is untrusted at the ABI boundary. Runtime validates schemas and effective grants before state transitions.

## Migration implications

Existing `get-fable` functions and DSH services can be wrapped incrementally. They do not need to be rewritten before a provider adapter exists.

## Verification

M2 Provider Conformance Harness must prove:

- host-independent fake providers can execute without DSH imports;
- malformed output fails closed;
- denied permissions prevent invocation;
- cancellation and timeout normalize consistently;
- evidence/provider provenance is preserved;
- providers cannot directly complete a Run.

## Revisit trigger

Revisit if Wave-1 providers cannot be represented without adding vendor-specific control fields to the common invocation envelope. In that case, prefer capability-specific extension schemas before removing the boundary.
