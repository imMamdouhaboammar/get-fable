# Fable Runtime M1 DSH / Cordis Spike Implementation Plan

> **Required discipline:** execute as an isolated experimental branch/worktree. Use TDD for spike contracts. Do not promote spike code to production during this plan.

**Goal:** produce measured evidence for whether pinned DSH/Cordis can host Fable Workers behind a Fable-owned Host Adapter without making DSH/Cordis public Fable semantics.

**Primary spec:** `docs/spikes/dsh-cordis-feasibility.md`

## Global constraints

- No production Runtime implementation.
- No arbitrary marketplace plugin installation.
- No production repository credentials.
- Required automated model behavior uses deterministic fake/replay adapter.
- No remote repository mutation/merge/push.
- Spike source is labelled `throwaway` unless a later decision promotes it.
- Fable Run state is stored separately from DSH Session persistence.
- Experimental DSH Agent Teams cannot be the Fable Run source of truth.
- Child-Agent interactive approval is not part of the privileged-action proof.
- Every claimed behavior must have fresh execution evidence.

## Task 0 — Pin environment and inspect current contracts

**Owns:** baseline only; no source mutation yet.

- [ ] Record get-fable base commit.
- [ ] Record DSH commit and resolved Cordis versions from lock/workspace metadata.
- [ ] Record Bun/Node/OS/architecture.
- [ ] Read current DSH repository instructions relevant to modified paths.
- [ ] Identify exact package/test commands from manifests.
- [ ] Identify official current pattern for a first-party DSH plugin/service and Web client module.
- [ ] Identify current SessionPersistence test provider/fake model helpers.
- [ ] Confirm current cancellation/resume APIs from source and tests.

**Evidence:** `spike-baseline.json` or equivalent checked into the experimental spike path, containing no secrets.

**Stop condition:** if required current source cannot be resolved or the pinned host cannot build its existing tests, record environmental blocker before writing spike code.

## Task 1 — Write RED Fable spike domain contracts

**Create in isolated experimental path:** exact path selected after repository-convention inspection, e.g. `experiments/fable-agency-runtime-dsh/` if allowed.

Define minimal spike-only types:

```text
SpikeRun
SpikeTask
SpikeWorker
SpikeArtifact
SpikeEvent
SpikeHostBinding
```

Required Worker states:

```text
created
ready
running
completed
cancelled
reconciling
blocked
failed
```

Write failing tests for:

- valid/invalid Worker transitions;
- revision conflict;
- cancellation winning over late success;
- typed artifact schema mismatch;
- restart conversion `running -> reconciling`;
- deterministic Task with no host binding.

Run the focused tests and preserve RED evidence.

## Task 2 — Implement the minimal durable SpikeRunStore

Use the smallest inspectable durable implementation consistent with the spike spec. Do not build production SQLite yet.

Required behavior:

- atomic authoritative transition write;
- monotonic revision;
- persisted Run/Task/Worker/Artifact metadata;
- no prompt/transcript/secret persistence;
- reopen after process restart.

Tests:

- RED tests from Task 1 become GREEN;
- malformed/unsupported schema fails closed;
- interrupted/failed write does not publish a new revision;
- content digest/Artifact metadata survives reopen.

Commit separately as spike storage proof.

## Task 3 — Create fake Host Adapter contract

Define spike-only Fable-facing methods:

```text
createWorkerBinding
runWorker
cancelWorker
resumeWorker / reconcileWorker
subscribeHostEvents
dispose
```

The fake adapter proves the coordinator depends only on Fable spike types.

Tests:

- Coordinator can run Worker A -> Artifact -> deterministic digest Task -> Worker B without importing DSH types.
- Fake host cancellation reaches final `cancelled` state.
- Fake host restart/reconciliation path produces `reconciling` then deterministic outcome.

This is the anti-corruption-boundary control test. If later DSH integration forces these public test fixtures to import DSH/Cordis types, record a boundary failure.

## Task 4 — Build DSH Host Adapter spike

Using current supported DSH Agent APIs:

- create distinct Session identities for Worker A and B;
- bind one DSH Agent/Session per model-backed Worker;
- map Fable route requirement to DSH provider/model options;
- map AbortSignal/cancel into supported host cancellation;
- retain only stable host Session ref in SpikeWorker binding;
- cleanly dispose live Agent resources.

Do not use Agent Teams as authority.

Tests:

- plugin/service loads;
- A/B Session IDs are distinct;
- one Worker disposal does not dispose the other;
- duplicate/invalid ownership is rejected according to host contract;
- plugin unload disposes listeners/resources.

## Task 5 — Prove bounded Worker A structured output

Use deterministic fake/replay model route.

Worker A input is a synthetic Issue description. Validate output against the exact JSON schema in the spike spec.

Tests:

- malformed model output cannot become an Artifact;
- valid output becomes `fable-spike.issue-analysis.v1` Artifact;
- Artifact includes producer Worker/provider route/digest;
- no full Session transcript is copied into SpikeRunStore.

Preserve request/settlement evidence only in test/log artifacts, not Run state.

## Task 6 — Prove deterministic non-Agent Task

Implement `artifact.digest.verify` as local deterministic spike capability.

Tests:

- Task runs without creating DSH Agent/Session;
- mismatch blocks/fails according to spike state machine;
- success writes bounded evidence/event.

This is required to falsify the architecture if the coordinator accidentally assumes every Task is an Agent.

## Task 7 — Prove Worker B typed handoff isolation

Worker B receives only:

- Task B objective;
- validated Artifact A content/ref;
- deterministic review policy/context required by the test.

Instrument DSH request/context assembly at the supported test seam to prove Worker A transcript/messages are absent.

Tests:

- B completes from typed Artifact;
- B cannot access A full Session history through the Fable handoff path;
- schema mismatch blocks B before invocation;
- A and B may use distinct route identifiers.

## Task 8 — Cancellation race experiment

Use scripted long-running fake adapter/turn.

Sequence:

```text
start Worker
commit running
request cancellation
commit cancel intent
abort host turn
observe host settlement
reject any late success transition
clean up binding/listeners
```

Tests/evidence:

- timestamps/event ordering;
- final Fable state cancelled;
- host state documented;
- no leaked live Agent registration/listener;
- late result cannot write completed.

If host cancellation cannot produce reliable observability/cleanup, mark M1 constraint/falsifier rather than hiding it.

## Task 9 — Restart and recovery experiments

### R1 — idle persisted child

- [ ] complete A and persist Artifact;
- [ ] cleanly stop host;
- [ ] restart;
- [ ] reopen Run Store;
- [ ] create/resume B using supported Session path;
- [ ] finish Run.

### R2 — active Worker interrupted

- [ ] start scripted B and commit `running`;
- [ ] terminate/restart controlled host process/test harness;
- [ ] reopen store and set `reconciling`;
- [ ] inspect Session persistence/recovery support;
- [ ] reattach/resume if supported, otherwise record exact blocker;
- [ ] never infer success from missing host callback.

Evidence must distinguish DSH flush completion from actual post-restart recoverability.

## Task 10 — Minimal Web observability panel

Use current supported DSH Web client extension/module mechanism.

Expose through an explicit service/remote projection:

```text
Run id/status
Task states
Worker states
safe Session refs
model route refs
latest event
Artifact id
cancel/recovery status
```

Tests:

- panel loads through current module loader;
- structured state update reaches panel;
- panel does not parse chat DOM/messages for state;
- unload removes subscriptions.

No polished Fable Studio redesign in M1.

## Task 11 — Failure injection

Inject at least:

```text
model/adapter failure
malformed Worker output
RunStore write failure
Session persistence/reopen failure
provider unavailable during recovery
cancellation during streaming
Web subscriber failure
```

Expected behavior:

- authority state remains coherent;
- observer failure does not roll back committed transition;
- unknown external/host outcome becomes reconciling/blocked;
- no false completed state.

## Task 12 — Final verification matrix

Run:

- spike unit/state-machine suite;
- DSH host integration suite;
- restart scenarios;
- cancellation scenario;
- Web integration test;
- existing affected DSH/get-fable baseline tests required by modified experimental integration path;
- typecheck/build/lint commands relevant to the spike packages.

Record exact commands and outputs in the spike report. Do not write “tests pass” without behavior mapping.

## Task 13 — Architecture verdict

Create/update spike report with one verdict:

```text
GO
GO WITH CONSTRAINTS
REQUIRES HOST EXTENSION
REQUIRES THIN FORK
NO-GO
```

For every M1 question record:

```text
Question
Verdict
Evidence command/test/artifact
Observed contract
Constraint
Fable design consequence
```

Update ADR 0002 verification section with measured outcome.

If a host extension is required, create one minimal Work Card/Issue naming the exact missing seam. Do not immediately implement a fork.

## Task 14 — Cleanup / handoff

- [ ] Verify spike code is clearly experimental.
- [ ] Ensure no credentials/generated user data are committed.
- [ ] Keep useful reproducible tests/evidence or delete accidental scratch files.
- [ ] Update roadmap readiness based on verdict.
- [ ] Hand off exact Host Adapter method constraints to M2/M3.

## Acceptance proof table

| Requirement | Observable behavior | Required evidence |
| --- | --- | --- |
| plugin host seam | Fable spike plugin loads/unloads | host integration test |
| isolated Workers | A/B have distinct Sessions/context | integration assertion + request inspection |
| typed handoff | B consumes validated Artifact only | schema + context test |
| non-Agent Task | digest Task completes with no Session | fake/host registry assertion |
| durable Run | state survives process restart | R1 store snapshots + test |
| uncertain recovery | active Worker becomes reconciling | R2 test/trace |
| cancellation | cancel beats late success and cleans up | race test/trace |
| model route seam | A/B route IDs resolve independently | adapter test |
| UI observability | panel receives structured Run state | Web integration test |
| anti-corruption boundary | public spike fixtures import no DSH/Cordis types | static/type boundary test |

## Final handoff

Do not start C20 Provider ABI production implementation until the M1 verdict and Host Adapter constraints are committed and reviewed.
