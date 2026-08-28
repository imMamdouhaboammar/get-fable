# Deep State Validation Lesson

## Problem

`.fable/state.json` is durable execution state and is loaded across sessions, but schema version and top-level shape alone are not enough to make its nested contents trustworthy.

Before this change, `validateFableState()` verified that `evidence` was an array and then cast the object to `FableState`. A malformed evidence result or routing decision could therefore cross the persistence boundary and fail later in unrelated runtime logic.

## Incorrect assumption

A TypeScript interface plus a top-level runtime check makes parsed JSON safe to use as that interface.

TypeScript types disappear at runtime. `JSON.parse()` returns data, not a verified domain object.

## Engineering concept

**Validate durable state at the trust boundary, recursively enough to protect every field that drives behavior.**

The strongest place to reject corrupted state is the point where untyped persisted data becomes trusted runtime state. This keeps downstream routing, verification, recovery, doctor, and lint logic simpler because they can rely on the validated contract.

## What get-fable now does

Schema version 1 remains unchanged, but `validateFableState()` now checks nested evidence records and the last routing decision before returning a `FableState`.

Evidence validation covers:

- supported evidence kind
- non-empty source
- `pass` / `fail` result
- non-empty detail
- non-empty timestamp

Routing-decision validation covers:

- valid selected skill
- finite confidence in the 0–1 range
- non-empty reason strings
- boolean planning flag
- valid next-skill IDs
- finite, non-negative numeric scores for every canonical skill; routing scores
  are additive weights and may legitimately exceed one

No new dependency or migration is required.

## Failure case

A persisted record such as:

```json
{
  "kind": "test",
  "source": "bun test",
  "result": "success",
  "detail": "tests looked fine",
  "timestamp": "2026-08-17T10:00:00.000Z"
}
```

previously passed the state validator because `evidence` was an array. It is now rejected immediately because `success` is not a valid `EvidenceResult`.

The same applies to a routing decision containing an unknown skill such as `fable-improvise`.

## Test proving behavior

`test/core.test.ts` exercises malformed evidence and routing decisions field by field and also proves that a fully populated valid nested state remains accepted.

The RED CI run proved the old validator accepted malformed nested records. The GREEN CI run proved the stricter validator satisfies those contracts without breaking the existing lifecycle suite.

## Remaining limitation

Structural validation does not provide cryptographic integrity or attest that the
workspace contents still match the persisted state. Those require separate
provenance and mutation-freshness controls.
