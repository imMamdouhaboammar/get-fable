# Engineering Failure Lessons & Durable Knowledge Base

> Pay for an engineering mistake once.
> After that, the project should remember it.

## Purpose

This directory records engineering failures by reusable failure class, including what happened, why it happened, how it was fixed, how the fix was verified, and which invariant now prevents recurrence.

Do not treat this as a simple session summary or ticket archive. This knowledge base preserves hard-won engineering wisdom so that future contributors and coding agents can act with confidence and avoid repeating past defects.

---

## Directory Organization

```text
Failure-lessons/
├── README.md                     # Knowledge base principles, triggers, and directory contract
├── lessons-index.md              # Compact registry table and "Rules We Now Enforce"
├── testing-and-verification.md   # Regression test mappings, oracle proofs, and test strategies
└── <topic-specific-lessons>.md   # Grouped by domain/failure class (e.g. state-management.md)
```

Topic documents are created based on what was actually learned, such as:
- `authentication.md`
- `state-management.md`
- `database-integrity.md`
- `api-contracts.md`
- `background-jobs.md`
- `caching.md`
- `artifact-lifecycle.md`
- `performance.md`
- `frontend-state.md`
- `deployment.md`
- `testing.md`
- `security.md`
- `data-quality.md`
- `model-lineage.md`
- `observability.md`

---

## Core Invariants

1. **Organize by Failure Class, Not Ticket Number**:
   - Avoid: `Bug #143`, `Issue from Tuesday`, `Problem in PR #92`.
   - Prefer: `Non-atomic resource publication`, `Validation logic duplicated across entry points`, `Client and server disagreeing about API semantics`.
2. **Separate Facts From Hypotheses**:
   - Explicitly label root causes as `Confirmed`, `Strongly indicated`, `Open hypothesis`, or `Unknown`. Never convert speculation into fact.
3. **Extract the Lesson Behind the Bug**:
   - Address the architectural or system condition that allowed the failure, not merely the local one-line patch.
4. **Connect Lessons to Real Code and Tests**:
   - Every high-impact resolved failure must map to stable code symbols and regression test coverage:
     $$\text{Failure Class} \longrightarrow \text{Regression Test} \longrightarrow \text{Protected Invariant}$$
5. **Preserve History Without Preserving Noise**:
   - Exclude raw chat dumps, ephemeral timestamps, tokens, credentials, and transient environment paths.

---

## Maintenance Triggers

Update existing entries or create new ones when:
- **The same problem reappears**: Refine the detection heuristic or root cause analysis.
- **A deeper root cause is discovered**: Upgrade an open hypothesis or correct an inaccurate assumption.
- **Architecture changes invalidate an old lesson**: Supersede obsolete invariants.
- **Stronger verification is added**: Document tighter property tests, fuzzing fixtures, or integration coverage.
- **A previous fix proves incomplete**: Capture the regression or missed edge case.
- **Two lessons share one cause**: Consolidate disparate symptoms into a single unified failure class.

---

## Canonical Entry Schema

Every lesson follows the 14-section Failure-Lesson schema defined in [`lessons-index.md`](./lessons-index.md) and [`testing-and-verification.md`](./testing-and-verification.md).
