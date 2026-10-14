# Frontier Execution Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular, inspectable runtime that routes substantial work through discovery, planning, execution, verification, and recovery with durable state and evidence gates.

**Architecture:** Keep root `skills/` as the canonical workflow source. Add a small TypeScript core for registry validation, routing, state transitions, evidence policy, prompt compilation, and diagnostics. Host integrations consume that core or canonical skill pack instead of owning divergent workflow copies.

**Tech Stack:** Bun, TypeScript, JSON registry/state, existing Python lifecycle hooks, Bun test, GitHub Actions.

## Global Constraints

- Preserve existing explicit-install safety and skip-if-present behavior.
- Do not claim model equivalence or hidden model capability.
- Do not declare an MCP/app companion that is not implemented.
- Do not add runtime npm dependencies.
- Keep the request proxy local-first and preserve the original system prompt.

---

### Task 1: Define maturity behavior with failing tests

**Files:**
- Create: `test/maturity.test.ts`
- Modify: `test/router.test.ts`

**Interfaces:**
- Consumes: existing `runCli`, `initProjectFable`, request proxy
- Produces: executable contracts for routing, doctor/status JSON, canonical state, and compact prompt injection

- [ ] Add tests that require project init to create `.fable/state.json` and all canonical project skills.
- [ ] Add CLI tests for `route`, `doctor --json`, and `status --json`.
- [ ] Add router test proving selected-skill metadata and compact directive injection.
- [ ] Run CI and confirm the tests fail because the new behavior does not exist.

### Task 2: Add canonical skill registry and discovery skill

**Files:**
- Create: `skills/registry.json`
- Create: `skills/fable-discover/SKILL.md`
- Modify: `skills/get-fable/SKILL.md`
- Modify: `skills/fable-plan/SKILL.md`
- Modify: `skills/fable-execute/SKILL.md`
- Modify: `skills/fable-verify/SKILL.md`
- Modify: `skills/fable-recover/SKILL.md`

**Interfaces:**
- Produces: stable skill IDs, phases, transition targets, routing hints

- [ ] Define the six-skill ordered graph and allowed transitions.
- [ ] Remove overlapping instructions from specialist skills and keep each skill single-purpose.
- [ ] Make `get-fable` the only entry skill and point it at the registry contract.

### Task 3: Implement core registry, router, state, evidence, and compiler

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/skill-registry.ts`
- Create: `src/core/task-router.ts`
- Create: `src/core/state.ts`
- Create: `src/core/prompt-compiler.ts`
- Create: `src/core/doctor.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `loadSkillRegistry`, `routeTask`, `createInitialState`, `transitionState`, `readFableState`, `writeFableState`, `compileFableDirective`, `runDoctor`

- [ ] Load and validate the canonical registry without runtime dependencies.
- [ ] Implement deterministic weighted routing with recovery and verification precedence.
- [ ] Implement schema-v1 state and strict allowed transitions.
- [ ] Require passing evidence before substantial-work completion.
- [ ] Compile a compact directive from core contract + selected skill + relevant state.
- [ ] Implement machine-readable diagnostics.

### Task 4: Wire project initialization and host adapters to the canonical skills

**Files:**
- Modify: `src/installer.ts`
- Modify: `test/installer.test.ts`

**Interfaces:**
- Consumes: root `skills/`, state factory
- Produces: project-local canonical skills and initial state

- [ ] Copy each canonical skill into `.agents/skills/<id>/SKILL.md` with skip-if-present semantics.
- [ ] Create `.fable/state.json` only when absent.
- [ ] Keep historical asset bundles optional instead of copying them as the default workflow pack.
- [ ] Preserve existing Claude/Gemini hook idempotency.

### Task 5: Add route, doctor, and JSON status CLI contracts

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/installer.ts`
- Modify: `test/cli.test.ts`

**Interfaces:**
- Produces: `route`, `doctor`, `status --json`

- [ ] `route` prints selected skill, confidence, reasons, and transitions.
- [ ] `doctor --json` prints a stable report and returns nonzero only for error-severity checks.
- [ ] `status --json` returns machine-readable host/project state without ANSI output.

### Task 6: Replace static proxy prompt injection with contextual compilation

**Files:**
- Modify: `src/router/index.ts`
- Modify: `test/router.test.ts`

**Interfaces:**
- Consumes: latest normalized user message and prompt compiler
- Produces: request-specific Fable directive and routing metadata

- [ ] Extract the latest user intent from normalized messages.
- [ ] Compile only the selected skill plus short core contract.
- [ ] Preserve the caller's original system prompt.
- [ ] Return routing metadata in preview mode without exposing private reasoning.

### Task 7: Strengthen lint, docs, and CI contract

**Files:**
- Modify: `src/fable-lint.ts`
- Modify: `test/fable-lint.test.ts`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PLUGIN.md`
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`

**Interfaces:**
- Produces: documented maturity contract and package validation

- [ ] Validate state/registry consistency when `.fable/state.json` exists.
- [ ] Document frontier-like execution discipline accurately.
- [ ] Pin Bun to a supported version range through package metadata and CI instead of `latest`.
- [ ] Add direct plugin/state/registry validation to CI.

### Task 8: Final verification and review

- [ ] Run full GitHub Actions gate on the final head.
- [ ] Review the PR diff for dead routing, path traversal, unsafe config writes, prompt bloat, and unsupported claims.
- [ ] Confirm npm dry-run includes the canonical registry and skills.
- [ ] Keep PR #4 ready for review after the final green head.
