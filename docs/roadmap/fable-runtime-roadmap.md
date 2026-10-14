# Fable Runtime Dependency Roadmap

**Status:** Proposed M0 roadmap  
**Date:** 2026-09-11

## Dependency graph

```text
M0 Architecture baseline
│
├── C00 Accept product/runtime RFC
├── C01 Accept authority/state model
├── C02 Accept DSH/Cordis host ADR
├── C03 Accept Provider ABI direction
└── C04 Accept trust/evidence/worker contracts
        │
        v
M1 Host feasibility
│
├── C10 Execute DSH/Cordis Worker spike
└── C11 Record verdict + Host Adapter constraints
        │
        ├───────────────────────────────┐
        v                               v
M2 Provider ABI                     Host extension (only if required)
│                                       │
├── C20 ABI schemas/core                C12 narrow host extension
├── C21 Provider conformance            │
└── C22 Capability catalog              │
        │                               │
        └──────────────┬────────────────┘
                       v
M3 Agency Runtime kernel
│
├── C30 Run Store + migrations
├── C31 Task/Worker state machines
├── C32 Artifact registry
└── C33 Recovery/reconciliation
        │
        v
M4 Resolution and policy
│
├── C40 Capability Broker
├── C41 Model Router
└── C42 Policy + Approval engine
        │
        v
M5 Wave-1 providers
│
├── C50 DSH Host Adapter
├── C51 get-fable provider
├── C52 GitHub provider
├── C53 Riqor provider
├── C54 Agent Kernel provider
└── C55 Dokion provider
        │
        v
M6 Issue -> verified PR
│
├── C60 orchestration graph
├── C61 deterministic verification/review/CI loop
└── C62 end-to-end sandbox-repository acceptance
        │
        v
M7 Fable Studio distribution
│
├── C70 Run Detail product surface
├── C71 pinned DSH desktop distribution
└── C72 packaged cross-platform smoke/update matrix
        │
        v
M8 external provider ecosystem
│
├── C80 installation/trust pipeline
├── C81 external isolation transport
└── C82 marketplace/revocation/update policy
        │
        v
M9 evaluation-driven routing
   ├── C90 routing evaluation corpus
   ├── C91 performance/history policy
   └── C92 controlled promotion/self-improvement
```

## Readiness legend

```text
READY                  enough evidence exists to implement when dependencies land
BLOCKED                known dependency or evidence must land first
NEEDS RESEARCH         load-bearing technical fact is not yet proven
NEEDS PRODUCT DECISION a user/product semantic choice cannot be inferred safely
```

## M0 cards

### C00 — Accept Fable Studio + Agency Runtime RFC

**Outcome:** One reviewed product/runtime architecture baseline.  
**Why:** downstream implementation needs stable vocabulary and ownership.  
**Depends on:** current repository/upstream archaeology.  
**Owns:** public product model and M0 decision set.  
**Must not change:** current production code.  
**User-visible behavior:** none.  
**Architectural invariant:** Fable is a Coding Agency Runtime, not one Agent.  
**Implementation constraints:** documentation only.  
**Files likely involved:** `docs/superpowers/specs/2026-09-11-fable-studio-agency-runtime-v1.md`.  
**Tests required:** link/contract review; contradiction review against current source.  
**Acceptance evidence:** accepted review with no unresolved M0-blocking contradiction.  
**Rollback / recovery:** revert doc commit.  
**Integration handoff:** M1/M2.  
**Parallel-safe with:** C01-C04 review.  
**Risk:** Medium.  
**Confidence:** High.  
**Effort:** S.  
**Readiness:** READY.

### C01 — Accept authority and state ownership model

**Outcome:** explicit single-writer authority matrix.  
**Depends on:** C00 terminology.  
**Owns:** Run/provider state boundaries.  
**Must not change:** provider source-of-truth semantics.  
**Architectural invariant:** provider-authored state remains provider-owned.  
**Files:** `docs/architecture/authority-and-state-ownership.md`, ADR 0004.  
**Tests:** cross-doc ownership consistency review.  
**Acceptance evidence:** no state object has competing authoritative writers.  
**Parallel-safe with:** C02-C04.  
**Risk:** High if wrong.  
**Confidence:** High.  
**Effort:** S.  
**Readiness:** READY.

### C02 — Accept DSH/Cordis host strategy

**Outcome:** choose distribution + adapter or record contrary M0 evidence.  
**Depends on:** current DSH/Cordis archaeology.  
**Owns:** host dependency direction.  
**Must not change:** Provider ABI independence.  
**Acceptance evidence:** ADR 0002 review and executable M1 falsifier list.  
**Parallel-safe with:** C03-C04.  
**Risk:** High.  
**Confidence:** Medium until M1.  
**Effort:** S.  
**Readiness:** READY for provisional acceptance; runtime commitment remains gated by M1.

### C03 — Accept Provider ABI direction

**Outcome:** host-independent v1 conceptual ABI.  
**Depends on:** C00-C01.  
**Must not change:** no DSH/Cordis public types.  
**Files:** Provider ABI RFC, ADR 0003.  
**Acceptance evidence:** Wave-1 providers fit the contract conceptually.  
**Risk:** High.  
**Confidence:** Medium-High.  
**Effort:** S.  
**Readiness:** READY for M0; implementation stability BLOCKED by C11.

### C04 — Accept Worker/evidence/security contracts

**Outcome:** normative M0 state machine and trust/evidence contracts.  
**Depends on:** C00-C03.  
**Acceptance evidence:** state transitions, evidence falsifiers and security boundaries are explicit.  
**Risk:** High.  
**Confidence:** High.  
**Effort:** S.  
**Readiness:** READY.

## M1 cards

### C10 — Execute DSH/Cordis Worker feasibility spike

**Outcome:** measured proof of two bounded Workers, typed artifact handoff, Run persistence, cancellation, restart and UI events on a pinned DSH baseline.  
**Why:** host suitability is the largest implementation dependency.  
**Depends on:** C00-C04.  
**Owns:** spike code/evidence only.  
**Must not change:** production Runtime architecture or public ABI.  
**User-visible behavior:** experimental spike panel only.  
**Architectural invariant:** Fable Run state stays outside DSH Session.  
**Implementation constraints:** fake/replay model in required tests; no remote destructive side effects; artifact classification `throwaway` by default.  
**Files likely involved:** isolated experimental/spike path plus DSH profile/plugin test fixtures.  
**Tests required:** unit/state-machine, DSH host integration, restart/cancel, Web panel integration.  
**Acceptance evidence:** evidence bundle defined in `docs/spikes/dsh-cordis-feasibility.md`.  
**Rollback / recovery:** delete/revert spike branch without affecting production.  
**Integration handoff:** C11.  
**Parallel-safe with:** non-mutating provider API research for C54/C55; not with competing edits to Host Adapter architecture.  
**Risk:** High.  
**Confidence:** Medium.  
**Effort:** L.  
**Readiness:** READY.

### C11 — Record M1 verdict and Host Adapter contract

**Outcome:** GO / GO WITH CONSTRAINTS / REQUIRES HOST EXTENSION / REQUIRES THIN FORK / NO-GO plus measured Host Adapter interface.  
**Depends on:** C10.  
**Must not change:** evidence results to fit preferred architecture.  
**Acceptance evidence:** every M1 question answered with measured evidence or explicit unsupported constraint.  
**Risk:** High.  
**Confidence:** blocked until spike.  
**Effort:** M.  
**Readiness:** BLOCKED by C10.

### C12 — Narrow DSH host extension if M1 requires it

**Outcome:** smallest supported extension needed by Fable.  
**Depends on:** C11 verdict `REQUIRES HOST EXTENSION`.  
**Must not change:** public Provider ABI.  
**Tests:** upstream/adapter contract tests.  
**Readiness:** BLOCKED; conditional card.

## M2 cards

### C20 — Implement Provider ABI schemas and core types

**Outcome:** versioned manifest, invocation/result, permission, artifact, evidence and failure types.  
**Depends on:** C11; C12 if required.  
**Owns:** public ABI package/module.  
**Must not change:** current get-fable portable lifecycle semantics.  
**Architectural invariant:** no DSH/Cordis imports.  
**Tests:** schema round-trip, malformed input, version compatibility, secret-field negative tests.  
**Acceptance evidence:** ABI package can compile/test with only fake providers.  
**Parallel-safe with:** C22 after schemas stabilize.  
**Risk:** High.  
**Confidence:** Medium.  
**Effort:** M.  
**Readiness:** BLOCKED by C11.

### C21 — Implement Provider Conformance Harness

**Outcome:** reusable contract suite every provider adapter must pass.  
**Depends on:** C20.  
**Tests required:** permission denial, cancellation, malformed output, provenance, reconciliation, dispose, health.  
**Acceptance evidence:** at least two fake provider transports pass; intentional broken fixtures fail.  
**Parallel-safe with:** capability catalog docs after C20.  
**Risk:** High.  
**Confidence:** High.  
**Effort:** M.  
**Readiness:** BLOCKED by C20.

### C22 — Implement M6 capability catalog

**Outcome:** versioned small capability registry required for Issue-to-PR.  
**Depends on:** C20.  
**Must not change:** add no speculative Wave-2 capabilities.  
**Tests:** duplicate/version/alias validation.  
**Risk:** Medium.  
**Confidence:** High.  
**Effort:** S.  
**Readiness:** BLOCKED by C20.

## M3 cards

### C30 — Implement Fable Run Store

**Outcome:** SQLite-backed event + projection store with migrations/revisions.  
**Depends on:** C20, C11.  
**Owns:** Fable-owned Run persistence only.  
**Must not change:** `.fable/state.json`, DSH Session store, provider-owned stores.  
**Tests:** atomic rollback, revision conflict, crash reopen, migrations, corruption/unsupported schema, event/projection parity, secret negative fixtures.  
**Acceptance evidence:** state-machine generated histories replay to identical projections.  
**Parallel-safe with:** C31/C32 if interfaces frozen.  
**Risk:** High.  
**Confidence:** Medium-High.  
**Effort:** L.  
**Readiness:** BLOCKED by C20/C11.

### C31 — Implement Task and Worker state machines

**Outcome:** deterministic transitions/readiness/attempt lineage.  
**Depends on:** C20.  
**Tests:** transition table, cancellation race, dependency readiness, deadlock/blockers, restart reconciliation state.  
**Acceptance evidence:** property/state-machine tests.  
**Parallel-safe with:** C30/C32 behind interfaces.  
**Risk:** High.  
**Confidence:** High.  
**Effort:** M.  
**Readiness:** BLOCKED by C20.

### C32 — Implement Artifact registry and typed handoff

**Outcome:** immutable artifact refs with schema/digest/provenance.  
**Depends on:** C20.  
**Tests:** schema mismatch, digest mismatch, producer lineage, retention ref behavior.  
**Parallel-safe with:** C30/C31.  
**Risk:** Medium.  
**Confidence:** High.  
**Effort:** M.  
**Readiness:** BLOCKED by C20.

### C33 — Implement recovery/reconciliation coordinator

**Outcome:** restart reconciliation for Workers and external operation refs.  
**Depends on:** C30-C32, C50 provider host binding contract.  
**Tests:** running->reconciling, provider unavailable, known-complete operation, unknown non-idempotent result, Session reattach.  
**Risk:** High.  
**Confidence:** Medium.  
**Effort:** L.  
**Readiness:** BLOCKED.

## M4 cards

### C40 — Capability Broker

**Outcome:** hard gates, policy filters, deterministic ranking and route commit.  
**Depends on:** C20-C22, C31.  
**Tests:** hard rejects precede ranking, health/trust/permission gates, deterministic tie behavior, route history.  
**Risk:** High.  
**Confidence:** High.  
**Effort:** M.  
**Readiness:** BLOCKED.

### C41 — Model Router

**Outcome:** models registered/routed as capability providers per Worker.  
**Depends on:** C40, C50.  
**Tests:** different routes per Worker, no-model Task, privacy rejection, fallback policy.  
**Risk:** Medium-High.  
**Confidence:** Medium.  
**Effort:** M.  
**Readiness:** BLOCKED.

### C42 — Policy and Approval Engine

**Outcome:** exact-action permissions/approval state separate from model/host prompts.  
**Depends on:** C20, C31, C40.  
**Tests:** action identity change invalidates approval, Fable∩Dokion policy, child-Agent approval not assumed, merge permission separate.  
**Risk:** Critical.  
**Confidence:** High architecturally.  
**Effort:** L.  
**Readiness:** BLOCKED.

## M5 cards

### C50 — Production DSH Host Adapter

**Outcome:** bind Fable Workers/model routes/events to supported DSH host contracts.  
**Depends on:** C11, C20-C21, C31.  
**Must not change:** public ABI.  
**Tests:** M1 scenarios promoted to conformance/integration tests.  
**Risk:** High.  
**Confidence:** BLOCKED until M1.  
**Effort:** L.  
**Readiness:** BLOCKED.

### C51 — get-fable Provider Adapter

**Outcome:** expose portable discovery/planning/routing/evidence capabilities without making `.fable/state.json` the Run Store.  
**Depends on:** C20-C22, C21.  
**Tests:** workspace identity, bounded outputs, no duplicate state authority.  
**Risk:** Medium.  
**Confidence:** High.  
**Effort:** M.  
**Readiness:** BLOCKED by M2.

### C52 — GitHub Provider Adapter

**Outcome:** Issue/PR/CI/merge capability implementation.  
**Depends on:** C20-C22, C21, C42 for merge path.  
**Tests:** stale head, pagination, idempotent reconciliation, expected-head merge.  
**Risk:** High.  
**Confidence:** High.  
**Effort:** L.  
**Readiness:** BLOCKED by M2/M4.

### C53 — Riqor Provider Adapter

**Outcome:** `verification.freshness` + evidence refs.  
**Depends on:** C20-C22, C21.  
**Tests:** later mutation stales proof, provider state corruption, privacy boundary.  
**Risk:** High completion impact.  
**Confidence:** High.  
**Effort:** M.  
**Readiness:** BLOCKED by M2.

### C54 — Agent Kernel Provider Adapter

**Outcome:** bounded project memory read/propose.  
**Depends on:** C20-C22, C21, machine-interface research.  
**Evidence missing:** exact stable SDK/MCP/CLI JSON contract selected for adapter.  
**How to resolve:** narrow API archaeology/spike without production mutation.  
**Risk:** Medium.  
**Confidence:** Medium.  
**Effort:** M.  
**Readiness:** NEEDS RESEARCH.

### C55 — Dokion Provider Adapter

**Outcome:** execute/resume active declared Playbook under intersected policy.  
**Depends on:** C20-C22, C21, C42, machine-interface research.  
**Evidence missing:** exact stable machine schemas for validate/plan/status/run/resume/verify/approval.  
**Risk:** High.  
**Confidence:** Medium.  
**Effort:** L.  
**Readiness:** NEEDS RESEARCH.

## M6 cards

### C60 — Issue-to-PR orchestration graph

**Outcome:** Runtime creates/schedules Tasks from GitHub Issue through implementation and PR creation.  
**Depends on:** M3-M5 core providers.  
**Must not change:** no automatic merge required.  
**Tests:** synthetic/fake provider E2E plus controlled repository integration.  
**Risk:** High.  
**Confidence:** Medium.  
**Effort:** L.  
**Readiness:** BLOCKED.

### C61 — Verification/review/CI repair loop

**Outcome:** fresh evidence + independent review + CI observer gates; bounded repair Task on failure.  
**Depends on:** C53, C52, reasoning/review providers, C31/C33.  
**Tests:** mutation after pass, CI old head, review rejection -> repair -> reverification.  
**Risk:** Critical to product thesis.  
**Confidence:** Medium-High.  
**Effort:** L.  
**Readiness:** BLOCKED.

### C62 — M6 end-to-end acceptance

**Outcome:** one real controlled GitHub Issue reaches a verified PR under production-shaped policies.  
**Depends on:** C60-C61.  
**Acceptance evidence:** Issue input, task graph, worker routes, diff, local verification, independent review, PR, hosted CI, repair if triggered, final current evidence.  
**Risk:** High.  
**Confidence:** blocked.  
**Effort:** M.  
**Readiness:** BLOCKED.

## M7-M9 cards

### C70 — Run Detail product surface

**Outcome:** Studio answers goal/tasks/workers/models/providers/permissions/blockers/evidence/changes/cost/intervention from Runtime contracts.  
**Depends on:** stable M3/M4 event/data contracts and M6 usage evidence.  
**Readiness:** BLOCKED.

### C71 — Fable Studio pinned DSH distribution

**Outcome:** branded/signed installable Studio distribution with exact DSH baseline.  
**Depends on:** C50, C70.  
**Readiness:** BLOCKED.

### C72 — Packaged cross-platform smoke/update matrix

**Outcome:** macOS/Windows/Linux supported release targets prove launch/runtime/plugin/upgrade/recovery.  
**Depends on:** C71.  
**Readiness:** BLOCKED.

### C80-C82 — External provider marketplace/security

**Outcome:** review-first install, isolation, integrity/publisher/permission/update/revocation controls.  
**Depends on:** production Wave-1 Provider ABI evidence and Studio packaging.  
**Readiness:** NEEDS RESEARCH after M7; intentionally not pulled forward.

### C90-C92 — Evaluation-driven routing

**Outcome:** measured route quality and controlled promotion of provider/model preferences.  
**Depends on:** enough M6/M7 Run telemetry/evaluation corpus.  
**Readiness:** BLOCKED by real usage evidence.

## Parallelism rules

Safe parallel examples:

- C30 Run Store, C31 state machines and C32 artifact registry after ABI interfaces are frozen, with one integration owner.
- C52 GitHub and C53 Riqor provider adapters after C21, because they own separate provider modules and external contracts.
- C54/C55 machine-interface archaeology may occur read-only while C20/C21 are implemented.

Unsafe/artificial parallelism:

- multiple workers editing the Provider ABI core simultaneously;
- C40 Broker and C42 policy independently defining permission semantics;
- M6 orchestration before provider/recovery contracts are stable;
- Studio UI defining a competing Task/Worker model before M3.

## Recommended implementation sequence

Next implementation session should start with **C10 only**. Do not begin production Provider ABI or Runtime kernel implementation until C11 records the M1 verdict and Host Adapter constraints.
