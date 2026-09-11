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

## 2026-08-20 revalidation

Revalidated against default-branch SHA `0b94f10b27d37c3b648ced7402d15ba27aabca82`
and package version `1.3.0`. The runtime now uses schema v3, workspace-bound
state, mutation generations, 25 canonical skills, and an expanded cross-host
test matrix. GitHub exposed no open issues. PR #19 was intentionally excluded:
its change set is unrelated and its current CI matrix is failing.

The audit reproduced two connected freshness bypasses. First, a failed `Edit`
payload left generation-zero evidence current even though an editor can fail
after a partial write. Second, after any mutation of a state already marked
`complete`, another `complete` transition returned before evaluating freshness.

Scores are 1–10. Priority is `(UV × 2) + Rel + Fit + DX + Diff + Learn + Test - Maint - Risk`;
implementation confidence is recorded but not added.

| Rank | Candidate | UV | Rel | Fit | DX | Diff | Learn | Conf | Test | Maint | Risk | Priority |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Failed-write invalidation plus idempotent completion gate | 9 | 10 | 10 | 8 | 8 | 8 | 9 | 10 | 2 | 2 | **68** |
| 2 | Git checkout/reset mutation tracking | 9 | 10 | 10 | 7 | 8 | 9 | 7 | 9 | 4 | 4 | **63** |
| 3 | Evidence workspace-provenance enforcement | 9 | 10 | 10 | 7 | 8 | 9 | 7 | 8 | 5 | 5 | **60** |
| 4 | Claude interrupt/failure discrimination | 7 | 8 | 8 | 8 | 4 | 7 | 9 | 10 | 2 | 2 | **55** |
| 5 | Reject symlinked `.fable` write boundaries | 8 | 9 | 8 | 7 | 5 | 8 | 8 | 9 | 4 | 4 | **54** |
| 6 | Packed-package install/import smoke test | 7 | 8 | 8 | 8 | 4 | 7 | 9 | 10 | 3 | 4 | **52** |
| 7 | Correct unsupported integration claims | 6 | 5 | 7 | 9 | 3 | 4 | 10 | 9 | 1 | 1 | **46** |

### Selected initiative

**Mutation-to-completion freshness hardening.** Failed write attempts now
invalidate prior evidence through both Claude result events and broad host
adapters. The state machine also evaluates the completion gate before its
same-phase idempotency path. This closes the reproduced
`verify -> complete -> failed write -> complete` sequence without a schema,
dependency, or public CLI change. The conservative tradeoff is intentional: a
failed write that made no filesystem change can require redundant verification.

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
but cannot satisfy completion; fresh local verification supersedes them as
completion proof without changing the externally persisted schema version or adding a dependency.

## Daily revalidation — 2026-08-22

Repository and GitHub reality were rechecked at `14d4e54` on the default branch
and `5ef4848` on the open evidence-ownership pull request. The default CI is
already red for inherited routing, timeout, authoring, performance, and generated
documentation failures. More importantly, review of the ownership change found
that both runtimes could skip a newer security failure for generic work, and that
schema-v1 migration did not use the security task's completion policy.

Priority uses `(User Value × 2) + Reliability + Architectural Fit + Developer
Experience + Differentiation + Learning + Testability - Maintenance - Risk`.
Confidence is recorded but is not part of the formula.

| Candidate | UV | Learn | Fit | Rel | DX | Diff | Conf | Test | Maint | Risk | Priority |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Close PR #22 evidence-ordering and migration review gaps | 10 | 8 | 10 | 10 | 8 | 8 | 10 | 10 | 3 | 3 | **68** |
| Finish failed-write and same-phase hardening in draft PR #21 | 10 | 8 | 10 | 10 | 8 | 8 | 10 | 10 | 3 | 3 | **68** |
| Correct linked-worktree Git boundaries and hook installation | 9 | 9 | 10 | 9 | 9 | 8 | 9 | 10 | 4 | 4 | **65** |
| Invalidate evidence after Git HEAD/reset changes | 9 | 9 | 10 | 10 | 8 | 9 | 7 | 9 | 5 | 5 | **63** |
| Reject symlinked `.fable` workspace-boundary escapes | 9 | 9 | 9 | 10 | 7 | 7 | 8 | 9 | 5 | 5 | **59** |
| Restore the inherited default-branch CI failures | 8 | 7 | 8 | 8 | 10 | 5 | 7 | 10 | 5 | 5 | **54** |
| Add an installed-package consumer smoke test | 7 | 7 | 8 | 8 | 8 | 5 | 9 | 10 | 3 | 4 | **53** |

The PR #22 review gaps were selected despite a score tie because they are
confirmed merge blockers on the current non-draft change and include a direct
completion-gate bypass. The accepted behavior is explicit: `functional pass ->
newer security fail` blocks; a newer functional pass reopens the gate; and a
legacy security task uses security evidence during migration without granting
that scope to generic work. Migrated security evidence must still match the
owning workspace; ownerless or nonmatching legacy records remain historical and
cannot satisfy completion.

## Daily revalidation — 2026-08-23

Repository and GitHub reality were rechecked at default-branch SHA `14d4e54`
and PR #22 head `ce7fd12`. The default CI remained red from inherited playbook,
generated-output, routing-eval, fixture, and behavior-eval failures, while the
E2E workflow passed. PR #22's evidence-focused tests passed, but its completion
policy still trusted three independent scope markers with OR semantics.

Priority uses `(User Value × 2) + Reliability + Architectural Fit + Developer
Experience + Differentiation + Learning + Testability - Maintenance - Risk`.
Confidence is recorded but excluded from the formula.

| Candidate | UV | Learn | Fit | Rel | DX | Diff | Conf | Test | Maint | Risk | Priority |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Bind completion scope to a consistent routing identity | 10 | 8 | 10 | 10 | 7 | 8 | 9 | 10 | 3 | 3 | **67** |
| Restore truthful default-branch CI after PR #19 | 9 | 8 | 9 | 10 | 9 | 4 | 8 | 10 | 3 | 3 | **62** |
| Invalidate evidence from a Git HEAD/worktree fingerprint | 9 | 9 | 10 | 10 | 7 | 9 | 6 | 8 | 6 | 4 | **61** |
| Enforce applied-routing and phase conformance | 8 | 7 | 10 | 9 | 7 | 6 | 8 | 10 | 4 | 3 | **58** |
| Reject symlinked `.fable` workspace-boundary escapes | 8 | 8 | 9 | 9 | 7 | 7 | 8 | 9 | 4 | 4 | **57** |
| Correct linked-worktree Git hook resolution | 8 | 8 | 9 | 9 | 8 | 7 | 7 | 9 | 5 | 5 | **56** |
| Add an installed-tarball consumer smoke test | 7 | 7 | 8 | 8 | 9 | 5 | 9 | 10 | 3 | 3 | **55** |
| Add Python-hook concurrent state locking | 8 | 9 | 9 | 9 | 6 | 8 | 6 | 8 | 7 | 7 | **53** |

The selected initiative is **cross-field task-scope integrity**. A generic
routing decision could coexist with `currentSkill: fable-security` or
`taskShape: security`; either marker made a security pass completion-capable.
The accepted policy treats a complete canonical routing decision as the scope
authority, requires its skill and task shape to agree for security completion,
and keeps the legacy current-skill fallback only when no decision exists.

## 2026-08-27 revalidation

Revalidated against default-branch SHA
`14d4e54abe3f3ec6bfbff95b1066a7d41cb3c4ad` and package version `1.3.0`.
GitHub exposed no standalone open issues. Daily PRs #21, #22, and #23 cover
failed-write invalidation, evidence ownership, and generated context freshness;
none implements linked-worktree Git hook support. The default-branch CI test
job is failing for inherited benchmark and authoring assertions, while E2E and
the latest scheduled security workflow pass.

Repository execution reproduced a separate integration defect. In a real
linked worktree, `.git` is a file that points into the repository's worktree
administration area. The installer, status command, Doctor, and Doctor repair
all appended `hooks/` to that file path. Installation and repair failed with
`ENOTDIR`, while read-only checks falsely reported that hooks were missing.

### Ranked candidates

| Rank | Candidate | UV | Learn | Fit | Rel | DX | Diff | Conf | Test | Maint | Risk | Priority |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Ship checkout mutation invalidation | 9 | 8 | 10 | 10 | 8 | 7 | 9 | 10 | 3 | 3 | **65** |
| 2 | Ship level-triggered Stop gate | 9 | 8 | 10 | 10 | 7 | 7 | 9 | 10 | 3 | 3 | **64** |
| 3 | Finish evidence ownership PR #22 | 9 | 9 | 10 | 10 | 7 | 8 | 8 | 10 | 4 | 5 | **63** |
| 4 | Linked-worktree-aware Git hooks | 8 | 8 | 9 | 9 | 9 | 6 | 9 | 10 | 3 | 3 | **61** |
| 5 | Ship lifecycle symlink containment | 9 | 8 | 10 | 10 | 7 | 7 | 8 | 9 | 4 | 4 | **61** |
| 6 | Git reset and hook-bypass freshness | 9 | 9 | 9 | 10 | 7 | 8 | 7 | 9 | 4 | 5 | **61** |
| 7 | Cross-field routing invariants | 8 | 8 | 10 | 9 | 7 | 7 | 8 | 10 | 3 | 4 | **60** |
| 8 | Restore default-branch CI | 8 | 6 | 8 | 9 | 9 | 5 | 7 | 8 | 5 | 5 | **51** |

Priority uses the documented formula; confidence is recorded but excluded.
The higher-scoring candidates already have completed local branches or open
PRs, so reimplementing them would duplicate outstanding integration work.

### Selected initiative

**Linked-worktree-aware Git hook resolution.** One shared resolver asks Git for
the effective hooks directory instead of parsing `.git`. The bounded change
strengthens developer experience and host integration without changing state,
dependencies, CLI contracts, or public schemas. Acceptance uses real
repositories and linked worktrees, including a configured `core.hooksPath`.

## 2026-08-29 revalidation

Revalidated against default-branch SHA
`983cb1d50a00bbfabd1698759ac39425dfdfae30` and package version `1.5.1`.
PR #24 has merged linked-worktree-aware Git hook installation. Draft PR #28
owns updater release intelligence and was excluded. Default-branch E2E and
security workflows passed; the CI matrix had one inherited macOS Doctor timing
failure at 10.63 seconds against a 10-second budget.

Repository execution exposed a distinct state-discovery defect. Python hooks
stopped upward `.fable/` discovery only at a `.git` directory. Git represents a
linked-worktree root with a `.git` file, so all shared Python lifecycle hooks
could cross that root and read or mutate an ancestor workspace's durable state.

Priority uses `(User Value x 2) + Reliability + Architectural Fit + Developer
Experience + Differentiation + Learning + Testability - Maintenance - Risk`.
Implementation confidence is recorded but excluded from the formula.

| Rank | Candidate | UV | Learn | Fit | Rel | DX | Diff | Conf | Test | Maint | Risk | Priority |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Contain Python state discovery at linked-worktree roots | 9 | 9 | 10 | 10 | 8 | 8 | 10 | 10 | 2 | 2 | **69** |
| 2 | Ship checkout mutation invalidation | 9 | 8 | 10 | 10 | 8 | 7 | 9 | 10 | 3 | 3 | **65** |
| 3 | Ship level-triggered Stop enforcement | 9 | 8 | 10 | 10 | 7 | 7 | 9 | 10 | 3 | 3 | **64** |
| 4 | Contain symlink and special-file lifecycle paths | 9 | 8 | 10 | 10 | 7 | 7 | 8 | 9 | 4 | 4 | **61** |
| 5 | Preserve pre-existing user Git hooks | 8 | 8 | 9 | 9 | 9 | 6 | 7 | 9 | 5 | 6 | **55** |
| 6 | Isolate process-global cwd in CLI tests | 8 | 6 | 8 | 7 | 10 | 4 | 8 | 9 | 4 | 4 | **52** |
| 7 | Propagate legacy install alias failures | 7 | 5 | 7 | 7 | 9 | 3 | 10 | 10 | 1 | 1 | **52** |
| 8 | Verify release-asset archive construction | 7 | 7 | 8 | 8 | 8 | 5 | 8 | 9 | 4 | 4 | **51** |

The checkout and Stop candidates already have completed branches, while updater
work is active in PR #28. The selected initiative is **linked-worktree state
isolation** because it is the highest-value unclaimed invariant violation and
has a direct privacy and state-integrity impact. The accepted policy checks for
local `.fable/` state first, then treats any `.git` filesystem entry—including
a gitfile or broken symlink—as a conservative repository boundary. It changes
no schema, dependency, CLI, or public package API.

## 2026-08-31 revalidation

Revalidated against `master` SHA `2d0cf7b261d681c95ecf08a0fff6ff3be12f4b12`
and package version `1.5.1`. PR #31 had merged the linked-worktree lifecycle
state boundary, and its post-merge CI, E2E, CodeQL, and TruffleHog runs were
green. The only open pull requests, #28 through #30, form an owned updater
stack; no standalone issue supplied an unowned initiative.

Executable reproduction found that a hook payload with an explicit missing
`cwd` was treated like a payload without `cwd`. When the Python hook process
itself ran from another initialized project, profile injection exposed that
project's workflow and mutation handling advanced its durable generation.

Scores use the prescribed formula. Implementation confidence is shown for
decision quality but is not part of priority.

| Candidate | UV | Learn | Fit | Rel | DX | Diff | Conf | Test | Maint | Risk | Priority |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Reject invalid explicit hook workspaces | 9 | 8 | 10 | 10 | 8 | 7 | 10 | 10 | 2 | 2 | **67** |
| Invalidate evidence after checkout/reset | 9 | 9 | 10 | 10 | 8 | 8 | 9 | 9 | 4 | 4 | 64 |
| Make the Stop completion gate level-triggered | 9 | 8 | 10 | 10 | 7 | 7 | 9 | 10 | 3 | 3 | 64 |
| Reject symlink/special-file `.fable` roots | 9 | 9 | 10 | 10 | 7 | 7 | 8 | 9 | 4 | 4 | 61 |
| Enforce phase/current-skill state invariants | 8 | 7 | 10 | 9 | 7 | 6 | 8 | 10 | 4 | 4 | 57 |
| Preserve and compose pre-existing Git hooks | 8 | 8 | 9 | 9 | 9 | 6 | 7 | 9 | 5 | 6 | 55 |
| Serialize concurrent Python hook state updates | 8 | 9 | 9 | 9 | 6 | 8 | 6 | 8 | 7 | 7 | 53 |
| Isolate process-global cwd changes in CLI tests | 8 | 6 | 8 | 7 | 10 | 4 | 8 | 9 | 4 | 4 | 52 |
| Verify release-asset archive construction | 7 | 7 | 8 | 8 | 8 | 5 | 8 | 9 | 4 | 4 | 51 |
| Stabilize the macOS Doctor performance budget | 7 | 5 | 7 | 7 | 9 | 3 | 7 | 8 | 3 | 3 | 47 |

Checkout invalidation and the level-triggered Stop gate already have completed
local branches; updater work is owned by open PRs. Invalid explicit hook `cwd`
was selected as the highest-priority unowned defect. The accepted contract is:

1. A valid explicit `cwd` remains the state-discovery root.
2. An omitted `cwd` retains the process-directory compatibility fallback.
3. A present but invalid `cwd` performs no state discovery, injection,
   mutation, failure tracking, event journaling, spawn policy, or close policy.
4. No schema, CLI, manifest, dependency, or public TypeScript API changes.

## 2026-09-02 revalidation

Inspected `master` at `1827c39dd66cd0c02dd3da79131e196bebee6289`, version
`1.5.1`. Executable TypeScript and Python state use schema **v3** (the v2
statement in `AGENTS.md` is stale). PRs #31 and #32 are merged. The only open
PRs, #28 through #30, own the updater stack; no standalone issues were found.
Latest master CI, E2E, CodeQL and TruffleHog passed. The push Security workflow
skips Dependency Review; its PR-only repository configuration failure remains
separate from product verification.

The new DSH Cordis backend and React client reach core state through `src/dsh`.
They are additional consumers of the filesystem boundary, not grounds for
forking its state ownership. Canonical skills/registry, deterministic routing,
prompt compilation, mutation generations, typed completion evidence and recovery
remain the core architecture. Tests cover hooks, state/evidence, concurrency,
install/Doctor, routing, DSH and packaging. No runtime dependency was added by
this initiative.

Scores follow `2*UV + Rel + Fit + DX + Diff + Learn + Test - Cost - Risk`.
Implementation confidence is recorded but excluded from the calculation.

| Candidate | UV | Learn | Fit | Rel | DX | Diff | Conf | Test | Cost | Risk | Priority |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lifecycle symlink/special-file containment | 10 | 9 | 10 | 10 | 8 | 8 | 9 | 10 | 4 | 3 | **68** |
| Level-triggered Stop gate | 9 | 8 | 10 | 10 | 7 | 7 | 9 | 10 | 3 | 3 | 64 |
| Git checkout/reset freshness | 9 | 9 | 10 | 10 | 8 | 8 | 8 | 9 | 4 | 4 | 64 |
| DSH transaction/workspace-identity parity | 8 | 8 | 10 | 9 | 8 | 7 | 9 | 10 | 3 | 3 | 62 |
| Crash-safe mutation lock contention | 9 | 9 | 10 | 10 | 7 | 8 | 7 | 9 | 5 | 5 | 61 |
| DSH evidence-freshness status | 8 | 6 | 9 | 8 | 9 | 6 | 10 | 10 | 2 | 2 | 60 |
| Phase/currentSkill invariants | 8 | 8 | 10 | 9 | 7 | 7 | 8 | 10 | 4 | 4 | 59 |
| Preserve existing user Git hooks | 8 | 8 | 9 | 9 | 9 | 6 | 7 | 9 | 5 | 6 | 55 |

Selected: **lifecycle filesystem containment**, a reachable state-integrity
gap with no open owner. The historical local branch `3020211` is reference
material, not a safe patch to replay: it predates the journal consumer and
current cwd/worktree contracts, and its unsafe-root opt-out could allow Stop.

Accepted boundary: `.fable` must be a real directory; lifecycle leaves must be
regular files or absent. Validate before reading, locking, initialization or
repair, including journal append/compaction. Missing remains opt-out, unsafe
remains an explicit local boundary and blocks Stop. Preserve schema migrations,
normal initialization, worktree isolation and canonical workspace aliases.
The policy addresses static symlinks and special files; concurrent path swaps
and hard-link isolation remain outside the guarantee.

Future findings (static, not claimed fixed here): DSH route-and-apply uses
process cwd when initializing state for a configured project root and performs
read/modify/write without the core transaction; its status path reads fields
not present in the current state schema. Separate reproductions should precede
any DSH behavior changes. General active-Stop enforcement, Git reset freshness,
and lost mutation writes under lock contention also remain separate work.
