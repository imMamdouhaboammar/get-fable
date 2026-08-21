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

## 2026-08-18 revalidation

Revalidated against default-branch SHA `78da31229bb2fbf86f3e2cb4731472860f30318b` and package version `1.1.0`. The repository had no open issues or pull requests. The full local repository gate passed with Bun 1.3.14: 69 tests, typecheck, and build.

The previous top two candidates are now implemented in the TypeScript runtime: completion uses the newest evidence record, and nested state records are validated field by field. The revalidation found that the Python Stop hook still accepted any historical pass, so host enforcement could disagree with the core after `pass -> fail`.

### Ranked candidates

| Rank | Candidate | Priority | Evidence |
|---:|---|---:|---|
| 1 | Cross-runtime fresh-evidence conformance | **68** | `hooks/_fable_common.py` searched any historical pass while `src/core/state.ts` used the newest record |
| 2 | Correct Claude failure-hook event registration | **66** | `hooks/hooks.json` registers failure tracking under `PostToolUse`; bundled host guidance distinguishes failure events |
| 3 | Applied-routing transition conformance | **61** | routing and lifecycle transitions are validated separately, leaving phase/decision combinations weakly covered |
| 4 | Python hook deep-state validation parity | **60** | hook state reads validate top-level fields but not nested evidence or routing decisions |
| 5 | Cross-field state invariant validation | **59** | schema-valid fields can still form contradictory phase/current-skill combinations |
| 6 | Corrupted-state recovery diagnostics | **58** | malformed persisted state is rejected, but repair guidance remains limited |
| 7 | Mutation generation and evidence provenance | **57** | newest-record freshness does not prove verification followed the latest workspace mutation |
| 8 | Workspace/worktree identity binding | **55** | copied `.fable/` state is not bound to a repository identity |
| 9 | Canonical installed-skill drift detection | **54** | initialization preserves existing skill files and doctor validates presence rather than semantic version/content |
| 10 | Packed-package import smoke test | **52** | CI inspects the tarball but does not install and import the packed artifact |

### Selected initiative

**Cross-runtime fresh-evidence conformance.** It is a reproduced completion-gate bypass, directly strengthens the core mission, requires no schema or dependency change, and can be proved with a focused `pass -> fail -> block -> pass -> allow` hook test.

## 2026-08-19 revalidation

Revalidated against default-branch SHA `be9a9b4b56cb2dc7c90a7a4b125c40574714f37c`
and package version `1.1.0`. GitHub exposed no open issues or pull requests, and
the latest default-branch CI run passed on Ubuntu with Bun 1.3.0 and 1.3.14 and
on macOS with Bun 1.3.14. The previous fresh-evidence initiative was merged as
PR #10, so it was excluded from today's scope.

The revalidation reproduced a Claude integration gap: both the packaged plugin
and global installer registered failure tracking only for `PostToolUse`, while
Claude reports failed tool executions through `PostToolUseFailure` with a
top-level `error`. The hook therefore reset rather than incremented its streak
when given the documented failure payload.

### Ranked candidates

| Rank | Candidate | UV | Learn | Fit | Rel | DX | Diff | Conf | Test | Maint | Risk | Priority |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Claude failure-event conformance with success reset | 9 | 8 | 10 | 10 | 8 | 7 | 10 | 10 | 3 | 2 | **66** |
| 2 | Applied-routing transition conformance | 8 | 8 | 10 | 9 | 8 | 7 | 8 | 10 | 4 | 3 | **61** |
| 3 | Python hook deep-state validation parity | 8 | 8 | 9 | 10 | 7 | 6 | 8 | 10 | 3 | 3 | **60** |
| 4 | Registry/runtime semantic conformance | 8 | 9 | 10 | 8 | 8 | 7 | 8 | 9 | 4 | 4 | **59** |
| 5 | Cross-field state invariant validation | 8 | 7 | 10 | 9 | 7 | 6 | 8 | 10 | 3 | 3 | **59** |
| 6 | Corrupted-state recovery diagnostics | 8 | 8 | 9 | 9 | 8 | 6 | 8 | 9 | 4 | 3 | **58** |
| 7 | Mutation generation and evidence provenance | 9 | 10 | 9 | 10 | 6 | 9 | 6 | 8 | 7 | 6 | **57** |
| 8 | Workspace/worktree identity binding | 8 | 9 | 9 | 9 | 6 | 8 | 7 | 8 | 5 | 5 | **55** |
| 9 | Canonical installed-skill drift detection | 8 | 7 | 9 | 8 | 9 | 5 | 8 | 9 | 5 | 4 | **54** |
| 10 | Packed-package install/import smoke | 7 | 7 | 8 | 8 | 8 | 4 | 9 | 10 | 3 | 4 | **52** |

The scoring inputs were user value, learning value, architectural fit,
reliability impact, developer experience, differentiation, implementation
confidence, testability, maintenance cost, and regression risk. Priority used
the documented formula; confidence was recorded separately and not added to it.

### Selected initiative

**Claude failure-event conformance with success reset.** It restores an
advertised recovery transition using the host's documented event boundary,
requires no state migration or dependency, preserves unrelated hooks, and is
directly testable with `failure -> success -> failure` and `failure -> failure`
sequences.

## 2026-08-21 revalidation

Revalidated against default-branch SHA `14d4e54abe3f3ec6bfbff95b1066a7d41cb3c4ad`
and package version `1.3.0`. PR #19 had expanded the canonical playbooks and was
the latest merged direction. PR #21 remained a separate draft for failed-write
invalidation and was excluded from duplicate implementation.

The default branch was not broadly green: GitHub CI run `32341381448` failed on
all three OS/runtime matrix jobs, while its E2E and Security workflows passed.
Local focused lifecycle tests passed before modification, but `bun run check`
stopped at a stale generated `public/llms.txt`. These inherited failures are
tracked separately from today's evidence-integrity initiative.

Repository reproduction found that `addEvidence()` accepted an explicit foreign
`workspaceId`, advanced `verifiedGeneration`, and allowed a substantial local
state to complete. Persisted state validation and the Python close guard also
ignored evidence-record ownership.

### Ranked candidates

| Rank | Candidate | UV | Learn | Fit | Rel | DX | Diff | Conf | Test | Maint | Risk | Priority |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Failed-write invalidation already isolated in PR #21 | 9 | 9 | 10 | 10 | 8 | 9 | 10 | 10 | 3 | 3 | **68** |
| 2 | Enforce evidence-record workspace ownership | 9 | 8 | 10 | 10 | 7 | 8 | 10 | 10 | 2 | 2 | **67** |
| 3 | Invalidate evidence on Git checkout/switch | 9 | 9 | 10 | 10 | 8 | 9 | 8 | 9 | 5 | 5 | **63** |
| 4 | Reject `.fable` symlink boundary escapes | 8 | 9 | 10 | 9 | 7 | 7 | 9 | 10 | 3 | 4 | **61** |
| 5 | Support linked-worktree Git directories | 8 | 8 | 9 | 8 | 9 | 6 | 9 | 10 | 3 | 4 | **59** |
| 6 | Require active-card closure before completion | 8 | 7 | 9 | 8 | 7 | 7 | 9 | 10 | 3 | 3 | **58** |
| 7 | Preserve existing Git hooks safely | 8 | 8 | 9 | 9 | 9 | 6 | 7 | 9 | 5 | 6 | **55** |
| 8 | Restore deterministic default-branch CI | 9 | 7 | 8 | 9 | 10 | 4 | 7 | 9 | 5 | 5 | **55** |
| 9 | Make Doctor resilient to read-only home directories | 7 | 7 | 7 | 8 | 9 | 4 | 9 | 10 | 3 | 3 | **53** |
| 10 | Contain public prompt lookup within its asset root | 7 | 7 | 6 | 8 | 6 | 3 | 10 | 10 | 2 | 2 | **50** |

Implementation confidence is recorded but excluded from the prescribed priority
formula. The highest-ranked candidate was already owned by an open PR, so the
highest-value unclaimed initiative was selected.

### Selected initiative

**Evidence-record workspace ownership.** New evidence must be stamped with the
owning state's workspace identity. Explicitly foreign records are rejected by
both runtimes. Legacy records without an evidence-level owner remain readable,
but cannot satisfy completion; fresh local verification replaces them without a
schema or dependency change.
