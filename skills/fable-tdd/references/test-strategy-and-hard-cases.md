# TDD Test Strategy and Hard Cases

Use this when the obvious unit-test-first recipe is insufficient or could produce false confidence.

## Choosing the test level
Pick the narrowest level that still crosses the real behavior boundary.

### Unit
Use when behavior is local and dependencies are incidental. Good for pure logic, parsers, validators, calculations, state reducers.

### Contract
Use when the important behavior is an externally visible interface shape: request/response, serialization, error mapping, CLI exit/output, adapter contract.

### Integration
Use when correctness depends on interaction with database, queue, cache, filesystem, framework lifecycle, dependency injection, or multiple modules.

### E2E
Reserve for high-value user flows or when only the assembled application reveals the relevant behavior. Do not make E2E the first tool for every bug; slower feedback hides causality.

### Property/invariant
Useful when many inputs share one rule: round-trip encoding, ordering, conservation, idempotency, monotonicity, parser/serializer inverses.

## The wrong-RED checklist
A failing test is invalid evidence when:
- module cannot import;
- fixture cannot construct;
- test runner does not discover/configure the target correctly;
- environment variable/feature flag differs from target context;
- assertion never executes;
- stale compiled output is run;
- timeout comes from harness deadlock rather than product behavior;
- failure is unrelated pollution from another test.

Fix these before production mutation.

## Mocking decision
Mock only across a boundary whose contract is already known.

Ask:
- Is the dependency itself part of the suspected bug?
- Does the mock preserve the behavior that matters: ordering, retries, errors, transactions, streaming, timing?
- Could the test pass while the real integration fails because the mock is too polite?

If yes, move the test outward or strengthen the fake/contract evidence.

## Legacy code
Do not demand a perfect unit seam before any progress.

A safer sequence:
1. characterize current observable behavior at the nearest stable boundary;
2. write the regression expectation there;
3. introduce one seam needed for the smallest fix;
4. keep characterization green;
5. only then consider deeper refactoring.

This avoids changing structure and behavior simultaneously without proof.

## Concurrency and timing
Do not rely on `sleep(100)` as causal proof.

Prefer:
- barriers/latches;
- fake clocks;
- controlled promises/futures;
- deterministic scheduler/test executor;
- explicit event hooks;
- repeated stress only as supplementary evidence.

A race test should force the problematic ordering, not merely hope to encounter it.

## Flaky failures
When RED/GREEN changes across identical runs:
1. stop interpreting pass/fail as proof;
2. capture seeds/timestamps/order/environment;
3. isolate shared state and timing;
4. make the failure deterministic or statistically characterized;
5. then return to the RED/GREEN cycle.

## Database and queue behavior
Use realistic boundaries when the bug concerns:
- transaction isolation;
- unique constraints;
- locking;
- ordering/delivery semantics;
- retry/idempotency;
- serialization/storage representation.

A repository mock usually cannot prove those properties.

## External APIs
When real calls are unsafe/expensive:
- research the official contract first;
- encode that contract in a controlled fake/fixture;
- test your adapter against the contract;
- add a separate smoke/integration check where feasible.

Do not invent fake behavior from memory.

## Refactor-only changes
If behavior should not change, characterization tests become the RED-equivalent guardrail: they establish what must remain stable before movement. Do not create an artificial failing assertion just to satisfy ceremony; the invariant is "same behavior before and after." Route genuinely new behavior through normal RED.

## When classical TDD is not the first move
Pause TDD and switch Skills when:
- the behavior contract is unknown → discovery/research/plan;
- the harness is broken/stale → recover;
- only documentation/static content changes → execute;
- the issue cannot yet be reproduced → discover/recover;
- the test requires a destructive external operation without a safe environment → plan a safer verification strategy first.

The principle is causal evidence before mutation, not ritual.