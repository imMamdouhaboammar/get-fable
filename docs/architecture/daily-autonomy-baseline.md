# Daily Autonomy Architecture Baseline

Date: 2026-08-17
Baseline repository SHA: `1dc2e684b920799bd4be68741e20cdaf2708d062`
Version: `1.1.0`
Default branch: `master`

This document is a first-run architecture snapshot for the daily autonomous development process. It is evidence, not a permanent roadmap. Future runs must revalidate it against current code.

## Current architecture

`get-fable` is a local-first TypeScript/Bun execution runtime that imposes explicit discipline around AI-assisted software work. Its canonical lifecycle is represented by a small deterministic core rather than a monolithic agent prompt.

Primary flow:

```text
user task
  -> deterministic task router
  -> canonical skill registry
  -> specialist prompt compiler / host adapter
  -> execution
  -> durable state + evidence
  -> verification / recovery / completion
```

The package has no runtime dependencies. TypeScript and Node types are development-only dependencies.

## Core modules

- `src/core/task-router.ts`: deterministic task classification and explainable routing.
- `src/core/skill-registry.ts`: loads the canonical six-skill workflow graph.
- `src/core/state.ts`: schema-v1 durable state, phase transitions, failure streaks, and evidence.
- `src/core/prompt-compiler.ts`: compiles a compact task-specific directive rather than injecting the whole prompt library.
- `src/core/doctor.ts`: runtime/package/project diagnostics.
- `src/router/`: local request-proxy normalization, provider translation, and contextual injection.
- `src/cli.ts`: command surface for initialization, routing, state, evidence, diagnostics, lint, and proxy modes.
- `src/fable-lint.ts`: consistency checks across human-readable ledger state and strict JSON state.
- `src/installer.ts`: project and host-specific installation adapters.
- `hooks/`: host lifecycle enforcement and failure/close guards.
- `skills/`: canonical workflow contracts and registry.

## Public API surface

`src/index.ts` re-exports installer, lint, utilities, asset management, router modules, core types, skill registry, task router, state functions, prompt compiler, and doctor functions. State helpers are therefore package-level public APIs and should be changed compatibly where practical.

CLI commands documented in the architecture include:

```text
init
route <task> [--json]
doctor [--json]
status [--json]
lint
serve [port]
router [port]
```

The CI lifecycle smoke also exercises `route --apply`, `state`, and `evidence`.

## State model

Schema version: 1.

Durable fields:

```text
phase
currentSkill
failureStreak
substantial
lastDecision
evidence[]
updatedAt
```

Evidence records contain kind, source, pass/fail result, detail, and timestamp.

State is written atomically through the shared utility layer. Invalid phase transitions are rejected. Repeated failures move active work into recovery. Substantial work has an explicit completion gate.

## Phase lifecycle

```text
idle
  -> discovering | planned | executing | verifying | recovering | blocked

discovering
  -> planned | executing | verifying | recovering | blocked

planned
  -> discovering | executing | verifying | recovering | blocked

executing
  -> verifying | recovering | blocked

verifying
  -> complete | recovering | executing | blocked

recovering
  -> discovering | planned | executing | verifying | blocked

complete / blocked
  -> new active work
```

The workflow is explicit, but some transitions are intentionally permissive to support host adapters and resumed work.

## Verification architecture

Verification is represented at several layers:

1. `fable-verify` as a distinct workflow specialist.
2. evidence records in durable state.
3. completion guards in `src/core/state.ts`.
4. consistency checks in `src/fable-lint.ts`.
5. host close/stop guards under `hooks/`.
6. repository CI running typecheck, Bun tests, build, lifecycle smoke, and package inspection.

CI currently tests Ubuntu with Bun 1.3.0, Ubuntu with Bun 1.3.14 plus coverage/package inspection, and macOS with Bun 1.3.14.

## Recovery architecture

Recovery is both a canonical skill and a state phase. Evidence failures increment `failureStreak`; two consecutive failures on non-complete work move the state to `recovering` and select `fable-recover`. Routing also gives repeated/stale failure explicit precedence over another blind implementation attempt.

## Integration surfaces

- generic Agent Skills under `.agents/` and root `skills/`
- Claude Code plugin/marketplace manifests and Python hooks
- Codex plugin metadata, configuration, and specialist profiles
- Antigravity / Gemini installation support
- local OpenAI-compatible request proxy
- npm package distribution
- GitHub Actions CI

Recent development has concentrated on plugin/package validation and Claude Code plugin packaging, while preserving the canonical workflow as the semantic source of truth.

## Test coverage map

Observed suites cover:

- `core.test.ts`: registry, router precedence, state transitions, evidence-gated completion, prompt compiler
- `cli.test.ts`: CLI contracts
- `fable-lint.test.ts`: ledger/state consistency
- `hooks-state.test.ts`: hook-driven state enforcement
- `installer.test.ts`: installation and idempotency
- `router.test.ts`: request proxy behavior
- `provider-translator.test.ts`: provider adaptation
- `context-injector.test.ts`: contextual injection
- `plugin.test.ts`: plugin/package shape
- `maturity.test.ts`: broader product/runtime contracts
- `utils.test.ts`: shared utilities
- `site/site.test.ts`: website surface

The CI matrix supplies broader runtime/OS evidence beyond unit tests.

## Current technical debt and architectural risks

1. **Evidence freshness gap:** the documented promise is fresh passing evidence, while the pre-run completion guard accepted any historical pass even when a newer failure existed.
2. **State validation depth:** schema-v1 validation checks top-level shape strongly but does not deeply validate every evidence or routing-decision field.
3. **Mutation provenance:** state does not record a code/workspace mutation generation, so freshness cannot yet prove that evidence post-dates the latest repository mutation.
4. **Workspace identity:** durable state is not visibly bound to a repository/worktree identity, which can matter for copied or resumed `.fable/` directories.
5. **Permissive resume transitions:** broad transitions from `complete` and `blocked` are useful but deserve explicit behavioral coverage as the runtime matures.
6. **Cross-host semantic drift risk:** several host adapters exist; the canonical registry reduces this risk but adapter tests must continue checking that semantics do not fork.
7. **Historical asset weight:** the repository includes a large reusable `assets/` surface that should remain clearly separated from core runtime semantics and package claims.
8. **No open issue backlog:** GitHub currently exposes no repository issues, so opportunity discovery depends heavily on executable-code inspection, tests, PR history, and documentation drift.
9. **Local verification portability:** Bun is the declared runtime floor; daily development environments without Bun/network access must rely on CI rather than silently claiming local verification.
10. **Documentation freshness:** architecture documentation is strong, but high-confidence product claims should keep being checked against actual state-machine behavior.

## Ten high-value improvement candidates

Scores are 1–10. Priority uses:

`(User Value × 2) + Reliability + Architectural Fit + DX + Differentiation + Learning + Testability - Maintenance Cost - Regression Risk`

| Candidate | UV | Learn | Fit | Rel | DX | Diff | Conf | Test | Maint | Risk | Priority |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Fresh-evidence completion gate | 9 | 8 | 10 | 10 | 8 | 8 | 10 | 10 | 2 | 2 | **68** |
| Deep validation of evidence/state records | 8 | 7 | 10 | 9 | 7 | 6 | 9 | 10 | 3 | 3 | 59 |
| Workspace identity binding | 8 | 9 | 9 | 9 | 6 | 8 | 7 | 8 | 5 | 5 | 55 |
| Explicit mutation generation for evidence freshness | 9 | 10 | 9 | 10 | 6 | 9 | 6 | 8 | 7 | 6 | 57 |
| Resume-transition conformance tests | 7 | 7 | 9 | 8 | 6 | 5 | 9 | 10 | 2 | 2 | 55 |
| Corrupted-state recovery diagnostics | 8 | 8 | 9 | 9 | 8 | 6 | 8 | 9 | 4 | 3 | 58 |
| Change-aware verification selection | 9 | 9 | 8 | 8 | 8 | 9 | 5 | 7 | 7 | 6 | 54 |
| Evidence provenance/report bundle | 8 | 9 | 8 | 8 | 7 | 9 | 6 | 7 | 6 | 5 | 53 |
| Cross-host registry conformance checks | 7 | 7 | 9 | 8 | 8 | 5 | 8 | 9 | 4 | 3 | 53 |
| Compact state/history strategy | 6 | 9 | 7 | 7 | 5 | 8 | 5 | 7 | 6 | 5 | 46 |

Implementation confidence is recorded for decision quality but is not part of the prescribed priority formula.

## First-run decision

Selected initiative: **Fresh-evidence completion gate**.

Why:

- It closes a concrete executable mismatch with the README's claim that substantial completion requires fresh passing evidence.
- It strengthens verification and recovery without changing the state schema.
- It can be implemented incrementally with no dependency changes.
- It is straightforward to falsify with a regression sequence: `pass -> fail -> complete` must be rejected; a later `pass` must make completion legal again.
- It preserves the existing exported `hasPassingEvidence` helper while adding a stricter helper for completion/lint semantics.

## Revalidation rule

Do not treat this baseline as tomorrow's truth. Each daily run must inspect current default-branch code, tests, docs, issues/PRs, CI, and recent commits before selecting work.
