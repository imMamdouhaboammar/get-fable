---
name: fable-anti-slop-engineering
description: Prevent, detect, and repair AI coding slop and dirty engineering in repositories. Use for planning features, writing code, changing tests, reviewing pull requests, refactoring, hardening CI, debugging regressions, or auditing agent-generated changes. Enforces behavioral contracts, focused diffs, test integrity, repo conventions, security boundaries, and evidence-based completion.
version: 1.12.0
pack: proof
inputs:
  - task_specification
  - current_diff
requires:
  - codebase_access
produces:
  - slop_audit_report
  - diff_integrity_evidence
gates:
  - zero_slop_blockers
  - test_assertions_intact
fallback: fable-recover
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - fable-execute
    - fable-tdd
    - fable-verify
  continuations:
    - fable-review
    - fable-heal
    - fable-prove-it
  lateral_peers:
    - fable-scope-discipline
    - fable-native-code
  recovery: fable-recover
---

# Fable Anti-Slop Engineering

**Mission:** Deliver the smallest *coherent, correct, maintainable* change supported by independent evidence. Never trade contract integrity, security, or reviewability for a green CI badge. This skill applies to human and AI-authored changes equally.

## Purpose

Enforce professional software engineering standards, contract preservation, test integrity, and security boundaries across every coding round and lifecycle phase. Detects and blocks AI coding slop, weak/tautological assertions, skipped tests, swallowed exceptions, type suppressions, security bypasses, and unconstrained diff bloat before code is committed or merged.

## When to Use

- Planning or implementing features and bug fixes where existing contracts must remain intact.
- Modifying test assertions, test fixtures, snapshots, or golden datasets.
- Reviewing pull requests and diffs for hidden regressions, cheat patterns, or bloat.
- Running pre-commit, pre-push, and lifecycle completion gates across all coding sessions.
- Auditing agent-generated code for silent error swallowing, mock overuse, UI dev-notes leakage, or security boundary escapes.
- **NOTED_SLOP:** Codifying newly observed AI slop into a diagnostic catalog pattern, agent directive, and automated diff guard heuristic.

## When NOT to Use

- NOT for speculative, unverified rewrites or large-scale re-architecting without a proven baseline contract.
- NOT for stylistic nitpicking or formatting bikeshedding that has zero bearing on behavioral contracts.
- NOT as a substitute for executable test suites, real dynamic testing, or penetration scanning.

## Inputs

- `task_specification`: User requirements, issue brief, or acceptance criteria.
- `current_diff`: Unified git diff against base ref (or file tree for clean code check).
- `repository_context`: Existing test suites, architecture contracts, error handling idioms, and security policies.

## Expected Outputs

- `slop_audit_report`: Structured audit report classifying findings into Blocker, Review, and Warning tiers with exact file and line citations.
- `diff_integrity_evidence`: Fresh passing verification evidence proving zero slop blockers in the active diff.
- `sarif_report`: Standard SARIF 2.1.0 output for CI/CD integration and automated code scanning.

## Procedure

Execute the 7-Gate Anti-Slop Protocol on every coding round:

1. **Gate 0 (Discover):** Inspect repository architecture, package manifests, lockfiles, existing tests, and conventions. Never improvise conventions.
2. **Gate 1 (Scaffolding & Dependency Sanity):** For new projects or modules, use official generators (`uv init`, `cargo init`, `bun create`). For new dependencies, resolve and pin the latest stable release.
3. **Gate 2 (Lock Test Baseline):** Inspect existing tests before editing. Protect assertions; never weaken tests to match buggy behavior.
4. **Gate 3 (Implement Surgically):** Modify existing abstractions. Minimal justified complexity; no parallel duplicate abstractions; zero dev-notes or meta-dialogue in UI components.
5. **Gate 4 (Verify Beyond Green):** Exercise real unit/integration/contract suites. Treat coverage and lint as signals, not proof.
6. **Gate 5 (Scan Diff with Native Engine):** Run `get-fable anti-slop --base HEAD --fail-on-blocker` or `fable-anti-slop scan`.
7. **Gate 6 (Evidence & Decision):** Emit explicit merge verdict (PASS / REVIEW / REWORK / BLOCK) backed by machine-checked evidence.

## Decision Rules

- **BLOCK (Fail Closed):** Any test disabled/skipped without approval, weakened assertions, swallowed exceptions in production paths, dev notes / mock apologies leaked in UI components (`DEV_NOTE_IN_UI`), disabled authentication or security checks, hardcoded credentials, or broken build. Exit code 2.
- **REWORK:** Unnecessary code duplication, unjustified new dependencies, tests testing implementation details rather than contracts, unreviewed generated artifact churn.
- **REVIEW:** Diffs exceeding 400 added lines, type suppressions (`any` or `@ts-ignore`), or justified contract updates.
- **PASS:** All acceptance criteria satisfied, zero blocker findings, passing fresh tests, and clean focused diff.

## Tool Policy

- Read-only tools preferred for discovery and review phases.
- Native anti-slop engine (`fable-anti-slop`) invoked on unified git diffs with `--fail-on-blocker`.
- Do not use shell execution to bypass pre-commit hooks (bypassing verification flags is strictly prohibited).

## Evidence Requirements

- Machine-checked output from `fable-anti-slop scan --base HEAD --fail-on-blocker --json-v1` or `get-fable anti-slop`.
- Fresh passing test evidence recorded via `get-fable evidence pass test ...`.
- Verifiable diff statistics (`git diff --stat`) demonstrating bounded changes.

## Failure Handling

- If blocker slop findings are detected: do NOT bypass or rebaseline. Identify the root cause, revert the slop pattern, restore test assertions, and re-run the scan.
- If failure streak reaches 2: route to `fable-recover` immediately to diagnose environmental or execution path faults.

## Completion Criteria

- `fable-anti-slop` scan completes with status `passed` (0 blockers).
- All modified and new tests pass on the real runtime.
- Fresh evidence recorded in `.fable/state.json` matching current `mutationGeneration`.

## Operating priorities

1. Explicit user requirements, repository architecture, security policy, and existing public contracts outrank aesthetic preferences.
2. Preservation of authorized existing behavior outranks making a new implementation pass its own tests.
3. Prove behavior before polishing style; fix correctness and security blockers before cosmetic issues.
4. Minimize **unnecessary** complexity, not required tests, safety checks, or clarity. A short but incorrect solution fails.
5. Do not declare a finding without file/line evidence and an impact story. Never invent tool results or test runs.
6. Never change or approve unrelated code, tests, policies, dependencies, CI, or infra merely to make the current request pass.

## Non-negotiable anti-cheating rules

- Do not change a test's expected output to match the observed buggy output unless the new output is explicitly authorized by product contract.
- Do not delete, skip, xfail, downgrade, mock away, or suppress a failing test to conceal a failure.
- Do not use fake logs, fabricated benchmarks, imagined browser screenshots, test results, or invented source references.
- Do not weaken lint/type/security/branch protection/CI policies simply to achieve success.
- Do not modify lockfiles, dependencies, formatting, codegen, database schemas, or test fixtures as collateral damage.
- Do not replace a targeted fix with a full rewrite without evidence and scope approval.
- Do not over-restrict legitimate design: duplication in readable tests can be preferable to an unreadable abstraction, and a larger implementation can be necessary for correct safety boundaries.
- Do not render dev-notes, internal TODOs, mock data disclaimers, or notes intended for other agents inside user-facing components or client DOM.
- Do not crowd interfaces with wall-of-text microcopy, over-instruction, compulsive decorative widgets, or congested navbars; preserve visual restraint, optical balance, and breathing room.
- Do not hand-craft boilerplate or build configs from memory when official CLI generators exist (`uv init`, `cargo init`, `bun create`, official SDK quickstarts); invoke official scaffolding tools first.
- Do not guess outdated or pre-cutoff library versions from model memory; resolve and pin the latest stable release from the official registry when introducing new dependencies.

## Deliverable contract

For each implementation/review, produce a concise report in this order: **Outcome; Scope; Behavior preserved/changed; Verification (commands + results); Findings with exact file/line; Test modifications with rationale; Risks/limitations; Merge recommendation.** If available, distinguish baseline failures from new failures. Use `NOT RUN` and `UNKNOWN` literally when applicable.

## Progressive Resources

- [Anti-Pattern Catalog](references/anti-pattern-catalog.md) — Exhaustive directory of AI coding anti-patterns with before/after fixes.
- [Test Integrity Policy](references/test-integrity.md) — Rules for assertion preservation, boundary testing, and test refactoring.
- [PR Review Protocol](references/pr-review.md) — Skeptical reviewer checklist and structured finding templates.
- [Security & Operations](references/security-and-operations.md) — Trust boundaries, credential hygiene, and operational safety.
- [Engineering Judgment](references/engineering-judgment.md) — Context-aware exception criteria and design tradeoffs.
- [Evidence & Sources](references/evidence-and-sources.md) — Concrete proof hierarchies and verification standards.
- [Evaluation Cases](references/evaluation-cases.md) — Real-world evaluation benchmark cases.
- [PR Review Template](templates/PR_REVIEW_TEMPLATE.md) — Reusable PR review markdown template.
- [Run Report Template](templates/RUN_REPORT_TEMPLATE.md) — Reusable implementation run report template.
