# Fresh Evidence Gate Lesson

## Problem

A substantial run could collect passing evidence, later record a failure, and still satisfy the completion gate because the runtime only asked whether any historical pass existed.

## Incorrect assumption

The existence of a passing evidence record is equivalent to current verification.

It is not. A later failure supersedes the confidence established by an earlier pass.

## Engineering concept

**Evidence monotonicity is unsafe when later observations can invalidate earlier proof.**

For a lightweight state machine without explicit mutation generations, the newest evidence record is a stronger completion signal than an unbounded search through history.

## What get-fable now does

For substantial work, the transition to `complete` requires the newest evidence record to be a substantive pass. `fable lint` applies the same rule to persisted completed state.

The older `hasPassingEvidence` helper remains available for compatibility; completion semantics use the stricter `hasFreshPassingEvidence` helper.

## Failure case

```text
verifying
  -> pass: targeted tests
  -> fail: later runtime smoke
  -> complete   # must be rejected
```

A new successful verification after that failure restores eligibility:

```text
verifying
  -> pass: targeted tests
  -> fail: later runtime smoke
  -> pass: corrected runtime smoke
  -> complete   # allowed
```

## Test proving behavior

`test/core.test.ts` now exercises the `pass -> fail -> complete` rejection and subsequent re-verification path.

`test/fable-lint.test.ts` also rejects a persisted substantial `complete` state whose newest evidence record is a failure.

## Remaining limitation

This is freshness relative to recorded evidence, not yet freshness relative to repository mutations. A future state-schema evolution could bind evidence to an explicit mutation/workspace generation for stronger provenance.
