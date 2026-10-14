# Coding Agent Implementation Prompt

## Mission

Implement the Jev Reflex Routing integration for `imMamdouhaboammar/get-fable` using the specification in this package.

Do not start by coding.

First re-verify the live repository and current TypeSafe documentation. The repository is not greenfield and the current architecture is authoritative.

## Required baseline

Spec baseline was:

```text
repo: imMamdouhaboammar/get-fable
branch: master
sha: 8446e33378ca7c55313fe8e08f57de9e353519ce
package: 1.9.1
```

If HEAD has moved, reconcile changes instead of blindly applying file paths from the spec.

## Invariants

1. Preserve synchronous deterministic `routeTask()`.
2. Do not make TypeSafe/Jev required for normal routing.
3. Keep remote reflex mode disabled by default.
4. Do not change `.fable/state.json` schema for the initial integration.
5. Do not widen `RoutingDecision` just to persist provider metadata.
6. Jev never directly mutates state, executes tools, or decides completion.
7. Recovery/security/release/handoff hard policies stay deterministic.
8. Registry remains canonical for pack/gates/fallback/next semantics.
9. Keep TypeScript/Rust deterministic parity green.
10. Live Jev calls must never run in ordinary PR CI.
11. Use TDD and small reviewable commits.
12. Treat external SDK/API JSON as untrusted until normalized.
13. Keep secrets out of logs and `.fable` state.
14. Read GitHub bot comments on open PRs because they may contain useful review context.

## Phase order

### Phase 0: archaeology and compatibility spike

- inspect current router, state, eval runner, DSH API, CLI, Rust parity, current open issues/PRs
- inspect current TypeSafe model/SDK/jaggedness docs
- verify official `@typesafe-ai/sdk` under the repository's Bun floor and current CI runtime
- decide SDK vs direct HTTP with evidence
- record ADR

No production-path mutation before the spike is reviewed.

### Phase 1: pure internal contracts

Implement:

- Reflex types
- state envelope
- hard-policy snapshot
- pure fusion policy
- threshold/risk profile
- tests

No live provider call required.

### Phase 2: provider adapter

Implement TypeSafe adapter behind the provider interface with fake-server tests for timeout, 429, auth, server error, malformed response, abort, and model drift.

### Phase 3: explicit reflex CLI + shadow ledger

Ship an explicit opt-in reflex command. Existing route behavior remains unchanged.

### Phase 4: evaluation

Extend existing eval machinery rather than creating a disconnected harness. Measure deterministic vs Jev raw vs Jev two-stage vs hybrid.

### Phase 5: ordinary-route shadow integration

Only after previous gates pass, allow explicit opt-in shadow mode on ordinary routing.

Do not implement guarded override until its acceptance gates are actually met.

## Verification

At each phase run the narrowest relevant tests first, then the full repository gate before claiming completion.

Final evidence should include:

- tests added and their purpose
- exact full-check command/result
- deterministic baseline metrics
- Jev/hybrid metrics when live access exists
- provider latency/cost sample
- package/build result
- Rust parity result
- security/privacy review
- docs updated
- rollback proof with reflex mode off

## Skeptical posture

Treat all threshold values in the spec as bootstrap hypotheses. Do not hard-code them as "correct" without evaluation.

If Jev fails to improve the measured routing problem, keep the adapter/shadow tooling if useful but do not promote it into authority merely because the integration works technically.
