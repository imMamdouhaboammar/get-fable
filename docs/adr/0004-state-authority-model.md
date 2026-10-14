# ADR 0004: State Authority Model

**Status:** Proposed for acceptance after M0 review  
**Date:** 2026-09-11

## Context

Fable will coordinate systems that already persist overlapping-looking concepts: get-fable lifecycle state, DSH Sessions, Agent Kernel memory, Riqor verification state, Dokion execution contracts and GitHub repository objects.

Without explicit authority, the Runtime could create competing copies of goals, plans, evidence, approvals or repository state and then recover incorrectly after restart.

## Decision

Use a **single-writer authority model by state domain**.

Fable Runtime owns only agency coordination state:

```text
Run
Task DAG
Worker lifecycle
capability requirements/resolutions
policy decisions and approval refs
artifact metadata/refs
evidence refs
route history
recovery state
```

Provider-authored state remains authoritative at the provider and is referenced by stable identity.

`get-fable` portable state remains get-fable-owned. DSH Session history remains DSH-owned. Agent Kernel memory remains Agent Kernel-owned. Riqor freshness remains Riqor-owned. An active Dokion Playbook remains the declared execution authority for its governed workflow. GitHub/Git remain repository truth.

## Decision drivers

- avoid split-brain recovery;
- prevent Fable from reimplementing provider state machines;
- keep local storage bounded and privacy-conscious;
- allow provider upgrades/reconciliation;
- make ownership testable.

## Alternatives considered

### Mirror every provider state into Fable

Rejected. Copies become stale, increase secret/privacy risk, and create ambiguity about which system can write truth.

### Let the active model/Agent own orchestration state in its Session

Rejected. Not every Task has a model Session, and transcript state is not a transactional agency control plane.

### Let each provider mutate shared Run state

Rejected. This creates multiple writers and makes policy/transition invariants unenforceable.

## Consequences

Providers report events/results; Fable transaction code decides agency transitions. Runtime recovery re-reads remote/provider truth rather than trusting cached success.

The Run Store must retain references even when provider data is later unavailable so the audit trail explains what authority was consulted.

## Risks

- provider APIs may not expose a stable reference/reconciliation operation;
- some external actions can have unknown outcome after a crash;
- multi-provider evidence may use incompatible notions of revision/freshness.

Unknown external outcomes become explicit blockers rather than assumed success. Fable does not merge incompatible provider generation counters.

## Compatibility implications

Provider adapters own mapping from their stable IDs/state into Fable refs. Changing a provider's internal store does not require Fable Run schema changes when stable references remain compatible.

## Security implications

Raw secrets are never copied into the Run Store. Corrupted authority references that could authorize a side effect fail closed.

## Migration implications

Current `.fable/state.json` is not migrated into the new Run Store as if it were a Run. A get-fable Provider Adapter exposes bounded portable lifecycle state/results to the Runtime.

## Verification

Contract tests must prove:

- providers cannot directly mutate Task/Worker state;
- restart changes active Workers to reconciliation;
- GitHub remote state is re-read before merge;
- Riqor stale state blocks when required;
- changed Dokion authority blocks governed resume;
- Agent Kernel memory is referenced rather than bulk-copied;
- raw credentials never serialize into Run fixtures.

## Revisit trigger

Revisit only if a provider proves that stable external references are impossible and correct recovery requires a bounded Fable-owned snapshot. Any exception must name the copied fields, freshness rule and conflict authority explicitly.
