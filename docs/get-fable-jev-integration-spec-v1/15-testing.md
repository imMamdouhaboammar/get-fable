# Testing strategy

## TDD rule

Every behavior change starts with a failing test.

## Unit tests

### State envelope

- maps failure counts to semantic buckets in code
- excludes raw evidence history
- redacts secrets
- caps task length
- stable schema

### Jev request builder

- contains all canonical skills except root orchestrator
- no unknown skills
- criteria generated deterministically
- questions are atomic
- model is pinned in guarded mode

### Normalizer

- accepts valid Choice/Noul result
- rejects missing option probabilities
- rejects unknown skill ids
- handles missing usage
- handles provider model drift

### Fusion policy

Table-driven cases for:

- agreement
- low-confidence disagreement
- high-confidence low-risk disagreement
- hard recovery lock
- security escalation
- explicit suppression
- stage2 none-of-these
- provider failure
- invalid candidate
- model drift

### Circuit breaker

Use fake time. No sleeping in tests.

## Integration tests

Use a local fake TypeSafe HTTP server or SDK-injected fetch.

Verify:

- timeout
- abort
- 429 Retry-After
- 401
- 500
- valid response
- unexpected model id
- response latency accounting

## Live contract tests

Separate, opt-in, credential-gated CI job.

Never run live Jev calls in normal PR CI.

Live test must be non-destructive and tiny:

- list/confirm approved model if supported
- one known Choice/Noul request
- validate response shape and returned model

## Regression tests

All existing tests must remain green, including:

- core routing tests
- router policy v2
- lifecycle eval
- enterprise routing
- state/evidence policy
- public JSON contracts
- CLI
- DSH status/API
- Rust parity
- package/prepack

## Golden fixtures

Record provider responses as fixtures with:

- source model id
- capture date
- request schema version
- no raw secrets

Fixtures are for deterministic test replay, not accuracy claims.
