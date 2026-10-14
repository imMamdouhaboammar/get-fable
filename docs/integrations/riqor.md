# Integration Brief: Riqor

**Status:** Proposed Wave-1 provider  
**Date:** 2026-09-11

## Purpose

Use Riqor as the first-party authority for mutation-sensitive verification freshness and repository-scoped completion proof without reproducing its shell/session hooks, evidence gate or trace store inside Fable Runtime.

## Measured current product boundary

Riqor is a local runtime around coding sessions. It tracks workspace mutation, verification-required state, successful checks and bounded repository-scoped run traces. A later mutation invalidates earlier completion evidence. Its persisted state intentionally excludes prompts, source content, raw commands/output and credentials.

Its run store uses repository identity, an active run pointer, `run.json`, ordered `events.jsonl` and per-run locking. `riqor run complete` refuses completion while verification is pending.

## Fable capabilities

```text
verification.freshness.v1
evidence.read.v1
```

A future capability for managed session activation is not required by M6 and is not part of Wave-1 ABI.

## Transport

### PROPOSED

Use the published local CLI/machine JSON interface unless a stable SDK API is explicitly documented by M5.

Measured command family includes:

```text
riqor doctor --json
riqor run start ...
riqor run status --json
riqor trace show <run-id> --json
riqor run complete --json
```

Fable should not start a Riqor-managed Codex/Antigravity wrapper merely to query evidence freshness.

## Source of truth

Riqor owns:

- active repository evidence run identity;
- verification-pending/current state;
- ordered evidence events;
- mutation/check classification made by its runtime;
- its own completion gate.

Fable owns only the requirement that a Task/Run needs `verification.freshness.v1` and the reference to Riqor's current decision.

## Required permissions

- local process/SDK access to Riqor;
- read access to current repository identity/status;
- provider-owned state read;
- provider-owned run state write only when Fable intentionally starts/completes a Riqor run.

Ordinary freshness reads do not require arbitrary repository write permission.

## Side effects

`run status` / `trace show`: `local_read`.  
`run start` / `run complete`: provider-owned `local_write`.  
Managed shell/session hooks are outside the initial adapter unless explicitly enabled by workspace policy.

## Invocation semantics

### verification.freshness.v1

Input:

```text
workspace/repository identity
subject Task/Run
expected repository revision when known
required verification scope
```

Output:

```text
fresh | stale | unknown
provider run ref
current provider status
repository/head identity metadata exposed safely by Riqor
bounded reason/evidence refs
```

If Riqor reports verification pending, Fable must treat the requirement as unsatisfied.

### evidence.read.v1

Returns bounded references/metadata from Riqor's run/trace without copying the complete raw trace into Run state.

## Evidence produced

Primary evidence type: `test`/`build`/etc. remain specific checks if Riqor exposes them, while `verification.freshness` is the authoritative freshness judgment tying relevant mutation to current verification.

Fable stores an `EvidenceRef` pointing back to the Riqor run/trace identity.

## Failure behavior

- Riqor absent/incompatible -> `unavailable`/`incompatible`;
- malformed/corrupt provider state -> fail closed for a Task requiring Riqor;
- no active Riqor run -> explicit no-run result; policy decides whether to start one or use another allowed evidence provider;
- repository identity mismatch -> `external-state` blocker;
- verification pending -> successful provider invocation with `stale` result, not transport failure.

## Retry semantics

Status/trace reads are idempotent.

Run start/complete must use provider semantics and reconciliation. Never create a second Riqor run merely because an invocation timeout made the outcome uncertain.

## Health check

- Riqor executable/module available;
- `doctor --json` succeeds under the supported version;
- adapter can parse the machine schema;
- repository identity can be resolved when project-scoped evidence is requested.

## Trust assumptions

First-party local evidence provider. It has repository/process observation capability but deliberately persists bounded metadata. Fable must preserve that privacy boundary and not add source/prompts/raw outputs to normalized evidence.

## Adapter responsibilities

- preserve Riqor's provider-owned run/trace IDs;
- never manufacture freshness from old events;
- map `verification-pending` to stale/blocking evidence;
- avoid copying raw command/output/source into Run state;
- keep repository identity binding intact;
- re-query current status after Fable observes later mutation or before completion where policy requires freshness.

## Integration tests

1. fresh verification after mutation satisfies the Fable requirement;
2. a later mutation makes the requirement stale;
3. old passing trace data cannot be re-labeled fresh by Fable;
4. provider-state corruption blocks instead of permitting completion;
5. repository identity mismatch blocks the Task;
6. Run serialization contains provider refs/status but no prompts/source/raw command output;
7. completion path rechecks freshness after a repair mutation;
8. provider unavailable can fall back only when Task policy allows another `verification.freshness.v1` provider.

## Integration acceptance

The architecture mapping is **READY**. M5 implementation readiness requires one pinned Riqor machine-output contract fixture and supported version range captured by the conformance suite.
