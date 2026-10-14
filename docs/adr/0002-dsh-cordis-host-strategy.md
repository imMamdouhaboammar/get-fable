# ADR 0002: DSH and Cordis Host Strategy

**Status:** Proposed for acceptance after M0 review  
**Date:** 2026-09-11

## Context

Fable Studio needs an installable host with model adapters, agent lifecycle, session persistence, tools, credentials, sandbox/approval seams, Web UI extension and desktop packaging.

Current DeepSeek Harness provides these capabilities and composes them through Cordis plugins. DSH also exposes AgentFactory/AgentRegistry, durable Session abstractions, provider-neutral LLM adapters, continuable subagents and a plugin-extensible browser client. Cordis provides Context/Fiber/service/effect lifecycle.

DSH Desktop currently releases Electron plus its matching DSH runtime as one signed unit rather than an independently updatable host/runtime pair.

Fable's product semantics, however, are Run/Task/Worker/Provider/Capability/Evidence/Policy. Those semantics must survive reasonable host evolution.

## Decision

Use **Option B with a compatibility-adapter hybrid**:

> Build Fable Studio initially as a Fable-owned distribution from a pinned, tested upstream DSH Desktop baseline. Implement Fable Runtime as Fable-owned services/plugins behind a private Host Adapter. Keep Cordis transitive and host-internal.

Do not deep-fork DSH at M0. Do not expose DSH/Cordis contracts as Fable public ABI.

Each Fable Studio release pins a supported DSH baseline and runs a compatibility suite before moving that pin.

## Decision drivers

- DSH already owns mature host primitives that are not Fable's differentiator.
- Rebuilding Agent/Session/LLM/Desktop infrastructure would delay the first agency vertical slice.
- Current DSH seams appear sufficient for a feasibility spike.
- DSH Agent Teams remain experimental and are not required by this decision.
- A private adapter preserves later host optionality.
- Deep forking immediately would transfer upstream maintenance/security/update burden without evidence that extension seams fail.

## Alternatives considered

### Option A: deep fork DeepSeek Harness

Rejected for initial architecture.

Benefits: maximum control and release independence.  
Costs: highest merge burden, security ownership, desktop update responsibility, upstream divergence and slower agency feature delivery.

### Option B: Fable distribution + upstream DSH + first-party Fable plugins

Selected, with an explicit Fable Host Adapter and pinned compatibility matrix.

Benefits: fastest path to mature host primitives, upstream compatibility, lower maintenance burden.  
Risk: upstream contracts may move; mitigated by adapter/conformance tests and pinned release baselines.

### Option C: Fable-owned host using selected Cordis components

Deferred.

This remains a strategic fallback if DSH's higher-level Agent/Session/Desktop contracts repeatedly prevent Fable requirements while Cordis remains useful. Starting here would require rebuilding substantial host behavior before proving need.

### Option D: host-independent core plus multiple equal hosts from day one

Rejected for v1 as premature. Fable Runtime is host-independent at the public boundary, but M1-M7 optimize one production host first.

## Consequences

Positive:

- Fable can focus on agency semantics and Issue-to-PR value.
- Studio inherits a working desktop/Web/agent/model substrate.
- public Provider ABI remains host-independent.
- upstream updates are explicit compatibility events rather than accidental semantic changes.

Negative:

- Fable Studio release testing includes DSH compatibility.
- some host limitations may require bounded extensions.
- Studio cannot treat arbitrary upstream updates as automatically safe.

## Risks

- DSH internal/API churn may create adapter maintenance.
- a required Studio UX seam may prove unavailable.
- subagent approval semantics may conflict with agency policy if privileged actions are placed inside child agents.
- Session persistence guarantees may differ by backend.

## Compatibility implications

Fable maintains a matrix:

```text
Studio version
Runtime version
Provider ABI version
Host Adapter version
DSH commit/version
provider conformance versions
known degradations
```

No public Fable schema contains Cordis Context/Fiber or DSH Agent/Session event types.

## Security implications

DSH native plugin install is executable-code trust. Fable's external provider marketplace cannot rely on DSH plugin listing/installability as security review. Fable controls which in-process plugins ship in its distribution.

## Migration implications

Current `get-fable` DSH integration can evolve into or sit beside the Fable Host Adapter. Existing DSH hardening Issues should repair that adapter independently; this ADR does not close or duplicate them.

## Verification

M1 must prove on an exact pinned DSH baseline:

- Fable plugin/service load;
- two bounded model-backed Workers;
- typed artifact handoff;
- Fable-owned durable Run transition;
- UI-observable Run events;
- cancellation;
- restart/reconciliation;
- model routing seam;
- capability invocation seam.

## Revisit trigger

Revisit this ADR if M1 returns `REQUIRES THIN FORK` or `NO-GO`, or if two consecutive supported DSH upgrades require invasive patches outside the Host Adapter/first-party plugin boundary.
