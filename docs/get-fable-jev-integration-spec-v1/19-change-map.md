# Expected repository change map

Paths are proposed and must be reconciled with current HEAD before implementation.

## New files

```text
src/core/reflex/types.ts
src/core/reflex/state-envelope.ts
src/core/reflex/hard-policy.ts
src/core/reflex/fusion.ts
src/core/reflex/service.ts
src/core/reflex/ledger.ts
src/core/reflex/skill-boundaries.ts
src/core/reflex/providers/typesafe-jev.ts
src/core/reflex/providers/typesafe-normalize.ts
src/core/reflex/config.ts
src/core/reflex/circuit-breaker.ts
src/core/reflex/eval.ts

test/reflex/state-envelope.test.ts
test/reflex/hard-policy.test.ts
test/reflex/fusion.test.ts
test/reflex/typesafe-provider.test.ts
test/reflex/ledger.test.ts
test/reflex/circuit-breaker.test.ts
test/reflex/eval.test.ts

eval/benchmarks/reflex-routing-v1.json
schemas/reflex-*.json (if repository keeps public JSON schemas here)
docs/REFLEX_ROUTING.md
```

## Modified files

Likely:

```text
package.json                  # only if SDK chosen; scripts/exports as needed
bun.lock                      # only if SDK chosen
src/cli.ts                    # reflex commands
src/index.ts                  # exports if public
src/dsh/api.ts                # later recommend/shadow status, not initial authority
src/core/eval-runner.ts       # benchmark arms
src/core/maturity.ts          # only if evidence/status displays reflex readiness
docs/ARCHITECTURE.md
docs/USAGE.md
SECURITY.md
THIRD_PARTY_NOTICES.md        # if dependency/licensing requires
README.md                     # after behavior exists, concise feature docs
```

## Files that should stay semantically unchanged in early phases

```text
src/core/task-router.ts
src/core/state.ts
src/core/types.ts (unless internal exports are required, no RoutingDecision change)
crates/fable-core/src/router/*
crates/fable-core/src/types.rs
```

Keeping these stable is intentional. It makes rollout reversible.
