# Fable Capability, Task, and Worker Model

**Status:** Proposed M0 normative model  
**Date:** 2026-09-11  
**Related:** Agency Runtime RFC, Provider ABI v1, Authority Matrix

## Scope

This document is the normative M0 definition for Task readiness, Worker lifecycle, capability resolution, typed handoff, concurrency and scheduling. It intentionally does not define DSH Agent or Cordis lifecycle types.

## 1. Task contract

```ts
interface FableTaskV1 {
  taskId: string
  runId: string
  revision: number
  title: string
  objective: string
  dependsOn: string[]
  requiredCapabilities: CapabilityRequirementV1[]
  mutationScope: MutationScopeV1
  acceptanceCriteria: AcceptanceCriterionV1[]
  evidenceRequirements: EvidenceRequirementV1[]
  inputArtifacts: string[]
  outputArtifacts: string[]
  status: TaskStatusV1
  attempt: number
  workerId?: string
  blocker?: TaskBlockerV1
}
```

Task status:

```text
created
pending
ready
running
waiting
blocked
verifying
reviewing
completed
failed
cancelled
```

### Task transition rules

```text
created -> pending
pending -> ready | blocked | cancelled
ready -> running | blocked | cancelled
running -> waiting | verifying | blocked | failed | cancelled
waiting -> running | blocked | cancelled
verifying -> reviewing | running(repair attempt) | blocked | failed | cancelled
reviewing -> completed | running(repair attempt) | blocked | failed | cancelled
blocked -> pending | cancelled | failed
```

`completed` is terminal for one Task attempt. A later Run repair creates a new Task or new bounded attempt with explicit lineage; it does not silently reopen a completed historical attempt.

A Task cannot become `ready` unless:

- all non-optional dependencies are completed;
- required capabilities have at least one eligible provider candidate;
- required approvals already exist or can be requested without violating policy;
- budget remains;
- mutation-scope scheduling does not conflict with active Tasks;
- active external authority such as a Dokion Playbook remains valid where applicable.

## 2. Worker contract

```ts
interface FableWorkerV1 {
  workerId: string
  runId: string
  taskId: string
  revision: number
  role: string
  objective: string
  scope: ScopeRuleV1[]
  prohibitedScope: ScopeRuleV1[]
  modelRequirement?: CapabilityRequirementV1
  resolvedModel?: ProviderRouteRefV1
  requiredCapabilities: CapabilityRequirementV1[]
  resolvedProviders: ProviderRouteRefV1[]
  contextRefs: ContextRefV1[]
  permissionGrants: EffectivePermissionGrantV1[]
  budget: WorkerBudgetV1
  timeoutMs?: number
  expectedOutputSchema: string
  acceptanceCriteria: AcceptanceCriterionV1[]
  evidenceRequirements: EvidenceRequirementV1[]
  retryPolicy: RetryPolicyV1
  status: WorkerStatusV1
  hostBinding?: HostBindingRefV1
  attempt: number
}
```

Worker status:

```text
created
pending
ready
running
waiting
blocked
verifying
completed
failed
cancelled
reconciling
```

### Worker lifecycle

```text
[*] -> created
created -> pending
pending -> ready
pending -> blocked
ready -> running
running -> waiting
waiting -> running
running -> verifying
verifying -> completed
verifying -> failed
running -> blocked
running -> failed
running -> cancelled
waiting -> cancelled
blocked -> pending
blocked -> cancelled

restart/crash:
running -> reconciling
waiting -> reconciling
verifying -> reconciling
reconciling -> pending | waiting | blocked | completed | failed | cancelled
```

Only Fable Runtime commits Worker lifecycle transitions. Providers report outcomes/events; they do not mutate Worker state directly.

## 3. Worker vs Agent

An Agent is a configured reasoning actor. A Worker is the bounded execution instance that owns one Task attempt.

Possible bindings:

```text
Worker -> DSH Agent + Session
Worker -> remote agent provider job
Worker -> deterministic CLI/provider invocation only
Worker -> no model at all
```

Therefore Worker IDs, states and retry semantics are Fable-owned even when the Host Adapter uses DSH `AgentFactory` internally.

## 4. Worker context

Workers receive bounded references rather than the entire Run history.

Context classes:

```text
goal summary
Task objective and constraints
accepted architecture/policy refs
input Artifact refs
repository snapshot/commit ref
relevant project memory refs
required evidence contract
provider/capability contracts
prior attempt failure summary when retrying
```

Hidden chain-of-thought, unrelated Session history, all installed provider manifests, and full evidence traces are not default context.

## 5. Typed artifacts

Cross-worker handoff uses typed artifacts.

Example:

```json
{
  "artifactId": "art_issue_analysis_01",
  "schemaId": "fable.issue-analysis.v1",
  "mediaType": "application/json",
  "producer": {
    "taskId": "task_issue_analysis",
    "workerId": "worker_analyst",
    "providerId": "model-route-a"
  },
  "contentRef": "fable-artifact://sha256/...",
  "digest": "sha256:...",
  "summary": "Issue intent, affected area, risks and acceptance facts"
}
```

A dependent Worker consumes the schema it declares. Schema mismatch blocks the Task before model execution.

## 6. Capability requirement

```ts
interface CapabilityRequirementV1 {
  capability: string
  required: boolean
  constraints?: {
    trust?: string[]
    permissionCeiling?: string[]
    sideEffectCeiling?: string
    platform?: string[]
    privacy?: string[]
    maxCost?: number
    maxLatencyMs?: number
    host?: string[]
    providerAllowlist?: string[]
    providerDenylist?: string[]
  }
}
```

Requirements describe the outcome. Provider preference is a constraint/policy input, not a different capability name.

## 7. Resolver stages

### Stage 1: capability/version

Candidate must implement the exact requested capability major.

### Stage 2: compatibility/health

Reject incompatible Runtime/ABI/Host Adapter/platform versions and unavailable providers.

### Stage 3: trust and permissions

Reject candidates whose execution trust, requested permissions or side-effect class exceed effective policy.

### Stage 4: active authority

If an active Dokion contract or other explicit execution authority constrains the operation, reject candidates not allowed by it.

### Stage 5: policy preference

Apply privacy, user/workspace preferences, data locality, cost/latency ceilings and evidence requirements.

### Stage 6: deterministic rank

Rank admissible candidates using configured weights only:

```text
explicit priority
trust tier
health
measured success by task class
evidence quality
privacy fit
cost
latency
user preference
```

### Stage 7: optional model recommendation

A model may choose/recommend among the already admissible set. The recommendation includes bounded reasons. It cannot bypass any earlier rejection.

### Stage 8: route commit

Persist:

```text
capability
eligible provider IDs
rejected provider IDs + machine reason
selected provider/version
policy decision ref
ranking inputs
model recommendation ref if used
timestamp
```

Do not persist hidden reasoning.

## 8. Model routing

A Worker can declare:

```text
required: reasoning.code.v1
constraints:
  privacy: [local-or-approved-cloud]
  maxCost: ...
  toolSupport: required
  contextClass: large
```

The broker selects a Model Provider route that advertises the workload. Different Tasks may select different routes. The Worker contract records `resolvedModel` so Studio can show which model served each Task.

## 9. Scheduler

V1 is a deterministic local scheduler.

Scheduling order:

1. refresh blockers whose external condition may have changed;
2. compute dependency-ready Tasks;
3. evaluate approval/policy/capability eligibility;
4. evaluate mutation conflict/lease eligibility;
5. sort ready Tasks by Run priority, dependency critical path and stable creation order;
6. start within global/provider concurrency limits;
7. persist Worker creation/start before invoking provider;
8. react to provider events, evidence and external state changes;
9. schedule verification/review gates after mutation work;
10. complete Run only after every required terminal gate succeeds.

A model does not choose which Task is runnable. It may propose decomposition or recommend among equivalent admissible providers.

## 10. Concurrency and mutation ownership

Default v1 mutation policy:

> One Task may mutate a shared workspace at a time.

Read-only Tasks may run in parallel when provider/resource limits permit.

Parallel mutation requires one of:

- separate Git worktrees/sandboxes with explicit integration ownership; or
- proven disjoint mutation scopes and a policy that explicitly enables same-workspace concurrency.

Even disjoint file paths may be semantically coupled. The scheduler may serialize Tasks when they touch shared schemas, build configuration, generated artifacts, dependency locks, migrations or other known coupling surfaces.

### Mutation scope

```ts
interface MutationScopeV1 {
  mode: 'read-only' | 'shared-workspace' | 'isolated-worktree' | 'external-only'
  paths?: string[]
  semanticDomains?: string[]
}
```

Paths are scheduling hints and enforcement inputs. They are not proof of semantic independence.

## 11. Child Task proposals

A Worker may return:

```ts
interface TaskProposalV1 {
  title: string
  objective: string
  dependsOn: string[]
  requiredCapabilities: CapabilityRequirementV1[]
  mutationScope: MutationScopeV1
  acceptanceCriteria: AcceptanceCriterionV1[]
  evidenceRequirements: EvidenceRequirementV1[]
  rationale: string
}
```

Runtime validates:

- no cycles;
- IDs/refs belong to the same Run;
- proposed scope is within Worker authority;
- permissions do not widen existing policy without approval;
- budget/depth limits;
- no duplicate semantic Task already active/completed.

Only then is a new Task committed.

## 12. Retry model

Retries are explicit attempts.

A retry is allowed only when:

- Task policy permits it;
- attempt budget remains;
- the failure category is compatible with retry;
- non-idempotent side effects are reconciled first;
- provider health/policy still permits the route.

A retry should add evidence or change diagnosis/provider/context. Blind repetition with identical inputs after a deterministic failure is not progress.

## 13. Cancellation

Cancellation hierarchy:

```text
Run cancel
  -> cancel all non-terminal Tasks
     -> cancel active Workers
        -> abort provider invocation / Host Agent turn
```

The Runtime commits cancellation intent first. Provider acknowledgements arrive afterward.

If external side effects may already have occurred, the Worker transitions through `reconciling` or leaves a blocker/operation ref; cancellation does not fabricate rollback.

## 14. Deadlock and blocked Runs

A Run is deadlocked when:

- unfinished non-cancelled Tasks remain;
- no Task is running;
- no Task can become ready under current dependencies/policy/provider state;
- no known awaited external condition has a scheduled observer.

Runtime writes a blocker report listing each Task and one machine-readable reason:

```text
dependency-cycle
missing-capability
provider-unavailable
permission-denied
approval-required
budget-exhausted
mutation-conflict
external-state
invalid-authority
invalid-artifact
```

Dependency cycles are rejected at graph mutation time; a detected stored cycle is treated as state corruption and fails closed.

## 15. First vertical-slice responsibility map

| Responsibility | Recommended execution |
| --- | --- |
| Issue read | GitHub deterministic provider |
| Issue interpretation | reasoning Worker |
| repository discovery | deterministic filesystem/Git + optional reasoning Worker |
| plan | get-fable planning discipline + reasoning Worker |
| implementation | reasoning Worker with bounded filesystem/shell capabilities |
| tests/typecheck/build | deterministic providers |
| evidence freshness | Riqor or get-fable evidence provider |
| independent review | separate model/review provider |
| PR create | GitHub deterministic provider |
| CI observe | GitHub deterministic provider/background observer |
| repair | bounded reasoning Worker after evidence |
| merge | GitHub deterministic provider behind policy/approval |
| Issue close | GitHub deterministic provider after merged verification |

Multi-agent value comes from role/evidence separation, not maximizing Worker count.

## 16. State-machine test requirements

M3 tests must prove at least:

- invalid transitions are rejected;
- provider success cannot bypass verification/review states;
- dependency completion makes eligible Tasks ready deterministically;
- provider loss blocks rather than dropping the Task;
- cancellation wins over a late provider success result;
- restart converts active states to reconciliation;
- child Task cycle attempts fail;
- one shared-workspace mutator prevents a second from starting;
- isolated worktree mutators may run in parallel under policy;
- retry attempt history remains immutable and ordered;
- artifact schema mismatch blocks the consumer before invocation;
- a model-assisted resolver never sees hard-rejected candidates.
