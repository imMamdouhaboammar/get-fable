# M1 Spike: DSH / Cordis Feasibility for Fable Agency Runtime

**Status:** Executable research plan; no production runtime code authorized by this document  
**Date:** 2026-09-11  
**Baseline verdict before execution:** `GO WITH CONSTRAINTS` is the architecture hypothesis, not the final M1 verdict.

## Purpose

Determine with executable evidence whether a pinned DeepSeek Harness + Cordis host can support Fable's Worker/Run needs behind a Fable-owned compatibility boundary.

The spike exists to falsify or confirm architecture. It is not the first production Runtime implementation.

## Allowed result labels

Every code artifact produced by M1 must be labeled in its file header/readme as one of:

```text
throwaway
prototype
candidate-for-production
```

Default is `throwaway`. Promotion to `candidate-for-production` requires a follow-up review after the spike verdict. No prototype becomes production architecture merely because it works.

## Questions the spike must answer

1. Can a Fable first-party plugin/service load reliably in the pinned DSH profile?
2. Can Fable create two isolated model-backed Worker host bindings through supported DSH Agent APIs?
3. Can each Worker receive a bounded objective/context rather than shared mutable prompt state?
4. Can Worker A produce output validated against a Fable-owned JSON schema?
5. Can Fable store that output as a typed Artifact and pass only the Artifact to Worker B?
6. Can Worker B review/consume it without receiving Worker A's full Session transcript?
7. Can Fable persist Run/Task/Worker state outside DSH Session persistence?
8. Can Run events be observed in a Web/Studio plugin surface without scraping chat text?
9. Can a running Worker be cancelled through the host and reach a deterministic Fable state?
10. Can a stopped/restarted host reconcile and resume supported Worker/Session state?
11. Which DSH persistence guarantees are contractual versus backend-dependent?
12. Can different Workers route to different model routes or a stub model route through a clean seam?
13. Can deterministic capabilities run without creating an Agent?
14. Can the Runtime keep privileged side effects outside child-agent approval assumptions?
15. Can host-specific types stay confined to one Host Adapter package/module?
16. Does any required capability force Fable public contracts to expose DSH/Cordis internals?
17. Can the spike run on the DSH headless/test host as well as expose events through Web client extension?
18. What breaks when a provider/host fails mid-transition?

## Known source constraints to test

### [MEASURED] Agent ownership

DSH `AgentFactory` creates Agents with a Session identity and returns a handle with disposal ownership. `AgentRegistry` tracks live agents by SessionId.

### [MEASURED] Continuable children

DSH subagent infrastructure supports durable child Sessions with process-local activations and cold resume behavior.

### [MEASURED] Approval constraint

Current continuable/in-process child-agent paths pin child approval policy to `never`. M1 therefore MUST NOT place its proof behind a privileged child tool requiring interactive approval.

### [MEASURED] Persistence caveat

A child/session flush participates in persistence but does not prove every persistence backend durably retained the state. M1 must distinguish “flush completed” from “recoverable after process restart”.

### [MEASURED] Agent Teams

Agent Teams are experimental. Their task `writeScopes` are advisory rather than locks. M1 may compare the API but must not use Team Task state as the Fable Run source of truth.

### [MEASURED] Plugin trust

Native DSH plugin implementation code runs with host user privileges. Tool approvals do not sandbox plugin code. M1 uses only first-party spike code and does not install arbitrary marketplace plugins.

## Pinned baseline

Before implementation, record exact:

```text
get-fable base commit
DSH commit
Cordis version/commit resolved by DSH lockfile
Bun version
Node version if any host component requires it
OS / architecture
DSH profile/bundle used
model adapter or deterministic fake adapter used
```

The spike report is invalid without this baseline.

## Spike architecture

```text
DSH/Cordis host
  |
  +-- FableSpikePlugin              [throwaway]
      |
      +-- FableHostAdapter          [throwaway]
      |     +-- createWorkerBinding()
      |     +-- cancelWorker()
      |     +-- resumeWorker()
      |     +-- subscribeHostEvents()
      |
      +-- SpikeRunStore             [throwaway]
      |     +-- Run
      |     +-- Task
      |     +-- Worker
      |     +-- Artifact
      |     +-- Event
      |
      +-- SpikeCoordinator          [throwaway]
      |
      `-- FableSpikeWebPanel        [throwaway]
```

No public Provider ABI package is implemented in M1. Use the M0 RFC types minimally to prove the boundary.

## Storage for the spike

Use the smallest durable store that can prove restart behavior. A simple versioned JSON/JSONL store is acceptable for M1 if it provides atomic transition writes and can be inspected easily.

Do NOT use M1 to implement the production SQLite Run Store. The production backend is an M3 concern after M1 proves host behavior.

Required persisted spike fields:

```text
runId
runStatus
tasks[]
workers[]
worker host session refs
artifacts[]
events[] or append log
revision
createdAt/updatedAt
```

No secrets, prompts or full Session transcript are stored in the spike Run Store.

## Worker scenario

### Task A: Analyst

Objective:

> Inspect a deterministic synthetic issue description and produce a structured analysis.

Expected output schema:

```json
{
  "type": "object",
  "required": ["summary", "risks", "acceptanceFacts"],
  "properties": {
    "summary": {"type": "string"},
    "risks": {"type": "array", "items": {"type": "string"}},
    "acceptanceFacts": {"type": "array", "items": {"type": "string"}}
  },
  "additionalProperties": false
}
```

No filesystem mutation or external network side effect is required.

### Artifact handoff

Coordinator validates Task A output and writes:

```text
artifactId
schemaId = fable-spike.issue-analysis.v1
producer Worker A
content digest
content ref
createdAt
```

### Task B: Reviewer

Objective:

> Review only the typed Task A artifact against a deterministic policy and return an approval result.

Expected output:

```json
{
  "type": "object",
  "required": ["approved", "notes"],
  "properties": {
    "approved": {"type": "boolean"},
    "notes": {"type": "array", "items": {"type": "string"}}
  },
  "additionalProperties": false
}
```

Worker B context must not include Worker A's full Session transcript. Test this structurally through the request/context assembly path, not by assuming prompts are isolated.

## Deterministic capability scenario

Add one non-agent Task between or after the model Workers:

```text
capability: artifact.digest.verify
implementation: local deterministic function
```

This proves the coordinator does not require every Task to own a DSH Agent/Session.

## Model routing seam

Preferred proof order:

1. Use a deterministic fake/replay LLM adapter in automated tests so the spike is reproducible.
2. Configure Worker A and Worker B with two distinct route identifiers, even if backed by the same fake implementation.
3. Optionally run one live model smoke test after deterministic tests pass.

Success means Fable Worker state chooses a Fable route input and the Host Adapter resolves it to DSH model/provider configuration without leaking the DSH adapter instance into Run state.

## Cancellation experiment

1. Start a scripted long-running Worker invocation.
2. Commit Fable Worker `running` state.
3. Request cancellation through Fable coordinator.
4. Commit cancellation intent.
5. Abort/cancel through Host Adapter.
6. Observe DSH Agent/turn settlement/disposal behavior.
7. Verify late completion cannot overwrite Fable `cancelled` state.
8. Verify resources/listeners are disposed.

Capture:

```text
cancel requested timestamp
host cancellation observation
final host state
final Fable state
session resumability state
cleanup result
```

## Restart/recovery experiment

Execute two scenarios.

### Scenario R1: idle persisted child

- complete Worker A;
- persist artifact and Worker B pending;
- stop host cleanly;
- restart host;
- reload Fable Run Store;
- create/resume Worker B from its intended Session state;
- complete Run.

### Scenario R2: process stops with Worker active

- start scripted Worker B;
- ensure Fable says `running`;
- terminate/restart the spike host in the controlled test harness;
- reload Run Store;
- transition Worker to `reconciling`, not `completed`;
- inspect DSH Session persistence;
- either reattach/resume safely or produce an explicit blocker;
- record exact supported behavior.

M1 does not need transparent recovery for every possible provider. It must prove the boundary can represent supported recovery and uncertainty honestly.

## UI observability experiment

Create one minimal Web client extension panel that reads Fable spike events/status through an explicit host/remote service.

Panel must show at least:

```text
Run id + status
Task A/B status
Worker host Session refs (safe display form)
selected model route per Worker
latest event type
Artifact handoff identity
cancel/recovery status
```

The panel must not parse assistant messages to infer Worker state.

## Typed event contract for the spike

Minimum event set:

```text
run.created
task.created
worker.created
worker.started
worker.completed
worker.cancel_requested
worker.cancelled
worker.reconciling
artifact.produced
artifact.consumed
run.completed
run.blocked
```

Events use stable IDs, timestamp, revision and causal refs. No chain-of-thought.

## Test plan

### Unit / contract

- Run Store revision conflicts;
- Worker transition table;
- artifact schema validation;
- Host Adapter fake implementation;
- event serialization;
- late result after cancel rejected.

### DSH host integration

- plugin activates and disposes cleanly;
- create two Worker Agent bindings;
- Session IDs are distinct;
- Worker A output schema validated;
- Worker B request/context lacks A transcript;
- fake model routes can differ;
- cancellation propagates;
- cold restart scenario executed;
- provider/Session failure becomes explicit Fable blocker/failure.

### Web integration

- panel loads through current module loader/remote seam;
- state updates without polling chat text;
- cancellation/recovery event rendered;
- plugin unload removes subscriptions.

### Cross-platform minimum

M1 architecture verdict may be made on one primary development OS only if the host APIs are platform-neutral and the report marks cross-platform execution **unproven**. M7, not M1, owns packaged desktop cross-platform acceptance.

## Commands / evidence to capture

The exact commands depend on DSH workspace scripts at the pinned commit. The implementation agent must record actual commands from package manifests instead of inventing them.

Evidence bundle must include:

```text
baseline versions/SHAs
focused unit results
host integration results
restart scenario transcript/log refs
cancellation trace
Run Store before/after snapshots
UI screenshot or deterministic UI test result
known host warnings/errors
final compatibility table
```

No evidence claim may rely only on source inspection if the spike behavior can be executed.

## Security constraints

- use no production repository secrets;
- use synthetic issue/artifact data;
- use fake/replay model adapter for required CI proof;
- no arbitrary marketplace plugin installation;
- no repository mutation beyond the isolated spike workspace;
- no merge/push/remote side effect;
- no child Agent privileged approval dependency;
- bind local Web/host services according to DSH's existing local security model.

## Success criteria

M1 is successful as an investigation when it produces an evidence-backed verdict, including a negative verdict.

### GO

Existing supported DSH/Cordis seams satisfy all required Worker/Run host behaviors without patching upstream internals.

### GO WITH CONSTRAINTS

Existing seams work if Fable adopts documented constraints that do not violate product requirements, such as Runtime-owned approvals and separate Run persistence.

### REQUIRES HOST EXTENSION

One or more needs require a narrow supported extension/plugin service that can remain isolated behind Host Adapter and does not require maintaining a fork.

### REQUIRES THIN FORK

A bounded but upstream-internal change is required and cannot be delivered through supported extension seams. The report must name exact files/contracts and estimated rebase burden.

### NO-GO

Core requirements such as isolated Worker ownership, reliable cancellation, durable/reconcilable session behavior, event observation or host extension cannot be achieved without making Fable public semantics dependent on unstable internals or taking unacceptable security/maintenance risk.

## Falsifiers

Any of the following prevents `GO`:

- Worker A/B cannot have isolated model-facing Sessions/context;
- Fable cannot receive structured output without relying on transcript scraping;
- cancellation has no reliable host signal/cleanup path;
- recovery cannot distinguish unknown from successful state;
- UI integration requires parsing chat text or unsupported DOM patching;
- model route selection requires public Fable types to import DSH adapter types;
- host plugin/service lifecycle cannot cleanly dispose;
- required privileged action can only be achieved by bypassing policy/approval.

## Deliverables

M1 implementation session must produce:

```text
spike source under an explicitly experimental path
spike README with artifact classification
compatibility matrix
measured result table
known constraints
final verdict
ADR 0002 verification update
Host Adapter interface proposal informed by execution
issues/work cards for any required host extension
```

## Handoff

If verdict is `GO` or `GO WITH CONSTRAINTS`, proceed to Provider ABI conformance implementation and M3 Runtime interfaces.

If `REQUIRES HOST EXTENSION`, create the smallest host-extension Issue and keep ABI work independent where possible.

If `REQUIRES THIN FORK`, pause M7 Studio distribution work and create a fork-maintenance ADR with measured diff/rebase ownership.

If `NO-GO`, revisit ADR 0002 and evaluate a Fable-owned host using selected Cordis components versus another host substrate.
