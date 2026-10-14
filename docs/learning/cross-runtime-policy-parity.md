# Cross-Runtime Policy Parity

## Problem

The TypeScript state machine and lint command treated only the newest evidence record as current, but the Python Stop hook accepted any historical pass. A substantial run with `pass -> fail` could therefore be rejected by the core while the host guard allowed the session to stop.

## Incorrect assumption

Updating the canonical runtime automatically updates every enforcement adapter.

## Engineering concept

Security and reliability policies must have conformance tests at every runtime boundary. Shared intent is not enough when implementations exist in more than one language.

## What get-fable now does

The Python Stop guard uses the same rule as the TypeScript completion gate and lint command: the newest evidence record must be a substantive pass. A later failure makes earlier proof stale until a newer pass is recorded.

## Failure case

```text
test pass
-> runtime failure
-> durable phase still says complete
-> Stop hook evaluates evidence
```

The Stop hook now blocks this state instead of finding and reusing the older passing record.

## Test proving behavior

`test/hooks-state.test.ts` constructs a substantial completed state with `pass -> fail`, verifies that the Stop hook exits with status 2, appends a newer pass, and verifies that stopping is then allowed.
