# Fail-Open Callbacks Need Durable Debt

## Problem

A lifecycle host expects hooks to return promptly. get-fable therefore bounds
how long a Python mutation callback waits for the state lock. Previously, lock
contention could make the hook return without advancing `mutationGeneration`,
leaving old verification apparently current.

## Incorrect assumption

A successful hook process exit does not prove that its safety transition was
persisted. It proves only that the host callback finished.

## Engineering concept

When availability policy requires a callback to fail open, safety work must be
represented as durable debt before control returns. The debt is monotonic: it
may temporarily block too much, but it must not silently make stale evidence
fresh.

## What get-fable now does

After bounded lock contention, the mutation hook exclusively creates a unique,
content-free token owned by the workspace. Stop blocks on any token. The next
locked state transaction snapshots valid tokens, advances the mutation
generation, writes the reconciled state, and only then removes that snapshot.
Tokens arriving concurrently remain pending.

## Failure case

Malformed, foreign, partial, symlinked, or special-file debt is never treated
as no debt. A token that cannot be removed after reconciliation can be counted
again later; this is a conservative false positive, not an unsupported
completion. If storage cannot create any token at all, this mechanism cannot
make the callback durable and surfaces an operational limit rather than a
freshness guarantee.

## Test proving behavior

`test/pending-mutation-debt.test.ts` holds the state lock past the callback
budget, proves that independent mutation callbacks create unique debt, checks
direct and host-translated Stop blocking, and verifies snapshot reconciliation
before command state, evidence, or completion changes.
