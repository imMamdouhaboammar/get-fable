# Fable Authority and State Ownership

**Status:** Proposed M0 decision  
**Date:** 2026-09-11  
**Related RFC:** `docs/superpowers/specs/2026-09-11-fable-studio-agency-runtime-v1.md`

## Purpose

Fable coordinates systems that already own goals, sessions, evidence, memory, permissions and repository state. This document prevents **authority collision** by naming one source of truth for each load-bearing state object.

The governing rule is:

> Fable stores what it must coordinate. Providers store what they author. Stable references are preferred to copied provider or remote state.

A provider does not become an orchestration authority merely because it can execute an action.

## Authority Matrix

| State object | Owner / source of truth | Writers | Readers | Persistence | Invalidation / recovery |
| --- | --- | --- | --- | --- | --- |
| Fable Run | Fable Runtime | Runtime transaction layer | Studio, scheduler, providers through bounded views | Fable Run Store | reconcile after restart; monotonic revision |
| Fable Task DAG | Fable Runtime | Runtime scheduler/planner commit path | scheduler, Studio, Workers through task views | Fable Run Store | dependency/policy changes produce new revision |
| Worker lifecycle | Fable Runtime | Worker Manager | scheduler, Studio, evidence gates | Fable Run Store | running -> reconciling after crash/restart |
| Capability requirement | Fable Runtime Task | planner/runtime validation | Capability Broker | Fable Run Store | task revision |
| Provider resolution | Fable Runtime | Capability Broker | Worker Manager, Studio | Run route history | expires on provider health/compatibility/policy changes |
| Approval request/decision | Fable Runtime policy domain or explicit Approval Provider | Runtime + human decision adapter | scheduler/providers/Studio | Fable Run Store plus provider ref when external | exact-action binding; expiration/revocation invalidates |
| Artifact metadata | Fable Runtime | Worker/provider output commit path | dependent Workers, Studio | Fable Run Store | immutable metadata; payload may be GC'd by explicit retention policy |
| Artifact payload | producing provider or Fable artifact store | producer only | authorized consumers | provider store or Fable content store | content address/version controls identity |
| Evidence reference | Fable Runtime | evidence attachment path | gates, Studio, reviewers | Fable Run Store | freshness must be revalidated; copied metadata cannot freshen evidence |
| get-fable portable lifecycle state | get-fable | get-fable state transaction | standalone hosts and Fable get-fable adapter | `.fable/state.json` | mutation generation / workspace identity rules |
| DSH Session transcript | DSH | DSH Session append path | DSH Agent/host UI, Host Adapter | DSH SessionPersistence | host persistence/replay rules; not Fable Run authority |
| DSH live Agent | DSH AgentRegistry | DSH AgentFactory/registry lifecycle | Host Adapter | process-local binding + durable Session | live identity expires on disposal/restart |
| Cordis plugin lifecycle | Cordis | Cordis Fiber/registry | DSH/Fable Host Adapter internals | process lifecycle/config | reversible effect disposal; not product state |
| Model provider route/catalog | provider/host model registry | model provider configuration | Capability Broker / Host Adapter | provider/host config | health/config/model catalog refresh |
| Agent Kernel reviewed memory | Agent Kernel | Agent Kernel approved source/proposal workflow | Fable memory adapter/Workers | Agent Kernel source JSON/JSONL | Agent Kernel revision/source rules |
| Agent Kernel environment vault | Agent Kernel | Agent Kernel vault workflow | explicitly authorized adapters | Agent Kernel vault | provider revision/conflict rules |
| Riqor verification freshness | Riqor | Riqor runtime/hooks | Fable evidence adapter/gates | Riqor repository-scoped state | later mutation invalidates prior completion evidence |
| Riqor evidence trace | Riqor | Riqor run/trace path | Fable through stable ref | Riqor state | provider-owned ordering/freshness |
| Dokion active execution contract | Dokion active Playbook | user-authorized Dokion workflow | Fable policy adapter | `.dokion/playbook.json` | authority must be revalidated before resume |
| Dokion execution state/evidence | Dokion | Dokion runtime | Fable through adapter/ref | Dokion-owned state/evidence | Dokion repository-identity/verification rules |
| GitHub Issue | GitHub | authorized GitHub actors/providers | Fable GitHub provider, Studio | GitHub | remote re-read is authoritative |
| GitHub branch/commit/PR/review/CI | GitHub/Git repository | authorized Git/GitHub actions | Runtime/provider/Studio | Git + GitHub | commit SHA/status checks; remote re-read |
| Studio presentation state | Fable Studio | Studio | Studio | application settings/cache | may be rebuilt from Runtime state |
| Credentials/secrets | credential provider | user/provider authorization flows | operation-scoped consumers | credential provider | never copied into Run records; re-resolve per operation where supported |

## Fable Runtime ownership

### DECIDED

Fable Runtime is the only authority for the **agency coordination plane**:

```text
Run
Task DAG
Worker lifecycle
scheduler readiness
capability requirements
provider resolutions
runtime policy decisions
approval requests
artifact references
evidence references
route history
cost/usage summaries
recovery/reconciliation state
```

Workers may propose new Tasks or revised plans, but only the Runtime transaction path may commit Task DAG changes.

No provider is permitted to silently add a dependency, widen a permission, mark a Run complete, or replace another provider's authority.

## get-fable ownership

### MEASURED

Current `get-fable` owns a portable coding lifecycle with deterministic skill routing, compact prompt compilation, mutation-aware local state and evidence gates.

### DECIDED

That portable responsibility remains valuable and must not be overwritten by Fable Studio state.

Inside Fable Runtime, get-fable can expose capabilities such as:

```text
workflow.discover.v1
reasoning.plan_structure.v1
workflow.route.v1
verification.local_freshness.v1
prompt.compile_guidance.v1
```

The exact names belong to the Provider ABI catalog. `.fable/state.json` remains get-fable-owned when that portable lifecycle is active. Fable Run state records only the relevant provider references/results needed for coordination.

## DSH ownership

### MEASURED

DSH owns host-level Agent/Session/LLM/Tool/UI primitives. It has per-session live Agent ownership, durable Session log abstractions, model adapter routing, approval/sandbox/credential seams and desktop/browser-client infrastructure.

### DECIDED

DSH Session does **not** become the Fable Run.

Reasoning:

- one Run can contain multiple isolated model Workers;
- deterministic Tasks may have no Agent/Session;
- external providers own state outside DSH;
- GitHub/Riqor/Dokion truth must not be serialized into chat history;
- Fable must survive a future host change.

A Fable Worker may have a `hostBinding` that references a DSH Session/Agent binding. That binding is an implementation detail of the Host Adapter.

## Cordis ownership

### MEASURED

Cordis owns plugin/service lifecycle, Context composition, Fiber activation/disposal, event dispatch and reversible effects.

### DECIDED

Cordis owns no Fable product state. Fable public contracts do not expose Cordis Context/Fiber types.

## Agent Kernel ownership

### MEASURED

Agent Kernel states that its reviewed local source is authoritative and generated agent files are adapters. ContextFS projects existing source records and does not replace them.

### DECIDED

Agent Kernel owns durable reviewed memory, repository conventions, architecture knowledge, failure lessons and environment-continuity state that it creates.

Fable may:

- query project memory under bounded budgets;
- record which context was used where the Agent Kernel API supports it;
- propose candidate durable knowledge;
- display references/status in Studio.

Fable must not auto-publish reviewed memory or mirror the entire Agent Kernel store into the Run Store.

## Riqor ownership

### MEASURED

Riqor tracks mutation-sensitive repository evidence and prevents completion while verification is pending.

### DECIDED

When a Run resolves Riqor for `verification.freshness`, Riqor's freshness decision is authoritative for the evidence it observes.

Fable stores:

```text
provider = riqor
providerEvidenceRef
subject/repository revision
normalized result
observedAt
```

It does not duplicate the complete event stream or reinterpret an old passing event as current.

## Dokion ownership

### MEASURED

Dokion states that `.dokion/playbook.json` is the sole execution authority for the active user-authored Playbook and that Dokion does not select replacement capabilities, widen permissions or reorder steps.

### DECIDED

When a Task is explicitly governed by an active Dokion Playbook:

- Dokion's declared order and permissions are hard constraints;
- Fable may schedule the playbook operation as a bounded Task but cannot reorder internal declared steps;
- Fable capability resolution cannot substitute an undeclared implementation where Dokion forbids it;
- Fable resumes only after Dokion authority/state is revalidated;
- Dokion evidence remains provider-owned and referenced.

For Runs not governed by Dokion, Fable's Runtime policy remains the execution authority.

## GitHub ownership

### DECIDED

GitHub and Git are authoritative for repository remote state. Fable stores IDs/URLs/SHAs plus bounded cached views for scheduling and UX.

Before a side effect that depends on remote state, the GitHub provider must read current remote truth when staleness could change the decision. Examples:

- Issue still open and not duplicated;
- branch base SHA;
- PR head SHA;
- CI status;
- review status;
- mergeability;
- Issue closure state.

## Credentials

### DECIDED

Run state never stores raw credentials, API keys, cookies or tokens.

It stores credential/provider references only. A provider resolves secrets as close as possible to the operation. DSH's credential seam is a valid host implementation because it separates safe `describe()` information from secret-bearing `resolve()` and re-resolves per operation.

## Approval authority

Approval has two layers:

1. **Fable Runtime approval:** authorizes one Fable action/permission boundary in the agency graph.
2. **Host/provider approval:** may be required by a specific provider or host executor.

Both may be required. A Runtime approval cannot force a provider to ignore its own stricter policy, and a provider-local approval cannot widen Fable Runtime policy.

DSH in-process continuable subagents currently pin child approvals to `never`; therefore a privileged Fable Worker must not rely on child-agent interactive approval. The Worker should request a typed capability action, and the Runtime/Host Adapter executes that action only after Fable policy/approval permits it.

## State transition transaction rule

Every Fable-owned state transition must:

1. load current Run revision;
2. validate expected revision and invariants;
3. validate authority and referenced objects;
4. append the domain event(s);
5. update materialized Run/Task/Worker state atomically;
6. expose the new revision only after persistence succeeds;
7. emit UI/observer events after the authoritative commit.

Observer failure cannot roll back an already committed authoritative state transition.

## Recovery rule

A process crash creates uncertainty, not success.

On restart:

- any Worker previously marked `running` becomes `reconciling`;
- external side effects are re-read from their authority before retry;
- DSH host Sessions are reattached only when session identity/ownership is valid;
- provider idempotency keys or stable operation IDs are reused where supported;
- non-idempotent unknown outcomes become blockers requiring provider reconciliation or human decision;
- completion evidence is revalidated against current repository state.

## Versioning and invalidation

Fable-owned objects use explicit schema versions and monotonic revisions.

Provider references include enough identity to detect incompatible upgrades. A provider version change does not automatically invalidate all old artifacts/evidence; each provider/adapter defines compatibility rules. Security-sensitive or completion-sensitive state defaults to conservative invalidation when compatibility cannot be proven.

## Prohibited duplication

The following designs are explicitly rejected:

- copying DSH Session transcript into Fable Run events;
- copying Agent Kernel memory into each Run as a new source of truth;
- converting Riqor's trace into an independent Fable freshness machine;
- duplicating `.dokion/playbook.json` and then executing the copy after the authority changes;
- treating cached GitHub Issue/PR JSON as authoritative after a remote transition could have occurred;
- persisting raw secrets to make provider recovery easier.

## Acceptance checks

This ownership model is satisfied when implementation tests can prove:

- only Fable transaction code commits Task/Worker state;
- a provider cannot mark a Run complete directly;
- a later Riqor-observed mutation invalidates a completion path until fresh evidence exists;
- a changed Dokion authority blocks resume until revalidated;
- a changed GitHub PR head is detected before merge;
- a Runtime restart reconciles `running` Workers rather than calling them complete;
- credential values never appear in serialized Run fixtures;
- DSH host state can be replaced by a fake Host Adapter in Runtime contract tests.
