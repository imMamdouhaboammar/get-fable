# Failed Writes and Evidence Freshness

## Problem

A write-oriented tool can change part of a file and then report failure. If the
runtime treats failure as proof that no mutation occurred, evidence produced
before the attempt can remain falsely current.

## Incorrect assumption

An unsuccessful tool result means the workspace is unchanged.

## Engineering concept

Failure atomicity must be proved, not inferred. At an untrusted integration
boundary, conservatively invalidate cached evidence when an operation may have
partially mutated state.

## What get-fable now does

Allowlisted write attempts advance `mutationGeneration` on both success and
failure events. Read-only tools remain excluded. Completion also rechecks fresh
evidence when the durable phase is already `complete`, so idempotency cannot
bypass the invariant after a later mutation.

## Failure case

```text
verification passes at generation 0
-> state becomes complete
-> Edit changes part of a file and fails
-> completion is requested again
```

The failed write advances the generation to 1, while verification remains at
generation 0. Completion stays blocked until valid evidence is produced for
generation 1.

## Tests proving behavior

- `test/hooks-state.test.ts` proves a failed write stales earlier evidence and
  that a read-only failure does not create a mutation.
- `test/core.test.ts` proves an already-complete state cannot reaffirm stale
  evidence after a later mutation.
- `test/plugin.test.ts` and `test/installer.test.ts` prove packaged and global
  Claude configurations register mutation tracking for both result events.
