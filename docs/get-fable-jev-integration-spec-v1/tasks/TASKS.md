# Implementation tasks

Each card should be completed with TDD, a focused commit, and updated evidence. Do not collapse phases merely to move faster.

## P0: archaeology and compatibility

- [ ] JEV-001 Re-read `AGENTS.md`, router, state, registry, CLI, DSH API, eval runner, Rust router, parity tests, and current open PR/bot comments.
- [ ] JEV-002 Record current HEAD, package version, Bun floor, CI Bun versions, routing corpus hashes, and holdout hash.
- [ ] JEV-003 Re-check TypeSafe model id, limits, JavaScript SDK docs, jaggedness, pricing/rate-limit page, and legal/data-handling docs.
- [ ] JEV-004 Create a branch using repository naming conventions.
- [ ] JEV-005 Add a failing Bun compatibility spike for `@typesafe-ai/sdk` import/build behavior.
- [ ] JEV-006 Verify SDK request path through injectable/fake fetch.
- [ ] JEV-007 Verify AbortSignal/timeout behavior under Bun.
- [ ] JEV-008 Verify 429 and retry behavior without consuming live quota where possible.
- [ ] JEV-009 Decide SDK vs direct HTTP and write/update ADR.
- [ ] JEV-010 Confirm chosen dependency/license impact and third-party notice requirements.

## P1: internal contracts

- [ ] JEV-011 Add `src/core/reflex/types.ts` with provider-neutral types.
- [ ] JEV-012 Add schema-versioned `ReflexStateEnvelopeV1`.
- [ ] JEV-013 Add unit tests for envelope mapping.
- [ ] JEV-014 Add deterministic failure-state bucketing.
- [ ] JEV-015 Add verification-freshness bucketing from state generations in code.
- [ ] JEV-016 Add task length cap and control-character sanitation.
- [ ] JEV-017 Add secret-redaction helper with tests and false-positive fixtures.
- [ ] JEV-018 Add fail-closed behavior when redaction removes semantically critical content.
- [ ] JEV-019 Add `HardPolicySnapshot` extraction from current task/state semantics.
- [ ] JEV-020 Port existing suppression parsing into a reusable helper without changing current route behavior.
- [ ] JEV-021 Add tests proving current `routeTask()` behavior is unchanged after extraction refactor.

## P2: skill criteria and Jev question builder

- [ ] JEV-022 Generate first-pass Choice criteria from canonical registry.
- [ ] JEV-023 Add contrastive semantic boundary notes for lookalike skills.
- [ ] JEV-024 Add validation that every candidate id exists in current registry.
- [ ] JEV-025 Add Choice contract for skill selection.
- [ ] JEV-026 Add diagnostic task-shape Choice.
- [ ] JEV-027 Add atomic recovery Noul.
- [ ] JEV-028 Add atomic security relevance Noul.
- [ ] JEV-029 Add external-research Noul.
- [ ] JEV-030 Add planning Noul.
- [ ] JEV-031 Add verification Noul.
- [ ] JEV-032 Add behavior-change Noul.
- [ ] JEV-033 Add delegation-fit Noul.
- [ ] JEV-034 Add request-builder snapshot/golden tests.
- [ ] JEV-035 Assert normal request envelope remains under local context ceiling for all canonical skills.

## P3: TypeSafe provider adapter

- [ ] JEV-036 Implement provider constructor with secret-only API key access.
- [ ] JEV-037 Implement pinned-model request.
- [ ] JEV-038 Normalize Choice probabilities/confidence.
- [ ] JEV-039 Normalize Noul signals.
- [ ] JEV-040 Reject unknown selected skill ids.
- [ ] JEV-041 Record returned versioned model id.
- [ ] JEV-042 Classify timeout errors.
- [ ] JEV-043 Classify 429/rate-limit errors.
- [ ] JEV-044 Classify auth/permission errors.
- [ ] JEV-045 Classify malformed response errors.
- [ ] JEV-046 Support caller abort.
- [ ] JEV-047 Enforce bounded retry budget.
- [ ] JEV-048 Add fake-server integration tests for all provider failure classes.

## P4: two-stage disambiguation

- [ ] JEV-049 Implement top-two margin calculation in code.
- [ ] JEV-050 Implement ambiguity predicate.
- [ ] JEV-051 Build second-stage state with top three candidate contracts only.
- [ ] JEV-052 Add `none_of_these` to second-stage Choice.
- [ ] JEV-053 Add second-stage fit Noul.
- [ ] JEV-054 Add tests for stage2 confirm, reject, low-confidence, and provider failure paths.

## P5: hard policy and fusion

- [ ] JEV-055 Implement skill risk-tier map in code.
- [ ] JEV-056 Implement provisional threshold profile as config, not constants scattered through code.
- [ ] JEV-057 Implement pure `fuseRoute()`.
- [ ] JEV-058 Prove recovery lock cannot be downgraded.
- [ ] JEV-059 Prove redteam/heal/release/handoff hard routes cannot be downgraded.
- [ ] JEV-060 Prove explicit suppressions block conflicting overrides.
- [ ] JEV-061 Prove invalid/unknown Jev skill falls back.
- [ ] JEV-062 Rebuild pack/gates/fallback/next from registry after any accepted semantic skill override.
- [ ] JEV-063 Keep `RoutingDecision` persisted shape unchanged.

## P6: async routing service and circuit breaker

- [ ] JEV-064 Add `resolveRoute()` async orchestration service.
- [ ] JEV-065 Always compute deterministic route first.
- [ ] JEV-066 Add provider timeout racing/fallback.
- [ ] JEV-067 Add process-local circuit breaker with fake-time tests.
- [ ] JEV-068 Add mode handling: off/shadow/recommend/guarded/authority.
- [ ] JEV-069 Ensure off mode never instantiates provider or touches network.
- [ ] JEV-070 Ensure provider errors never alter normal route exit behavior.

## P7: local reflex ledger

- [ ] JEV-071 Add `.fable/reflex` safe-boundary checks consistent with lifecycle filesystem policy.
- [ ] JEV-072 Add schema-versioned event writer.
- [ ] JEV-073 Hash task text instead of storing raw text by default.
- [ ] JEV-074 Add bounded rotation.
- [ ] JEV-075 Add malformed-ledger handling that never blocks routing.
- [ ] JEV-076 Add tests for symlink/special-file rejection.

## P8: CLI and doctor

- [ ] JEV-077 Add `reflex status`.
- [ ] JEV-078 Add `reflex doctor` without live network by default.
- [ ] JEV-079 Add explicit `reflex doctor --live` or equivalent.
- [ ] JEV-080 Add `reflex route` with JSON schema version.
- [ ] JEV-081 Add `reflex ledger` bounded viewer.
- [ ] JEV-082 Add `reflex eval` command.
- [ ] JEV-083 Preserve existing `route` output and behavior in first shipped reflex release.

## P9: evaluation and calibration

- [ ] JEV-084 Extend eval runner with deterministic/Jev/Jev-stage2/hybrid arms.
- [ ] JEV-085 Add new semantic routing corpus categories.
- [ ] JEV-086 Add top-1/top-2 metrics.
- [ ] JEV-087 Add override coverage/precision/win/harm metrics.
- [ ] JEV-088 Add Brier score.
- [ ] JEV-089 Add ECE and confidence-bin report.
- [ ] JEV-090 Add latency/token/cost metrics.
- [ ] JEV-091 Ensure benchmark can replay recorded Jev fixtures offline.
- [ ] JEV-092 Run existing non-holdout corpus and record baseline.
- [ ] JEV-093 Run live Jev arm if credentials are available.
- [ ] JEV-094 Tune thresholds on non-holdout data only.
- [ ] JEV-095 Run holdout once at promotion gate and create hash-bound evidence artifact.

## P10: integration and documentation

- [ ] JEV-096 Add explicit opt-in shadow integration to ordinary route path only after eval harness is trusted.
- [ ] JEV-097 Keep DSH route behavior deterministic until shadow integration phase.
- [ ] JEV-098 Add reflex health/status to DSH only as additive metadata.
- [ ] JEV-099 Update architecture docs.
- [ ] JEV-100 Update usage/config docs.
- [ ] JEV-101 Update security/data-handling docs.
- [ ] JEV-102 Update README only with claims proven by tests/evals.
- [ ] JEV-103 Update changelog.
- [ ] JEV-104 Update third-party notices if required.

## P11: final release evidence

- [ ] JEV-105 Run typecheck.
- [ ] JEV-106 Run full Bun test suite.
- [ ] JEV-107 Run full build.
- [ ] JEV-108 Run package/prepack checks.
- [ ] JEV-109 Run routing benchmark.
- [ ] JEV-110 Run Rust parity.
- [ ] JEV-111 Run security/secret scan.
- [ ] JEV-112 Prove `FABLE_REFLEX_MODE=off` produces zero network calls.
- [ ] JEV-113 Prove no credential appears in generated artifacts/logs.
- [ ] JEV-114 Produce final evidence report with exact commands, versions, model id, corpus hashes, and measured metrics.
- [ ] JEV-115 Do not enable guarded override unless promotion criteria in `10-evaluation.md` pass.
