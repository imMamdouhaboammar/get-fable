# Fable Evidence Model

**Status:** Proposed M0 normative model  
**Date:** 2026-09-11

## Purpose

Fable completion must mean **current evidence satisfies the declared acceptance contract**, not that a Worker or model reports success.

Fable integrates evidence authorities without creating a competing copy of their state machines.

## 1. Evidence principles

1. Evidence is typed and scoped.
2. Evidence has a producer and provenance.
3. Evidence can become stale after relevant mutation or remote-state change.
4. One evidence type cannot be widened into a claim it did not check.
5. Provider-owned evidence remains provider-owned; Fable stores references and normalized gate facts.
6. Passing evidence for one Task does not automatically satisfy another Task.
7. Completion evaluates evidence after the latest relevant mutation.
8. Review, CI and approval are distinct facts and can each be required.

## 2. EvidenceRef

```ts
interface EvidenceRefV1 {
  evidenceRefId: string
  providerId: string
  providerVersion?: string
  type: EvidenceTypeV1
  subjectRef: string
  providerEvidenceRef: string
  result: 'pass' | 'fail' | 'unknown'
  observedAt: string
  freshness?: 'fresh' | 'stale' | 'unknown'
  repositoryRevision?: string
  workspaceId?: string
  mutationGeneration?: number
  scope?: string[]
  metadata?: Record<string, JsonValue>
}
```

`providerEvidenceRef` is opaque to the core unless a provider-specific adapter resolves it.

## 3. Evidence classes

V1 classes:

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

### Completion-capable vs supporting evidence

Whether a class can satisfy completion depends on the Task's explicit evidence requirements.

Examples:

- a passing `test` can satisfy a behavioral test requirement;
- a `receipt` proves an operation happened but not that behavior is correct;
- a `security` pass does not prove functional correctness unless the Task's claim is specifically security-scoped;
- an `approval` authorizes an action but does not verify its result;
- a `ci` result may satisfy multiple checks only when the referenced CI workflow/commit and requirement mapping prove it.

## 4. Evidence requirement

```ts
interface EvidenceRequirementV1 {
  requirementId: string
  type: EvidenceTypeV1 | EvidenceTypeV1[]
  subject: string
  scope?: string[]
  freshness: 'current-repository' | 'current-mutation-generation' | 'external-current' | 'not-applicable'
  sourcePolicy?: {
    providerAllowlist?: string[]
    independentFromWorker?: boolean
  }
  required: boolean
}
```

Every substantial Task must have an explicit requirement set before implementation begins. Requirements can be refined only through a recorded plan/acceptance change, not retroactively to match available evidence.

## 5. Freshness

### Local mutation freshness

For workspace behavior, the preferred invariant is:

```text
mutation N
  -> evidence before N is potentially stale
  -> verification covering N passes
  -> evidence is current for its scope
```

When Riqor provides `verification.freshness.v1`, Riqor's mutation-sensitive result is authoritative for its observed repository state.

When get-fable's native evidence state is the selected provider, its `mutationGeneration` / `verifiedGeneration` contract applies to that provider's scope.

Fable MUST NOT combine two providers' generation numbers as if they were one counter. It records provider identity with each freshness claim.

### Git/remote freshness

Evidence tied to repository contents should include a commit/tree/revision reference when possible.

Examples:

- CI evidence is bound to the PR/head SHA checked;
- review evidence is bound to the reviewed diff/head SHA;
- build/test evidence is bound to the workspace/repository revision and mutation freshness provider state;
- merge readiness must be re-read if the PR head changes.

### External state freshness

Remote evidence such as CI, review or availability uses provider-specific freshness/observer policy. A cached green CI result for an old head is stale even if its timestamp is recent.

## 6. Evidence Gate

Task completion gate:

```text
for every required acceptance criterion:
  map criterion -> required observable behavior
  map behavior -> evidence requirement(s)
  resolve current evidence refs
  verify scope + subject + provenance + freshness
  reject on any current blocking failure
  reject on missing required evidence
  otherwise satisfy criterion

Task may complete only if every required criterion is satisfied.
```

A later current-scope failure supersedes an earlier pass for that gate until a newer valid pass exists after the failure/mutation boundary.

## 7. Independent review

A Task can require:

```text
review.independent.v1
```

Independence means the review provider/Worker did not author the implementation attempt it is reviewing. The Runtime records producer lineage and rejects self-review when `independentFromWorker: true`.

Independence is about execution identity/lineage, not merely a different prompt role in the same Worker.

## 8. Evidence from deterministic execution

For tests/build/typecheck/lint:

A provider result should include enough bounded facts to prove:

```text
command/check identity
exit status / structured result
start/end time
repository/workspace identity
revision/mutation boundary
artifact/log reference if retained
```

Fable Run state should not store entire logs by default. Logs/artifacts may remain in provider storage with stable references.

## 9. Riqor integration

Riqor already owns mutation-sensitive proof.

Fable adapter responsibilities:

- identify the repository/run scope;
- request current freshness/status through a stable machine interface;
- convert only bounded status/provenance to EvidenceRef;
- preserve provider-owned run/trace reference;
- treat Riqor's stale/pending result as blocking when the Task requires that provider;
- never call old trace events fresh without Riqor's current evaluation.

Fable does not reimplement Riqor's shell/session mutation classifier or ordered trace store in the Runtime kernel.

## 10. get-fable native evidence integration

Standalone get-fable already has mutation-aware evidence semantics in `.fable/state.json`.

When Fable chooses get-fable as an evidence provider:

- the adapter reads the canonical state transactionally;
- maps the selected completion scope/evidence to EvidenceRefs;
- preserves workspace identity and generation data;
- rejects contradictory/malformed routing/evidence state conservatively;
- leaves `.fable/state.json` under get-fable ownership.

## 11. Dokion evidence

When an active Dokion Playbook declares verification:

- Dokion executes/re-runs its declared commands and stores evidence under its authority;
- Fable references those results;
- Fable cannot infer a missing Dokion gate as passed;
- a changed/inactive Playbook authority makes previous workflow authorization unsuitable for continuing that governed Task until revalidated.

## 12. GitHub evidence

Examples:

```text
CI workflow/check -> ci evidence bound to commit SHA
PR review -> review evidence bound to PR head/diff
merge result -> release/receipt evidence bound to resulting merge SHA
Issue closure -> receipt bound to Issue id/state
```

Fable re-reads remote truth before irreversible actions whose eligibility can change.

## 13. Evidence invalidation events

Fable itself may mark a previously attached EvidenceRef unusable for a gate when it learns a dependency changed. It does not mutate provider evidence.

Invalidation reasons include:

```text
repository-head-changed
workspace-mutated
provider-reported-stale
active-playbook-changed
artifact-digest-changed
requirement-revised
provider-version-incompatible
evidence-subject-mismatch
approval-expired
```

The original reference remains in history for auditability.

## 14. Evidence and retries

A failed attempt's evidence is retained. Retry does not erase failure history.

New attempt completion requires evidence after the latest mutation/retry boundary. A retry that makes no change may reuse still-current external evidence only where the requirement/provider contract explicitly permits it.

## 15. Run completion

A Run may complete only when:

- every required Task is terminal-successful;
- no required Task is blocked/failed;
- all Run-level evidence requirements are current;
- no later repository mutation invalidated the accepted proof;
- required independent review is current;
- required CI is current for the intended PR head;
- any merge/closure policy requirement is satisfied or the configured outcome explicitly stops at `PR ready`;
- no unresolved high-severity policy/security blocker remains.

The requested Run outcome matters. A Run whose outcome is `verified PR` can complete without merge; a Run whose outcome includes merge must satisfy the separate merge gate.

## 16. Falsification tests

M3-M6 must include tests proving:

- a later workspace mutation makes earlier completion evidence unusable;
- a green CI result on an old PR head cannot authorize merge;
- a self-authored review cannot satisfy an independent-review requirement;
- research/receipt evidence cannot satisfy a behavioral test requirement;
- a copied Riqor trace entry cannot be marked fresh by Fable metadata;
- a changed Dokion Playbook blocks governed continuation until revalidated;
- a failed current-scope check blocks completion despite an older pass;
- a newer valid pass after the failure can reopen the completion gate;
- missing provider logs do not destroy the bounded EvidenceRef audit record;
- raw secrets and full command output are absent from serialized Fable evidence fixtures.
