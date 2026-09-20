# Target architecture

## Components

### 1. DeterministicRouter

Existing `routeTask()` remains intact as the canonical synchronous router and fallback.

### 2. ReflexAdvisor interface

A provider-neutral asynchronous interface that receives a minimal semantic routing envelope and returns advisory evidence.

Suggested shape:

```ts
export interface ReflexAdvisor {
  readonly id: string;
  advise(input: ReflexInput, signal?: AbortSignal): Promise<ReflexAdvice>;
}
```

The core must not import TypeSafe types directly outside the adapter.

### 3. TypeSafeJevAdvisor

Implements `ReflexAdvisor` using Jev.

Responsibilities:

- build typed Jev questions
- call pinned model
- parse typed result
- normalize probabilities
- expose latency/usage/model id
- map provider errors into bounded internal error classes

It does not fuse decisions or mutate state.

### 4. RoutePolicySnapshot

A deterministic extraction of non-negotiable constraints from the current task/state.

Examples:

- explicit suppression flags
- repeated failure/recovery lock
- explicit security/redteam/heal intent
- explicit release/handoff intent
- lifecycle phase constraints
- registry validity

### 5. RouteFusionPolicy

Pure code that combines:

- deterministic route
- policy snapshot
- optional Jev advice
- configured mode/threshold profile

and returns:

```ts
{
  decision: RoutingDecision;
  provenance: RoutingProvenance;
}
```

Only `decision` is eligible for state persistence.

### 6. Async route orchestrator

New async entry point, suggested name:

```ts
resolveRoute(task, state, options): Promise<RouteResolution>
```

It always computes deterministic routing first.

Pseudo-flow:

```ts
const deterministic = routeTask(task, state, registry);
const policy = deriveHardPolicy(task, state, deterministic, registry);

if (mode === 'off') return deterministicResolution();

const envelope = buildReflexInput(...);
const advice = await safelyAdvise(envelope);

if (!advice.ok) return deterministicWithProviderFailure();

return fuseRoute({ deterministic, advice, policy, mode, registry });
```

### 7. Sidecar reflex ledger

Store Jev provenance separately from `.fable/state.json`.

Suggested path:

```text
.fable/reflex/events.jsonl
```

The ledger is optional, bounded, and contains no raw secret-bearing state.

### 8. Eval integration

Extend `src/core/eval-runner.ts` with provider-aware routing arms:

- deterministic
- Jev raw
- hybrid shadow simulation
- hybrid guarded override

Offline benchmark results must be reproducible from recorded provider fixtures or explicit live mode.

## Dependency direction

```text
core/types
   ^
   |
deterministic router  <----- registry
   ^
   |
fusion policy  <------ ReflexAdvice internal type
   ^
   |
async routing service
   ^
   |
provider adapter -----> TypeSafe SDK or HTTP
```

The provider may depend on core types. Core deterministic routing must never depend on a provider.

## Network boundary

No TypeSafe call is allowed from:

- `routeTask()`
- Rust core
- state validators
- completion gates
- evidence verification
- package generation
- `bun run check` by default

Live provider calls require explicit opt-in.
