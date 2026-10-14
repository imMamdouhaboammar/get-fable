# ADR 0006: Fable-Owned Agency Run Persistence

**Status:** Proposed for acceptance after M0 review  
**Date:** 2026-09-11

## Context

Fable Run state spans Task/Worker lifecycle, provider routes, artifacts, approvals, evidence references and recovery. DSH Session persistence is optimized for durable model-visible conversation/session history and cannot represent every deterministic provider action or multiple isolated Workers as one authority.

Fable must also recover conservatively after crashes and make Run Detail queryable without replaying every model transcript.

## Decision

Fable Runtime owns a separate local **Run Store**.

Logical persistence contract:

- append domain events for authoritative transitions;
- maintain materialized Run/Task/Worker projections transactionally;
- use monotonic Run/object revisions for optimistic concurrency;
- store Artifact metadata separately from large/provider-owned payloads;
- store stable provider/evidence/operation references rather than duplicating provider stores;
- persist credential references only;
- mark uncertain in-flight work `reconciling` after restart;
- perform provider/host reconciliation before retrying uncertain side effects.

Initial implementation target is a versioned local SQLite store in Fable application state storage. SQLite is a private implementation detail, not Provider ABI.

## Decision drivers

- transactional multi-object transitions;
- crash/restart recovery;
- queryable Studio Run Detail;
- separation from model transcript persistence;
- local-first deployment;
- no new network control plane required for v1;
- bounded schema migrations.

## Storage shape

Illustrative logical tables:

```text
runs
run_events
tasks
workers
provider_routes
artifacts
evidence_refs
approvals
external_operations
```

Large logs, source files, transcripts and provider-native evidence traces remain outside this store unless a future explicit retention feature owns them.

## Commit ordering

For a Fable-owned transition:

```text
validate current revision + invariants
-> begin transaction
-> append domain event
-> update materialized projection(s)
-> update monotonic revision
-> commit
-> publish observer/UI event
```

Observer publication is not the authority commit.

For an external side effect:

```text
persist invocation intent / idempotency key
-> call provider
-> persist provider operation/result ref
-> transition Task/Worker according to validated result
```

Where the provider can create a durable operation ID before completion, persist it as early as the transport permits.

## Recovery

On open:

1. validate schema/version/integrity invariants;
2. migrate only through tested migrations;
3. locate non-terminal Runs;
4. change `running`, `waiting` and `verifying` Workers whose process ownership was lost to `reconciling`;
5. re-resolve provider versions/health;
6. reconcile external operation refs;
7. reattach compatible DSH Sessions through the Host Adapter when possible;
8. refresh remote GitHub/CI/evidence authority state;
9. commit a reconciliation revision;
10. resume scheduler only after uncertainty is resolved or represented as blockers.

## Alternatives considered

### Use DSH Session log as the Run database

Rejected. It conflates transcript and agency control state, cannot naturally represent deterministic Tasks, and couples Fable to one host.

### Store all Run state in `.fable/state.json`

Rejected. Current get-fable state intentionally models a compact portable lifecycle and evidence freshness, not a multi-worker task graph. Expanding it into Studio Run state would weaken portability and create concurrent-writer pressure.

### Append-only JSONL only

Not selected as the initial production target. JSONL is attractive for a throwaway M1 spike and audit stream, but transactional materialized queries and multi-object updates are clearer with SQLite. The logical event model remains portable.

### Cloud database/control plane first

Rejected for v1. Local-first Studio does not need distributed state before M6 proves the workflow.

## Consequences

Positive:

- Studio can query current Run state efficiently;
- recovery has a Fable-owned durable control plane;
- Session/provider state remains separate;
- later remote synchronization can be added behind a Run Store interface.

Negative:

- Fable owns schema migrations and database integrity;
- reconciliation logic becomes a first-class subsystem;
- dual persistence (Run Store + DSH/provider stores) requires clear authority rules.

## Risks

- SQLite locking/crash behavior must be tested on supported platforms;
- application-state location and backup semantics require M3/M7 platform design;
- external side effects can remain uncertain despite local transaction durability.

Unknown external outcomes block/reconcile; they are not inferred from absence of a local result.

## Compatibility implications

Run Store schema version is internal Runtime compatibility. Provider ABI stores stable refs, so provider store changes need not mirror into SQLite schema when the ref contract remains valid.

## Security implications

Run Store must not contain raw secrets, cookies, browser session values, full environment values or hidden model reasoning. File/database permissions follow platform-appropriate private application-state defaults.

## Migration implications

Existing `.fable/state.json`, DSH Sessions, Riqor traces, Agent Kernel memory and Dokion state are not imported wholesale. Adapters reference them as external authorities.

## Verification

M3 tests must include:

- transaction rollback leaves no partial Task/Worker transition;
- monotonic revision conflict rejects stale writers;
- crash/reopen converts active Workers to reconciliation;
- schema migration fixtures from every released Runtime schema;
- corrupted/unsupported schema fails safely;
- concurrent read + serialized write behavior on supported platforms;
- idempotency/operation ref survives restart;
- raw secrets are absent from database fixtures;
- materialized projection matches event replay for generated state-machine sequences.

Property/state-machine tests SHOULD generate legal transition histories and compare projections with event replay.

## Revisit trigger

Revisit storage backend only if measured M3/M6 behavior shows SQLite cannot meet required local concurrency, portability or recovery. Keep the Run Store interface and logical event contract stable across backend changes.
