# Source of truth and research record

## get-fable repository evidence

This spec was grounded against the live repository, not memory.

Baseline checked on 2026-09-18:

- `master` commit: `8446e33378ca7c55313fe8e08f57de9e353519ce`
- commit message: `feat(learning): implement Failure-lessons knowledge base pattern and get-fable learn CLI`
- `package.json` version: `1.9.1`
- package description declares deterministic routing across 30 skills
- `docs/ARCHITECTURE.md` explicitly describes routing as deterministic and explainable
- `src/core/task-router.ts` is synchronous and returns `RoutingDecision`
- `src/core/types.ts` defines the public `RoutingDecision` shape
- `src/core/eval-runner.ts` already provides routing benchmarks and enterprise routing categories
- `eval/benchmarks/routing-v1.json` and `eval/scenarios/lifecycle-v2.json` are existing routing evidence corpora
- `evals/holdouts/routing-v1.json` is referenced as the holdout corpus
- `crates/fable-core` contains Rust routing/state types
- `test/rust-parity.test.ts` compares TypeScript and native routing behavior
- `src/dsh/api.ts` exposes synchronous route APIs and applies decisions transactionally

## TypeSafe / Jev evidence

Official TypeSafe documentation checked on 2026-09-18:

- Jev is the first public System One model
- current stable model id is `jev-1.13.0`
- `jev-latest` currently resolves to that model but can move when a new release ships
- TypeSafe recommends pinning a version when confidence thresholds are tuned against it
- JavaScript SDK package is `@typesafe-ai/sdk`
- SDK docs state Node.js 20+; Bun compatibility is not explicitly guaranteed in the docs
- `Choice` returns selected option, full probability distribution, and confidence
- `Score` returns a position over ordered descriptive levels plus probabilities/confidence
- `Noul` returns a yes-probability and does not have a separate confidence value
- many questions can be asked in one call and are evaluated in parallel
- Choice supports up to 255 options
- Jev 1.13 is text-only
- TypeSafe documents weaknesses in numeric precision, date arithmetic, long irrelevant state, indirection, adversarial state, and generation
- TypeSafe recommends deterministic code for arithmetic, control flow, and side effects

## Evidence standard for implementation

Before implementation starts, the coding agent must re-check:

1. current `master` SHA
2. current get-fable version
3. current TypeSafe model page
4. current JavaScript SDK docs and package version
5. current Jev jaggedness page
6. current routing benchmark and holdout corpus hashes
7. any open PR or bot review comment touching router, state, CLI, DSH API, or Rust parity

If those have changed materially, this spec must be reconciled before code changes.

## No invented claims

This specification does not assume:

- Bun is officially supported by the TypeSafe SDK
- TypeSafe service availability is sufficient for get-fable production use
- TypeSafe confidence thresholds transfer directly to get-fable
- Jev is more accurate than get-fable's deterministic router on get-fable's own corpus
- Jev can replace deterministic policy or verification
- Jev's current pricing/rate limits will remain unchanged

Those are measured or operational questions.
