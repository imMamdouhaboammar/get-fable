# Current-state audit

## Existing routing contract

`src/core/task-router.ts` currently performs four jobs together:

1. deterministic signal extraction from task text and state
2. additive skill scoring
3. selected-skill resolution and precedence
4. construction of canonical `RoutingDecision`

The returned decision contains:

```ts
selectedSkill
selectedPack
taskShape
confidence
reasons
requiresPlan
requiredGates
fallbackSkill
parallelCandidates
nextSkills
scores
```

The router contains explicit suppression semantics such as "no external research", "do not release", "no security review", "skip plan", "no delegation", and similar user constraints. These are not merely classifier hints. They are policy inputs.

## Existing hard precedence

The current code gives recovery a special final precedence when its score reaches the recovery threshold. Explicit task signals also strongly score security, red team, heal, release, handoff, verification, research, discovery, delegation, planning, TDD, and many system skills.

The new integration must not accidentally turn these rules into soft model suggestions.

## Synchronous public surface

`routeTask()` is synchronous. It is called from:

- CLI paths
- prompt compilation
- DSH API
- maturity/eval logic
- routing benchmarks
- tests
- TypeScript/Rust parity checks

Jev is a network call and therefore asynchronous.

Changing `routeTask()` to async would cause a broad compatibility refactor. v1 must not do that.

## Durable state contract

`.fable/state.json` schema v3 persists `lastDecision: RoutingDecision | null`.

Changing `RoutingDecision` directly would affect:

- state validators/migrations
- TypeScript/Rust types
- state persistence
- public JSON
- holdout evidence hashes
- compatibility with historical state

Therefore Jev-specific provenance must initially live outside the persisted `RoutingDecision` object.

## Rust core and parity

`crates/fable-core` mirrors routing/state types. `test/rust-parity.test.ts` compares native and TypeScript routing for selected skill, pack, shape, plan requirement, fallback, gates, and next skills.

Jev should not be embedded directly into Rust v1. The native engine remains deterministic and offline-capable.

## Existing evaluation machinery

`src/core/eval-runner.ts` already supports:

- routing benchmark
- confusion matrix
- forbidden skill violations
- known/negative/ambiguous/adversarial categories
- holdout evaluation
- hash-bound evidence freshness

This is a strong foundation. Jev evaluation should extend this system rather than creating a separate unrelated benchmark framework.

## Existing architectural values to preserve

- local-first behavior
- no network dependency for normal deterministic routing
- small public contract surface
- source-of-truth registry
- typed external boundaries
- evidence before claims
- conservative completion semantics
- explicit fallback
- no hidden chain-of-thought persistence
- minimal dependencies
- Bun-first runtime
- Rust parity for deterministic core behavior
