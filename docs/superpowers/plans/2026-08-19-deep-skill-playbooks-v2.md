# Deep Skill Playbooks V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen the core get-fable Skills into decision-rich operational playbooks with deeper progressive resources and semantically broader behavioral evals.

**Architecture:** Preserve existing Skill IDs/frontmatter/runtime contracts while upgrading the instructional layer. Each core Skill gains situation classification, branching decision rules, failure taxonomy, anti-patterns, evidence-rich handoffs, and deeper references. Evals expand from narrow single-scenario coverage to multiple scenario families so old behavioral evidence becomes stale and must be re-earned.

**Tech Stack:** Markdown Skill packages, JSON eval corpora, Bun/TypeScript validation and behavior-eval tooling.

**Spec:** `docs/superpowers/specs/2026-08-19-deep-skill-playbooks-v2-design.md`

## Global Constraints

- Preserve existing Skill IDs and public frontmatter field names.
- Preserve router/install/host compatibility.
- Do not weaken behavioral thresholds to recover M4.
- New eval breadth must invalidate older provider evidence naturally through corpus hashing.
- Keep SKILL.md decision-oriented; move deep domain material into `references/`.
- Avoid provider-specific tool names in canonical Skill logic.

---

### Task 1: Raise the authoring quality bar in skill-creator

**Files:**
- Modify: `skills/skill-creator/SKILL.md`
- Create: `skills/skill-creator/references/depth-standard-v2.md`
- Modify: `skills/skill-creator/evals/scenarios.json`

**Interfaces:**
- Consumes: existing Skill Package schema and registry conventions.
- Produces: a reusable V2 authoring standard for all subsequent Skill upgrades.

- [ ] Expand the Skill contract to require classification, decision tables, failure taxonomy, anti-patterns, handoffs, and semantic eval breadth.
- [ ] Add adversarial authoring scenarios that reject shallow checklists and duplicate references.
- [ ] Ensure existing packaging contracts remain unchanged.

### Task 2: Deepen discovery and research

**Files:**
- Modify: `skills/fable-discover/SKILL.md`
- Modify/Create: `skills/fable-discover/references/*`
- Modify: `skills/fable-discover/evals/scenarios.json`
- Modify: `skills/fable-research/SKILL.md`
- Modify/Create: `skills/fable-research/references/*`
- Modify: `skills/fable-research/evals/scenarios.json`

**Interfaces:**
- Produces: evidence packets with unresolved-unknown ledgers and source/version confidence for planning.

- [ ] Add repository topology, runtime path, generated-code/plugin/config discovery branches.
- [ ] Add research source hierarchy, version reconciliation, contradiction handling, and stop rules.
- [ ] Add multiple semantic eval families for each Skill.

### Task 3: Deepen planning and delegation

**Files:**
- Modify: `skills/fable-plan/SKILL.md`
- Modify/Create: `skills/fable-plan/references/*`
- Modify: `skills/fable-plan/evals/scenarios.json`
- Modify: `skills/fable-delegate/SKILL.md`
- Modify/Create: `skills/fable-delegate/references/*`
- Modify: `skills/fable-delegate/evals/scenarios.json`

**Interfaces:**
- Produces: dependency-aware work cards and delegation contracts with integration ownership.

- [ ] Replace file-disjointness-only logic with dependency, integration, rollback, and blast-radius analysis.
- [ ] Add parallelism rejection rules for shared invariants and integration hotspots.
- [ ] Add scenarios for migrations, shared contracts, partial parallelism, and worker failure.

### Task 4: Deepen TDD and bounded execution

**Files:**
- Modify: `skills/fable-tdd/SKILL.md`
- Modify/Create: `skills/fable-tdd/references/*`
- Modify: `skills/fable-tdd/evals/scenarios.json`
- Modify: `skills/fable-execute/SKILL.md`
- Modify/Create: `skills/fable-execute/references/*`
- Modify: `skills/fable-execute/evals/scenarios.json`

**Interfaces:**
- Produces: red/green evidence, touched-surface ledger, acceptance receipts, and explicit residual risk.

- [ ] Add test-level selection, wrong-red detection, legacy seams, flaky/concurrency handling, and escape hatches.
- [ ] Add execution rules for owned scope, dependency surprises, generated files, partial acceptance, and rollback.
- [ ] Expand evals before considering the Skills re-proven.

### Task 5: Deepen verification and review

**Files:**
- Modify: `skills/fable-verify/SKILL.md`
- Modify/Create: `skills/fable-verify/references/*`
- Modify: `skills/fable-verify/evals/scenarios.json`
- Modify: `skills/fable-review/SKILL.md`
- Modify/Create: `skills/fable-review/references/*`
- Modify: `skills/fable-review/evals/scenarios.json`

**Interfaces:**
- Produces: fresh verification matrices and evidence-grounded review findings.

- [ ] Add affected-surface selection, test pyramid reasoning, nondeterminism detection, runtime probes, and evidence freshness rules.
- [ ] Add behavior-delta, invariant, concurrency, compatibility, performance, error-propagation, and test-adequacy review passes.
- [ ] Add adversarial scenarios where superficial green checks or cosmetic review would be wrong.

### Task 6: Deepen recovery and release

**Files:**
- Modify: `skills/fable-recover/SKILL.md`
- Modify/Create: `skills/fable-recover/references/*`
- Modify: `skills/fable-recover/evals/scenarios.json`
- Modify: `skills/fable-release/SKILL.md`
- Modify/Create: `skills/fable-release/references/*`
- Modify: `skills/fable-release/evals/scenarios.json`

**Interfaces:**
- Produces: falsified hypothesis queues, bounded repair cards, and release attestations tied to exact artifact/tag/commit state.

- [ ] Expand recovery into reproduce/classify/isolate/hypothesize/instrument/falsify/bisect/revise.
- [ ] Expand release into artifact diff, clean-install smoke, semver reasoning, registry/tag verification, rollback and post-release checks.
- [ ] Add scenarios for stale builds, environment mismatch, cached execution, incorrect package contents, and release-state mismatch.

### Task 7: Validate corpus and maturity behavior

**Files:**
- Modify tests only if required by stronger corpus invariants.
- Inspect: `src/core/agent-behavior-eval.ts`, `src/core/maturity.ts`, `test/maturity-evidence.test.ts`.

**Interfaces:**
- Consumes: expanded per-Skill scenario corpora.
- Produces: deterministic proof that old scored evidence becomes stale rather than silently retaining maturity.

- [ ] Run generated/catalog checks and behavioral export.
- [ ] Confirm request count increases and corpus hash changes.
- [ ] Confirm old `evals/results/agent-behavior-v1.json` is rejected as stale until a real provider rerun.
- [ ] Do not weaken thresholds or rewrite evidence to manufacture M4.

### Task 8: Review and integration

**Files:**
- Review all changed Skill packages and generated docs/catalogs affected by metadata changes.

**Interfaces:**
- Produces: a reviewable PR from `feat/deep-skill-playbooks-v2` into `master`.

- [ ] Run `bun run check` when an execution environment is available.
- [ ] Run Skill/package validation and behavior-eval export.
- [ ] Open PR with explicit note that external provider re-evaluation is required before claiming restored M4 for changed Skills.
- [ ] Merge only after deterministic CI is green and review finds no blocking contract regressions.
