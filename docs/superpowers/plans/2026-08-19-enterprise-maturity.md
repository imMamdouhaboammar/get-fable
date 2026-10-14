# get-fable Enterprise Maturity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task. Every behavioral change uses a red, green, refactor cycle.

**Goal:** Make get-fable evidence-driven, portable, security-bounded, and release-ready without rebuilding working architecture

**Architecture:** Keep `skills/get-fable/registry.json` as the single authoring source for canonical Skill identity and lifecycle metadata. Generate compatibility catalogs and compile-time TypeScript metadata deterministically, then make maturity depend on executed evidence rather than resource presence. Preserve deterministic routing and compact prompt compilation while deepening package, state, installer, proxy, eval, host, CI, and release interfaces.

**Tech Stack:** Bun 1.3.x, TypeScript, Node.js v24 filesystem APIs, Python lifecycle hooks, GitHub Actions, npm Trusted Publishing

**Spec:** user enterprise maturity program plus `AGENTS.md`, `SECURITY.md`, `CONTRIBUTING.md`

## Global Constraints

- Current HEAD `2d96b3d8275c79b70b5f30f33571b57a085feca4` is baseline truth
- Preserve pre-existing `.gitignore` modification and untracked `package-lock.json`
- Branch: `enterprise/maturity-20260819`
- No publish, protected-branch merge, credential rotation, or irreversible external mutation
- Bun floor remains `>=1.3.0`; CI reference runtime is 1.3.14
- Deterministic routing and deterministic Spark remain authoritative
- AgentProof receipts, if available, prove provenance only
- No M4 or M5 claim without executed evidence and thresholds

## Architecture decisions

1. Canonical Skill identity: `skills/get-fable/registry.json`
2. Generated: `src/generated/skill-catalog.ts`, `registry/skills.json`, pack membership compatibility files, generated maturity/docs tables where safe
3. Compatibility-only: mirrored registry/catalog files and legacy `fable-mode` host assets
4. Runtime-owned: registry loader, router, state, package runtime, Spark, prompt compiler, eval runner, doctor
5. Developer-only: tests, holdouts, fuzz/soak fixtures, plan/spec files, release dry-run helpers
6. npm shipment: runtime, canonical packages, host/plugin assets, schemas, policies, public docs; developer-only holdouts remain excluded unless intentionally exposed
7. Maturity: M0 surfaced, M1 structured, M2 contract-valid, M3 runtime-integrated, M4 thresholds passed, M5 enterprise gates passed
8. Holdouts: root `evals/holdouts/`, excluded from skill-authored tuning inputs and reported separately by the eval runner
9. Evidence revision: generation plus workspace plus git revision/tree when available, command category, scope, result, timestamp
10. Concurrent state writers: lock file plus state revision compare-and-swap semantics and atomic replacement
11. Package resources: strict manifest v2, canonical segment containment, realpath containment, quotas, no implicit script execution
12. Optional providers: capability interfaces with vendor adapters outside canonical Skill logic
13. Hosts: explicit FULL/PARTIAL/ADVISORY/UNSUPPORTED capability matrix based on tested installer behavior
14. Release trust: GitHub-hosted release job, OIDC Trusted Publishing, protected npm environment, no long-lived npm token
15. Enterprise Ready: all acceptance gates with fresh current-revision evidence, no unresolved high-confidence review findings

### Task 1: Canonical catalog and deterministic generation

**Files:** create `scripts/generate-catalog.ts`, `src/generated/skill-catalog.ts`, `test/catalog-generation.test.ts`; modify `src/core/types.ts`, `src/core/skill-registry.ts`, `src/core/state.ts`, `src/core/task-router.ts`, `src/core/skill-installer.ts`, `package.json`

**Interfaces:** `canonicalSkillIds(): FableSkillId[]`, generated `CANONICAL_SKILLS`, `SKILL_PHASE`, `SKILL_PACK`, `FABLE_PACKS`; `bun run generate:catalog`; `bun run check:generated`

- [ ] Write tests proving a registry edit changes generated output and drift fails
- [ ] Run focused test and observe failure because generator is absent
- [ ] Implement deterministic generator and replace manual catalog duplication
- [ ] Run focused tests, typecheck, router tests, state tests
- [ ] Verify generated output is stable across two runs

### Task 2: Skill Package Contract v2 and resource trust

**Files:** modify `schemas/skill-package.schema.json`, `src/core/types.ts`, `src/core/skill-package.ts`, all `skills/*/skill.package.json`; create `test/skill-package-security.test.ts`

**Interfaces:** strict `schemaVersion: 2`; `validateSkillPackage`; `listSkillResources`; bounded `readSkillResource`; explicit script metadata remains inert data

- [ ] Add failing tests for unknown fields, string versions, duplicate resources, extension mismatch, Windows/encoded traversal, symlink escapes, directories, broken links, quotas and oversize resources
- [ ] Observe expected failures
- [ ] Implement strict parser parity and quotas: max 128 resources, max 1 MiB/resource, max 8 MiB/package, max depth 8, max manifest 256 KiB
- [ ] Reject symlinks/special files and use canonical path segments plus realpath containment
- [ ] Define scripts as declared but non-executable data unless an explicit future executor authorizes them
- [ ] Run all package tests and package validation

### Task 3: Progressive disclosure resource interface

**Files:** create `src/core/skill-resources.ts`, `test/skill-resources.test.ts`; modify `src/core/prompt-compiler.ts`

**Interfaces:** `listRelevantSkillResources(id, options)`, `inspectSkillResource(id,path)`, `readSelectedSkillResource(id,path,{maxBytes})`

- [ ] Add failing tests for category filtering, deterministic ordering, byte budgets, and no automatic full-resource injection
- [ ] Implement the small resource interface with reference/template/example/policy selection only
- [ ] Measure compiled prompt bytes before/after and assert bounded overhead

### Task 4: Unified eval runner and evidence-backed maturity

**Files:** create `src/core/eval-runner.ts`, `src/core/maturity.ts`, `schemas/eval-result.schema.json`, `test/eval-runner.test.ts`, `test/maturity-evidence.test.ts`; reorganize root eval ownership without deleting historical source

**Interfaces:** `runEvaluationSuite`, `runRoutingBenchmark`, `runSparkBenchmark`, `computeEvidenceBackedMaturity`; machine-readable result schema v1

- [ ] Freeze root holdouts before router/Spark intervention and hash their files
- [ ] Add failing tests proving presence-only eval files cannot yield M4
- [ ] Implement known/negative/trap/holdout ownership and machine-readable results
- [ ] Add thresholds for routing accuracy, negative precision, false positives/negatives, Spark top-1, silence precision, unsafe action rate, host parity, package validation and context overhead
- [ ] Produce confusion matrix and before/after metrics

### Task 5: Feed semantics and Doctor truthfulness

**Files:** modify `src/core/feed.ts`, `src/core/doctor.ts`, `src/core/types.ts`, tests

**Interfaces:** feed fields `sourceAvailable`, `installedInTarget`, `packageValid`, `runtimeIntegrated`, `behaviorallyProven`, `enterpriseReady`; Doctor statuses PASS/WARN/ERROR/NOT_APPLICABLE/NOT_CHECKED

- [ ] Add failing tests for source vs target installation and non-M4 default
- [ ] Load eval metadata through manifests, not hardcoded scenario paths
- [ ] Remove structural claims that imply behavioral proof
- [ ] Add generated drift, schema/runtime parity, maturity freshness, host parity, distribution and release checks

### Task 6: State concurrency, crash safety and revision-aware evidence

**Files:** modify `src/core/state.ts`, `schemas/state.schema.json`, Python shared hook state helper, tests

**Interfaces:** `stateRevision`; `withStateTransaction(targetDir, mutator)`; evidence revision metadata

- [ ] Add failing concurrent-writer and crash/corrupt-state tests
- [ ] Implement exclusive lock acquisition with bounded stale-lock recovery and CAS state revision
- [ ] Preserve atomic replacement and never silently rewrite foreign workspace IDs
- [ ] Add migration tests and rollback-safe schema evolution
- [ ] Bind evidence to workspace, generation and revision when available

### Task 7: Installer byte safety and host contract matrix

**Files:** modify `src/core/skill-installer.ts`, `src/installer.ts`, `hosts/README.md`; create `src/core/host-contract.ts`, tests/fixtures

**Interfaces:** one recursive package copy primitive preserving bytes and safe permissions; host capability enum FULL/PARTIAL/ADVISORY/UNSUPPORTED

- [ ] Add failing binary-copy, symlink, overwrite, containment, rollback and isolated-host tests
- [ ] Replace UTF-8 package copy with byte-safe `copyFileSync`
- [ ] Reject unsupported special files and destination escapes
- [ ] Preserve approved executable modes only where required
- [ ] Publish measured host matrix without model/version claims

### Task 8: Request proxy security

**Files:** modify `src/router/index.ts`, `SECURITY.md`, `test/router-security.test.ts`

**Interfaces:** validated upstream policy, non-loopback bind policy, redirect policy, body/response/time limits

- [ ] Add failing SSRF/private-target, redirect-auth, response-limit and non-loopback tests
- [ ] Reject unsafe upstream hosts by default and disable automatic redirects
- [ ] Never forward Authorization across an origin change
- [ ] Require explicit proxy auth configuration before non-loopback binding
- [ ] Bound upstream response bytes and concurrent requests

### Task 9: Telemetry/privacy

**Files:** modify `src/core/telemetry.ts`, README/SECURITY privacy text, tests

**Interfaces:** local telemetry defaults disabled, bounded JSONL rotation, validated event allowlist

- [ ] Add failing default-off, corrupt-config, rotation, concurrency and sensitive-field tests
- [ ] Implement safe defaults, maximum log size, retention and atomic config updates
- [ ] Keep command execution independent of telemetry failures

### Task 10: Optional provider capability seams

**Files:** create `src/integrations/providers.ts`, modify `integrations/README.md`, export only stable capability interfaces as intended

**Interfaces:** `CurrentSearchProvider`, `ExecutionReceiptProvider`, `SecurityEvidenceProvider`, `RepositoryProvider`, `BrowserEvidenceProvider`

- [ ] Add contract tests using in-memory adapters
- [ ] Keep Skills dependent on capabilities, not vendors
- [ ] Mark absent vendor adapters accurately instead of describing nonexistent directories as implemented

### Task 11: CI, security CI and release trust

**Files:** modify `.github/workflows/ci.yml`; create `.github/workflows/security.yml`, `.github/workflows/release.yml`, `.github/dependabot.yml`, release verification tests

**Interfaces:** frozen Bun install, immutable action SHAs, least privilege, dry-run package/release verification; no publish during this task

- [ ] Pin third-party actions to verified full SHAs with version comments
- [ ] Use `bun install --frozen-lockfile`
- [ ] Add focused CodeQL/security checks without overlapping scanner noise
- [ ] Configure Dependabot for npm and GitHub Actions
- [ ] Add Trusted Publishing release workflow using `id-token: write`, Node 24, npm >=11.5.1 and protected environment, guarded to tagged release only
- [ ] Validate workflows statically and run local release dry run only

### Task 12: Distribution, public contracts, governance and docs

**Files:** modify `package.json`, README, SECURITY, CONTRIBUTING; add compatibility/release/support/governance files only where missing

**Interfaces:** deliberate Bun-only public API/CLI contract, schema-versioned JSON outputs, intentional package files list

- [ ] Resolve root `eval/` vs `evals/` shipping policy
- [ ] Inspect npm tarball and assert intended contents
- [ ] Remove stale fixed counts and generated-doc drift
- [ ] Add CODEOWNERS/CHANGELOG/support/release policy/templates only when absent
- [ ] Mark organization-level settings NOT SHOWN with a repository settings checklist

### Task 13: Soak, fuzz, performance and final review

**Files:** add bounded tests/benchmarks under `test/enterprise/` and eval outputs under ignored/generated evidence directory

**Interfaces:** reproducible soak/fuzz commands and budget report

- [ ] Exercise many mutations/evidence records, reloads, failures and concurrent workers
- [ ] Property-test manifest/path/state/router parsers with invariants
- [ ] Measure routing, package loading, doctor, lint, prompt compile, Spark and init budgets
- [ ] Run full verification after the final mutation
- [ ] Run CodeRabbit review, triage findings, fix valid findings, rerun affected verification
- [ ] Capture AgentProof receipts if the available integration supports them

## Rollback strategy

Each batch remains independently revertible on `enterprise/maturity-20260819`. Generated artifacts are recreated from the canonical registry, state schema keeps explicit migration, package manifest v1 handling is explicit rather than silently accepted, release workflow is non-publishing until external npm trusted-publisher configuration is authorized, and no protected branch or package registry is mutated.
