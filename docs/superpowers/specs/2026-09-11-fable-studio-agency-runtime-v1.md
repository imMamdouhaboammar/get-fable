# RFC: Fable Studio + Fable Agency Runtime v1

**Status:** Proposed architecture baseline for M0  
**Date:** 2026-09-11  
**Scope:** Product model, runtime ownership, host strategy, first vertical slice, milestone dependencies, and implementation constraints  
**Supersedes:** No existing accepted ADR. This RFC extends the portable-process direction in `docs/ADR-001-fable-supersystem.md` without deleting or rewriting that historical decision.

## 1. Executive summary

Fable should evolve from a portable coding lifecycle into a **Coding Agency Runtime** without turning `get-fable` into another monolithic coding agent.

The recommended v1 composition is:

```text
Fable Studio
    |
    v
Fable Agency Runtime                <- Fable-owned product semantics
    |
    +-- Run / Task / Worker state
    +-- Scheduler
    +-- Capability Broker
    +-- Policy + Approval Gates
    +-- Evidence references
    +-- Route history / cost / observability
    |
    v
Fable Provider ABI                  <- public compatibility boundary
    |
    v
Host Adapter(s)                     <- private compatibility layer
    |
    +-- DeepSeek Harness
    |      +-- Agent / Session / LLM / Tool / UI services
    |      `-- Cordis plugin lifecycle / services / events
    +-- MCP
    +-- CLI / SDK / HTTP
    `-- Remote providers
```

For the first implementation line, Fable Studio should be a **Fable distribution built from a pinned, compatibility-tested DeepSeek Harness desktop baseline**, not a deep fork. Fable Runtime should use DSH as a host substrate through a Fable-owned adapter. Cordis remains a transitive lifecycle/DI substrate and never becomes part of Fable's public product vocabulary.

`get-fable` remains portable. Its deterministic discovery/planning/routing/evidence discipline can be consumed by Fable Runtime as a provider/library, while the full Agency Run, Task DAG, Worker lifecycle, capability routing, approvals, and cross-provider coordination remain Fable Runtime state.

The first complete vertical slice is:

> Give Fable a GitHub Issue and allow the Runtime to take it from analysis to a verified Pull Request, with merge and Issue closure only when explicit policy permits them.

## 2. Product thesis

Fable is not a single autonomous coding agent. A coding agent is one configured reasoning actor. Fable coordinates multiple model-backed workers, deterministic capabilities, repositories, reviewers, evidence authorities, workflows, and human approval boundaries around a larger engineering outcome.

A useful public hierarchy is:

```text
Fable
├── Fable Studio
│   └── installable daily-working application
├── Fable Runtime
│   └── coding-agency orchestration runtime
├── get-fable
│   └── portable lifecycle, discovery, planning, routing, verification and host adapters
└── Fable Provider SDK
    └── provider contracts, schemas, adapters and conformance tests
```

## 3. Problem statement

The current `get-fable` repository already provides deterministic task routing, canonical skills, mutation-aware verification, host hooks, compact prompt compilation, CLI operations, and several host adapters. It does not own a durable multi-worker agency Run, a task scheduler, provider resolution, typed cross-worker artifacts, a generalized approval model, or a desktop product contract.

DeepSeek Harness supplies a rich agent host, session persistence, LLM adapters, tools, approvals, credentials, browser/desktop composition, and plugin lifecycle. Its public contracts, however, are host contracts. Making Fable's public architecture equal to DSH's Agent, Session, Tool, or Cordis Context contracts would create avoidable upstream coupling and would also confuse host state with agency state.

Several first-party repositories additionally own durable domains that Fable must not duplicate: Agent Kernel owns reviewed project memory and architecture rules; Riqor owns evidence freshness and run proof; Dokion owns the active user-authored execution contract when a Playbook is active; GitHub owns remote repository truth.

## 4. Goals

1. Define a host-independent agency model for Run, Task, Worker, Provider, Capability, Artifact, EvidenceRef, Approval, and PolicyDecision.
2. Preserve `get-fable` as a portable product rather than making it dependent on Fable Studio.
3. Use DSH/Cordis where they provide mature host primitives without leaking their types into Fable's public ABI.
4. Treat LLMs as capability providers selected per task/worker rather than as the runtime itself.
5. Keep provider state authoritative at the provider when stable references are sufficient.
6. Make permissions, side effects, trust, evidence, cancellation, and recovery explicit runtime contracts.
7. Deliver a local-first Issue-to-verified-PR vertical slice before building a broad marketplace or distributed scheduler.
8. Make every completion claim traceable to current evidence rather than model confidence.

## 5. Non-goals

- Reimplement DSH's complete agent loop, model adapter ecosystem, desktop IPC stack, credential store, or plugin lifecycle in M0-M6.
- Adopt DSH experimental Agent Teams as Fable's public task model.
- Build a distributed scheduler in v1.
- Integrate every first-party repository because it exists.
- Make plugin code safe merely by placing it behind tool approvals.
- Add autonomous production deployment.
- Make merge automatic by default.
- Define a universal taxonomy for every possible AI capability in ABI v1.

## 6. Terminology

| Term | Definition |
| --- | --- |
| Model | inference/reasoning implementation exposed through a provider |
| Tool | callable deterministic or external capability |
| Skill | reusable behavioral guidance; not an execution authority by itself |
| Agent | configured reasoning actor definition |
| Worker | one bounded runtime instance assigned one Task |
| Provider | implementation of one or more Fable Capabilities |
| Plugin | installable package that may contain providers, UI, skills, or host extensions |
| Capability | vendor-neutral outcome contract resolved by the Runtime |
| Task | bounded work item with dependencies and acceptance evidence |
| Artifact | typed immutable handoff value or stable provider-owned reference |
| EvidenceRef | normalized reference to evidence owned by Fable or a provider |
| Run | one durable agency execution around one user goal |
| Agency | coordinated Workers and providers operating around one Run |
| Fable Runtime | supervisor, scheduler, capability broker, policy, state, evidence references |
| Fable Studio | installable user-facing application around Fable Runtime |

A Model is not automatically an Agent. An Agent is not automatically a process. A Skill is not a Tool. A Plugin is not automatically a Provider.

## 7. Current repository state

### [MEASURED] get-fable

At the M0 baseline, `get-fable` owns a portable local-first lifecycle:

```text
user task
  -> deterministic task router
  -> canonical skill registry
  -> selected skill contract
  -> compact prompt compiler / host adapter
  -> execution
  -> mutation-aware durable state
  -> typed evidence
  -> verification / review / security / release
```

Current state schema v3 records a workspace identity, coarse phase, current skill, mutation/verification generations, routing provenance, active card, and evidence. The source is `src/core/state.ts` and `src/core/types.ts`.

The current DSH integration is a host adapter and Web UI, not a complete agency runtime. Its API still contains legacy planning-file and compatibility logic that must not be promoted to Fable's future Run contract.

### [MEASURED] DeepSeek Harness

DSH is a Cordis-composed agent host. Relevant current primitives include:

- `AgentFactory` and `AgentRegistry` with per-session live Agent ownership;
- durable Session logs and pluggable persistence;
- provider-neutral LLM adapter routing;
- Tool registry and execution tokens;
- approval and sandbox seams;
- credential references and provider-owned values;
- continuable subagents with durable Sessions and process-local activations;
- Web client extension through the module loader;
- Electron desktop packaging and signed update flow;
- experimental Agent Teams with durable roster/mail/task snapshots.

DSH Agent Teams are explicitly experimental, and their `writeScopes` are advisory rather than locks. Fable must not use them as the canonical agency authority in v1.

### [MEASURED] Cordis

Cordis provides plugin Context, services, eventing, isolation/interception, Fibers, lifecycle states, and reversible effects. It is suitable low-level composition infrastructure and deliberately does not define Fable product semantics.

### [MEASURED] first-party ownership

- Agent Kernel's reviewed JSON/JSONL source remains authoritative for durable project memory/rules; ContextFS is a projection.
- Riqor owns repository-scoped mutation-sensitive evidence freshness and completion proof.
- Dokion declares `.dokion/playbook.json` the sole execution authority when an active user-authored Playbook is used.
- GitHub owns Issues, commits, PRs, reviews, CI and merge state.

## 8. Current limitations

1. No Fable-owned Run/Task/Worker state machine exists.
2. No host-independent Provider ABI exists.
3. Current DSH adapter types mirror legacy `get-fable` status rather than agency state.
4. Current DSH adapter code contains compatibility casts against fields no longer in state v3.
5. DSH Session state alone cannot represent non-LLM Tasks or cross-provider agency state.
6. DSH continuable subagents pin child approval policy to `never`; child-agent interactive approval cannot be assumed for privileged Worker actions.
7. DSH session `flush` participation is not, by itself, proof that every persistence backend durably stored the latest state.
8. Native DSH plugins execute third-party code with user-level permissions; tool approvals are not a plugin sandbox.
9. No Fable compatibility suite pins and validates a supported DSH host baseline.

## 9. Architecture overview

```text
User / Studio
    |
    v
+---------------------------+
| Fable Agency Runtime      |
|---------------------------|
| Run Store                 |
| Task DAG + Scheduler      |
| Worker Manager            |
| Capability Broker         |
| Policy / Approval Engine  |
| Artifact Registry         |
| Evidence Ref Registry     |
| Observability / Cost      |
+-------------+-------------+
              |
              v
+---------------------------+
| Fable Provider ABI        |
+-------------+-------------+
              |
       +------+---------------------------+
       | Host / Transport Adapters        |
       +------+---------------------------+
              |
   +----------+----------+---------+---------+
   |          |          |         |         |
  DSH        MCP        CLI       HTTP     SDK/Remote
   |
 Cordis
```

The Runtime owns coordination. Providers own their domain-specific state. Host adapters translate, but do not become the source of truth for Fable concepts.

## 10. Host substrate

**PROPOSED DECISION:** Use a pinned upstream DSH baseline as the initial host and desktop substrate through a Fable-owned Host Adapter. Build Fable Studio as a Fable distribution of that baseline rather than a deep fork.

Reasons:

- DSH already has mature Agent, Session, LLM, tool, credential, approval, sandbox, Web and desktop seams.
- Cordis gives reversible plugin lifecycle and service composition.
- DSH desktop already ships the matching runtime/client graph as one signed release unit.
- Fable differentiation is agency semantics, provider routing, evidence/policy coordination and Run UX, not reimplementing an agent host.
- A public Fable compatibility boundary preserves a later move away from DSH if needed.

The exact supported DSH commit/version becomes a tested compatibility input, not a public Fable semantic dependency.

## 11. Compatibility boundary

Fable public contracts MUST NOT contain:

- Cordis `Context`, `Fiber`, service registry or effect types;
- DSH `Agent`, `AgentHandle`, Session event schemas, Tool registry internals, or experimental Team types;
- direct assumptions about DSH desktop IPC messages.

The private Host Adapter translates between Fable contracts and host primitives. Compatibility tests target that adapter.

## 12. Agency Runtime ownership

Fable Runtime owns:

- active Run identity and lifecycle;
- Task graph and dependency readiness;
- Worker descriptors and Worker lifecycle;
- scheduling and concurrency policy;
- capability requirements and resolutions;
- provider selection history;
- runtime policy decisions and approval requests;
- typed Artifact metadata and references;
- normalized EvidenceRefs and completion gates;
- Run event history, costs and user-visible blockers;
- recovery/reconciliation decisions.

It does not become the canonical store for provider-owned transcripts, long-term memory, GitHub objects, Riqor traces, Dokion playbooks, or secrets.

## 13. Run

A Run is one durable execution around one accepted user goal.

Minimum v1 fields:

```text
runId
schemaVersion
workspaceId
goal
sourceRef?
status
createdAt
updatedAt
policyProfile
taskGraphRevision
budget
costSummary
blockers[]
approvalRefs[]
routeHistory[]
evidenceRefs[]
```

Candidate lifecycle:

```text
created -> planning -> executing -> verifying -> review -> ready
   |          |           |            |          |
   +-------> blocked <-----+------------+----------+
   |                                             |
   +------------------------------------------> failed
                                                 |
ready -> completed                               |
  |                                              |
  +-> awaiting_approval -> completed / cancelled+
```

Run completion is a policy/evidence result, not an LLM response.

## 14. Task

A Task is scheduler-owned and bounded. Minimum fields:

```text
taskId
runId
title
objective
dependsOn[]
requiredCapabilities[]
mutationScope
acceptanceCriteria[]
evidenceRequirements[]
status
attempt
ownerWorkerId?
inputArtifacts[]
outputArtifacts[]
```

Tasks are considered ready only when every dependency is satisfied, required approvals/policies allow scheduling, capability resolution succeeds, and mutation-scope constraints do not conflict with active work.

Workers may propose child Tasks, but proposals are committed only by the Runtime after schema/policy/dependency validation. Workers do not directly rewrite the DAG.

## 15. Worker

A Worker is a runtime envelope, not merely a prompt.

```text
workerId
runId
taskId
role
objective
scope
prohibitedScope
modelRequirement?
resolvedModel?
requiredCapabilities[]
resolvedProviders[]
contextRefs[]
permissions
budget
timeout
dependencies[]
expectedOutputSchema
acceptanceCriteria[]
evidenceRequirements[]
retryPolicy
status
hostBinding?
```

A model-backed Worker MAY map to one DSH Agent + Session. A deterministic Task MAY have no Agent or Session. Therefore Run != Session and Worker != Agent at the public boundary.

## 16. Provider

A Provider is any implementation of one or more named Capabilities. Provider packages describe capabilities, permissions, trust, transport, compatibility and health. Invocation behavior is defined by the Provider ABI RFC.

Providers do not gain orchestration authority merely because they can execute actions.

## 17. Capability

Capabilities are named by outcomes rather than vendors. The first slice needs a bounded taxonomy, for example:

```text
reasoning.issue_analysis.v1
reasoning.planning.v1
reasoning.code.v1
reasoning.review.v1
repository.issue.read.v1
repository.change.read.v1
repository.change.write.v1
repository.pull_request.create.v1
repository.ci.observe.v1
repository.pull_request.merge.v1
tests.execute.v1
typecheck.execute.v1
build.execute.v1
review.independent.v1
verification.freshness.v1
memory.project.read.v1
memory.project.propose.v1
approval.request.v1
filesystem.read.v1
filesystem.write.v1
shell.execute.v1
```

Vendor aliases such as `use-riqor` or `use-gpt` are not capabilities.

## 18. Model Provider

Models are providers of reasoning/vision capabilities. Model registry metadata can include provider route, model ID, supported workloads, context limits, tools/multimodal support, privacy restrictions, price hints, latency hints, health, user preference and measured historical performance.

Different Workers in one Run may resolve different models. A Task that needs no reasoning model must not invoke one merely to preserve a uniform execution shape.

## 19. Scheduler

V1 is local and single-Runtime-process. It is not a distributed scheduler.

Initial rules:

1. Deterministic dependency readiness.
2. Configured global and per-provider concurrency bounds.
3. At most one shared-workspace mutation Task at a time by default.
4. Parallel mutation requires explicit disjoint mutation scopes plus an isolation strategy such as independent Git worktrees.
5. Semantic-conflict risk may force serialization even when path scopes differ.
6. Retry creates a new attempt with bounded budget and preserves prior evidence/failure history.
7. Cancellation propagates Run -> Task -> Worker -> provider/host AbortSignal.
8. A blocked Task records the exact blocker category: capability, approval, dependency, policy, conflict, provider health, budget or external state.
9. Deadlock is detected when no Task is running or schedulable and unfinished Tasks remain; the Run becomes blocked with a dependency/policy diagnostic.

## 20. Capability Broker

Resolution is staged:

```text
1. hard gates
   capability + version + host compatibility + provider health
   + trust + permissions + side-effect limits

2. policy filters
   user + workspace + Run + active Dokion contract where applicable

3. deterministic ranking
   explicit priority + evidence quality + privacy + cost + latency
   + historical success + user preference

4. optional model recommendation
   only among already-admissible candidates

5. runtime enforcement
   selected provider can never widen its own permissions
```

Provider hints are inputs, not policy authority.

## 21. Evidence

Fable stores normalized EvidenceRefs rather than copying complete provider-owned traces.

```text
evidenceRefId
providerId
type
subjectRef
repositoryRevision?
mutationGeneration?
providerEvidenceRef
observedAt
result
freshness
scope
metadata
```

Evidence classes for v1:

```text
test
build
typecheck
lint
runtime
security
review
ci
artifact
observation
receipt
approval
release
```

When Riqor supplies `verification.freshness`, Riqor remains the authority for freshness. Fable records the reference and normalized result needed for scheduling/completion. Fable must not manufacture a fresh result by copying old provider metadata.

## 22. Policy and permissions

Policy is enforced outside model output. Minimum domains:

- filesystem read/write scopes;
- shell execution and sandbox mode;
- network destinations;
- repository mutation;
- credentials and secret-bearing operations;
- package installation;
- remote side effects;
- PR creation and reviewer requests;
- merge and Issue closure;
- destructive or irreversible actions.

Model recommendations cannot bypass hard gates.

## 23. State ownership

The detailed Authority Matrix is maintained in `docs/architecture/authority-and-state-ownership.md`.

Core rule:

> Fable stores what it must coordinate; providers store what they author; stable references are preferred to duplicated remote/provider state.

## 24. Persistence

Fable Run persistence is independent of DSH Session persistence.

Logical contract:

- append durable Run-domain events before exposing a transition as committed;
- project current Run/Task/Worker state from those events;
- retain monotonic revisions for optimistic concurrency;
- write typed Artifact metadata separately from potentially large payloads;
- persist only credential references, never raw secrets;
- reconcile host/provider state after restart rather than assuming every in-flight action completed.

Initial local implementation target: a Fable-owned SQLite Run Store in application state storage, keyed by stable workspace identity. SQLite is a private storage choice, not an ABI. The schema is versioned and migration-tested.

## 25. Recovery

On Runtime restart:

1. Open and validate the Fable Run Store.
2. Mark previously `running` Workers as `reconciling`; never assume success.
3. Re-resolve referenced providers and health.
4. Ask Host Adapter/provider for recoverable execution state where supported.
5. Reattach resumable DSH Sessions only when identity and ownership match.
6. Re-query GitHub remote truth for Issue/PR/CI operations.
7. Re-query Riqor freshness when its evidence governs completion.
8. Revalidate active Dokion authority before continuing a Playbook-governed Task.
9. Produce an explicit blocker if authority or state cannot be established.
10. Resume scheduling only after reconciliation commits a new Run revision.

## 26. Human approvals

Approval is a Runtime domain object/provider capability, not an informal chat gesture.

```text
approvalId
runId
taskId?
requestedAction
requestedPermissions
reason
risk
requestingProvider
status
createdAt
decidedAt?
decisionActor?
expiresAt?
```

DSH approvals may be used by the Host Adapter for host-local actions, but Fable does not assume child/subagent approvals are available. Privileged side effects should pass through the Runtime capability/policy boundary where the approval decision can be bound to the exact action.

## 27. Security

The primary trust boundary is executable provider/plugin code, not only model tool calls.

Current DSH ecosystem guidance explicitly warns that installed plugins execute third-party code with the user's permissions and can access files, credentials and network; tool approvals do not sandbox plugin code.

Therefore v1 policy is:

- first-party audited host extensions may run in-process;
- external providers default to isolated/out-of-process transports where feasible;
- installation is review-first and permission-visible;
- package scripts and executable entry points are security-relevant;
- versions and integrity identities are pinned;
- permission escalation requires explicit policy/approval;
- corrupted or unverifiable state fails closed where it could authorize a side effect;
- secrets are resolved at operation time through a credential provider and are not persisted in Run state.

## 28. DSH / Cordis integration

The Host Adapter may use:

- DSH `AgentFactory` / `AgentRegistry` for model-backed Worker host bindings;
- DSH Session persistence for transcripts and model-visible history;
- DSH LLM adapters for host-native model invocation;
- DSH Tool/Approval/Sandbox/Credential services where policy permits;
- DSH Remote/UI extension seams for Studio surfaces;
- Cordis lifecycle/effects for plugin activation/disposal.

It must hide these types from Provider ABI consumers.

Experimental DSH Agent Teams are not a Fable dependency in v1. The M1 spike may compare them as an implementation reference only.

## 29. Desktop distribution

Fable Studio M7 should initially be a Fable-owned distribution of a pinned DSH Desktop baseline.

DSH Desktop currently ships Electron and the matching DSH runtime as one signed release unit. Fable therefore owns its own application release cadence and pins the DSH baseline per Fable Studio release. Compatibility is tested before upgrading the pin.

A deep fork is reserved for evidence that the required host extension cannot be maintained through supported seams.

## 30. Provider lifecycle

Conceptual lifecycle:

```text
Discover metadata
-> assess trust and requested permissions
-> resolve compatibility
-> user/policy approval if required
-> pin version + integrity
-> install or connect
-> health check
-> enable
-> invoke
-> monitor
-> disable/revoke
```

Installability does not imply activation authority.

## 31. Plugin discovery

Fable Marketplace work is deferred until M8. M0-M6 support explicitly configured first-party providers and reviewed local packages.

Discovery metadata may describe candidates but cannot grant execution authority, permissions, trust, or automatic installation.

## 32. First-party integrations

Wave 1 is limited to:

- get-fable: portable discovery/planning/lifecycle discipline;
- Agent Kernel: project memory/architecture knowledge;
- Riqor: evidence freshness/proof;
- Dokion: explicit user-authored execution contract where active;
- GitHub: Issue/PR/CI/merge remote truth;
- DSH: host Agent/Session/model/tool substrate.

Wave 2 repositories require a concrete capability gap before integration.

## 33. Observability

Run Detail needs first-class structured data, not scraped prompts.

Minimum observability events:

```text
run.created
run.status_changed
task.created
task.ready
task.blocked
worker.created
worker.started
worker.waiting
worker.completed
worker.failed
worker.cancelled
capability.resolved
provider.invoked
provider.failed
artifact.produced
evidence.attached
approval.requested
approval.decided
repository.changed
ci.observed
run.completed
```

Events include IDs, timestamps, bounded metadata and causal references. They exclude hidden chain-of-thought and secrets.

## 34. Evaluation strategy

Before a provider/router policy becomes preferred, evaluate it against reproducible scenarios and holdouts. Track success criteria such as:

- capability resolution correctness;
- policy-denial correctness;
- task completion evidence freshness;
- recovery after restart;
- cancellation latency/cleanup;
- false completion prevention;
- Issue-to-PR success rate;
- repair-loop effectiveness;
- cost/latency by task class.

Self-improvement may propose changes in M9; it cannot self-promote routing policy without evaluation and explicit promotion policy.

## 35. Compatibility

Provider ABI and Run schema are Fable versioned contracts.

Host Adapter compatibility is maintained separately through a matrix containing:

```text
Fable Runtime version
Fable Provider ABI version
DSH commit/version
Cordis version inherited by DSH
Studio version
provider versions tested
conformance result
known degradations
```

Upstream DSH changes do not automatically change Fable public semantics.

## 36. Migration from current get-fable

No destructive migration is required for M0-M2.

- `.fable/state.json` remains the portable get-fable lifecycle state.
- Current skills/CLI/hooks remain supported.
- Fable Runtime introduces a separate Run Store.
- A get-fable Provider Adapter can expose current routing/planning/verification capabilities to Fable Runtime.
- Existing DSH dashboard code is treated as a host integration to migrate, not as the source of the new Runtime data contract.
- Legacy adapter drift should continue to be fixed under existing DSH hardening Issues rather than duplicated in the agency-runtime backlog.

## 37. Release strategy

M0-M6 do not require a public Studio release.

- architecture docs and Provider ABI are versioned in repository;
- M1 pins an exact DSH baseline and records the spike verdict;
- Runtime/provider implementation lands behind explicit experimental flags until the vertical slice passes end-to-end acceptance;
- Studio distribution begins only after the Runtime host compatibility and security boundaries are proven;
- no automatic marketplace installation before M8.

## 38. First vertical slice

Target flow:

```text
GitHub Issue
  -> Run created
  -> Issue analysis Task
  -> repository discovery Task
  -> plan Task
  -> bounded implementation Worker
  -> deterministic tests/typecheck/build
  -> evidence freshness gate
  -> independent review Worker/provider
  -> PR create
  -> CI observe
  -> bounded repair loop if needed
  -> merge approval gate
  -> optional merge
  -> Issue closure
```

Not every box is an LLM Worker. GitHub reads/writes, test execution, evidence checks, CI observation and merge gates should be deterministic providers where possible.

## 39. Milestones

```text
M0 Architecture + Product RFC
│
├── Provider ABI direction
├── Authority/state model
├── Host strategy ADR
└── M1 executable spike plan
        │
        v
M1 DSH/Cordis feasibility spike
        │
        +---- host verdict / constraints
        v
M2 Provider ABI v1 + conformance harness
        │
        v
M3 Agency Runtime kernel
        ├── Run Store
        ├── Task DAG
        ├── Worker lifecycle
        └── Artifact model
        │
        v
M4 Capability Broker + Model Router + Policy
        │
        v
M5 Wave-1 provider adapters
        │
        v
M6 GitHub Issue -> verified PR vertical slice
        │
        v
M7 Fable Studio distribution
        │
        v
M8 Marketplace / external provider ecosystem
        │
        v
M9 Evaluation-driven routing + controlled self-improvement
```

M2 Provider ABI conformance work and M1 host spike planning can be prepared in parallel after M0, but ABI implementation must absorb M1 host constraints before being declared stable.

## 40. Risks

| Risk | Severity | Uncertainty | Mitigation |
| --- | --- | --- | --- |
| Fable semantics leak DSH internals | High | Medium | Provider ABI + private Host Adapter + compatibility tests |
| Plugin code bypasses tool-level policy | Critical | Low | trust tiers; first-party-only in-process v1; isolated transports for external providers |
| Duplicate authority across Fable/get-fable/Riqor/Dokion | High | Medium | formal Authority Matrix and reference-only integration |
| Worker approval model conflicts with DSH child approval behavior | High | Low | Runtime-owned approval/capability broker; privileged actions outside child approval path |
| Run and host Session recovery diverge | High | Medium | separate Fable Run Store + reconciliation state |
| Upstream DSH desktop changes break Studio | High | Medium | pinned baseline + compatibility matrix + M1/M7 smoke suites |
| Concurrent workers corrupt one checkout | High | Medium | serialize mutators by default; explicit leases/worktree isolation |
| Provider taxonomy becomes speculative platform design | Medium | Medium | v1 taxonomy limited to M6 requirements |
| Studio scope delays vertical slice | Medium | Low | Run Detail data contracts first; polished Studio after M6 |

## 41. Alternatives rejected

### Deep fork DSH now

Rejected for v1. It creates immediate maintenance/security/release ownership without evidence that supported seams are insufficient.

### Make get-fable itself the entire agency runtime

Rejected. It would collapse a useful portable lifecycle library into one desktop/host product and would mix current `.fable/state.json` semantics with a much larger Run/task/provider domain.

### Use DSH Session as the Fable Run

Rejected. Deterministic Tasks and external providers may have no Session; one Run may need multiple isolated model Sessions; provider-owned evidence and GitHub state should not be encoded as chat history.

### Use experimental DSH Agent Teams as the Fable Task DAG

Rejected for v1. The API is experimental and write scopes are advisory. It is useful reference material and may assist M1, but it cannot define Fable public semantics.

### Build a Fable-owned host from Cordis immediately

Deferred. Cordis is capable low-level infrastructure, but rebuilding DSH Agent/Session/LLM/Desktop capabilities before proving a limitation would spend M0-M6 on host work instead of agency value.

## 42. Open questions

### UNRESOLVED: exact Host Adapter surface after M1

**Evidence missing:** a running Fable spike on the pinned DSH desktop/headless host proving Worker creation, typed handoff, cancellation, restart and UI event delivery.  
**Why it matters:** determines whether existing DSH services are sufficient or one narrow upstream/host extension is required.  
**How to resolve:** execute `docs/spikes/dsh-cordis-feasibility.md`.  
**Owner:** M1 integration owner.  
**Blocking milestone:** M2 ABI stability and M3 host binding.

### UNRESOLVED: production-grade external provider isolation transport

**Evidence missing:** threat-modelled comparison of subprocess/MCP/HTTP/worker-process isolation under Fable Studio on macOS/Windows/Linux.  
**Why it matters:** external Marketplace providers must not inherit unrestricted in-process plugin trust by default.  
**How to resolve:** M7/M8 security spike after Wave-1 providers prove the ABI.  
**Owner:** Runtime Security.  
**Blocking milestone:** M8, not M1-M6.

### UNRESOLVED: concrete Studio shell customization scope

**Evidence missing:** product/UI validation of DSH Desktop surfaces against the M6 Run Detail contract.  
**Why it matters:** may determine whether Fable can remain a profile/distribution or needs a narrow UI fork.  
**How to resolve:** prototype Run Detail against M3 event/data contract before M7.  
**Owner:** Studio.  
**Blocking milestone:** M7.

## 43. Acceptance criteria

M0 architecture is acceptable when all are true:

- current get-fable ownership is documented from source;
- DSH and Cordis boundaries are documented from current source/contracts;
- public terminology is precise;
- get-fable vs Fable Runtime ownership is explicit;
- an Authority Matrix exists;
- host build-vs-fork decision is recorded in an ADR;
- Provider ABI direction is documented;
- Worker and Task lifecycle directions are explicit;
- evidence/reference direction is explicit;
- plugin trust model is explicit;
- first Issue-to-PR vertical slice is bounded;
- milestones form a dependency graph;
- M1 has an executable falsifiable spike plan;
- blocking unknowns are named with owners/milestones;
- no production runtime implementation is implied by this RFC.

## Evidence baseline used for this RFC

`get-fable` baseline inspected: default branch `master`, current 2026-09-11 head line beginning at commit `0d457e16...`.  
DSH source inspected at current repository state whose source URLs resolve around commit `c291e796...`.  
Cordis default branch `main` inspected for Context/Fiber lifecycle.  
First-party source inspected: Agent Kernel, Riqor and Dokion current default branches.

Important source paths include:

```text
get-fable/src/core/types.ts
get-fable/src/core/state.ts
get-fable/src/dsh/*
get-fable/docs/ARCHITECTURE.md

deepseek-harness/packages/core/agent/*
deepseek-harness/packages/core/agent-loop/*
deepseek-harness/docs/subsystems/subagent.md
deepseek-harness/docs/subsystems/agent-team.md
deepseek-harness/docs/subsystems/credentials.md
deepseek-harness/docs/subsystems/persistence.md
deepseek-harness/apps/desktop/*

cordis/packages/core/src/context.ts
cordis/packages/core/src/fiber.ts
```
