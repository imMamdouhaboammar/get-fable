---
name: fable-test
metadata:
  internal: true
audience: consumer
version: 1.0.0
pack: proof
phase: verifying
description: "Orchestrate, author, and verify comprehensive automated tests in any application codebase. Discovers project stack, enforces the 9 universal Test-Guard anti-bloat rules (behavior over implementation, justified mocks, sacred regressions), evaluates test value with the 3-question calculus, and dispatches to specialized tools (TDD, visual E2E with Midscene, API replay with Keploy, and anti-slop AST inspection). Use whenever writing tests, running test suites, diagnosing test failures, or setting up test architecture in user projects (e.g. \"اختبر المشروع\", \"اكتب اختبارات\", \"run tests\", \"verify test coverage\")."
inputs:
  - test_scope
  - repository_context
requires:
  - test_runner
produces:
  - test_execution_report
  - test_evidence
gates:
  - machine_checked
  - no_skipped_tests
  - tests_executed_gt_zero
fallback: fable-recover
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - fable-execute
    - fable-tdd
    - get-fable
  continuations:
    - fable-verify
    - fable-review
    - fable-release
  lateral_peers:
    - fable-anti-slop-engineering
    - fable-tdd
  recovery: fable-recover
---

# Fable Test: Universal Quality Engineering & Testing Harness

Orchestrate, author, and verify robust automated testing suites in any consumer application codebase.

---

## Mission

Transform ad-hoc or hallucinated testing into an autonomous, rigorous, and deterministic quality engineering pipeline. `fable-test` serves as the universal testing orchestrator for developers and AI agents across four stages:
1. **Stack & Topology Discovery**: Automatically inspect the project to identify runtimes, test frameworks, and boundary layers.
2. **Test-Guard Rules Enforcement**: Eliminate AI-generated test bloat by applying 9 universal testing discipline rules.
3. **Test-Value Calculus**: Validate each test's economic justification and protect against zero-selection false positives.
4. **Tool & Skill Dispatch**: Orchestrate TDD workflows, visual E2E testing, API replay virtualization, and AST quality checks.

---

## Activation Contract

### Activate When
- User asks to test the project, add tests, or verify behavior: *"اختبر المشروع"*, *"run tests"*, *"test this feature"*, *"add tests for X"*.
- Agent needs to assess existing test coverage or diagnose test suite failures.
- Designing or auditing test architecture for a service, API, or frontend application.

### Do Not Activate When
- Driving a single behavior change via test-first red-green-refactor during implementation -> use `fable-tdd`.
- Performing the mandatory final gating check before session completion -> use `fable-verify`.
- Performing security penetration testing against external targets -> use `fable-redteam`.
- Testing `get-fable`'s own internal engine crates (maintainer only) -> use `fable-core-test`.

---

## The 4-Stage Autonomous Testing Protocol

### Stage 1: Stack & Topology Discovery
Before authoring or running tests, determine the host project's conventions per [Stack Discovery](references/stack-discovery.md):
1. **Detect Test Runner**:
   - TypeScript/JavaScript: `bun test`, `vitest run`, or `jest`.
   - Python: `pytest` or `uv run pytest`.
   - Go: `go test ./...`.
   - Rust: `cargo test`.
   - PHP: `./vendor/bin/pest` or `./vendor/bin/phpunit`.
2. **Identify System Boundaries**: Locate external network calls, database clients, async message queues, and third-party APIs.

### Stage 2: The 9 Universal Test-Guard Rules
Every generated or modified test must comply with [Test-Guard Rules](references/test-guard-rules.md):
1. **Test Behavior, Not Implementation**: Assert observable outputs and state changes from the caller's perspective. Never assert internal helper call counts.
2. **Every Mock Must Be Justified**: Mock strictly at system boundaries (network, external storage, clocks, third-party APIs). Never mock internal domain logic.
3. **One Scenario Per Test**: Merge repetitive tests into parameterized data-driven suites.
4. **Justify Existence**: Every test must answer: *"What specific defect does this catch that no other test catches?"*
5. **Semantic Scenario Naming**: Use `test_<scenario>_<expected_outcome>`.
6. **Regression Tests Are Sacred**: Incident repro tests are permanent; never delete or weaken them.
7. **No Tests for Framework Guarantees**: Test application business logic, not library defaults.
8. **State & Value Objects Are Real**: Never mock DTOs or entities; use real instances and data factories.
9. **Infrastructure Under Test Gets Real Infrastructure**: Persistence tests must run against real database instances (e.g. test DB container).

### Stage 3: Test-Value Correctness & Zero-Selection Guard
Evaluate the test suite against [Test-Value Calculus](references/test-value-calculus.md):
1. **The 3-Questions Calculus**:
   - *Which concrete mistake fails this test, and what loss would it cause?*
   - *Would an equivalent refactor fail?* (Detect and eliminate brittle tests).
   - *Does added protection justify ongoing maintenance cost?*
2. **Zero-Selection Violation Check**: Ensure that executed test commands report `tests_executed >= 1`. Never accept exit code 0 when zero tests were matched.

### Stage 4: Specialized Tool & Skill Dispatch
Dispatch to specialized Fable tools per [Tool Dispatch](references/tool-dispatch.md):
- **Test-First Development**: Route to `fable-tdd` when creating new features or fixing bugs.
- **Visual AI GUI Testing**: Run `get-fable test-engine run --tool midscene` for vision-based browser testing without fragile CSS selectors.
- **Zero-Code API Replay**: Run `get-fable test-engine run --tool keploy` for deterministic API traffic capture and replay.
- **AST Quality Audit**: Run `bun ./bin/get-fable.js anti-slop scan` to eliminate skipped tests (`test.skip`) or tautological assertions.
- **Evidence Recording**: Call `get-fable evidence pass test "<command>" "<detail>"` to seal the work.

---

## Verification Checklist

Before reporting testing complete:
- [ ] Test command executed with real assertions (exit code 0 and `executed > 0`).
- [ ] No `test.skip`, `xit`, or swallowed errors in the diff (`anti-slop scan` passes).
- [ ] Mocks are confined to genuine system boundaries.
- [ ] Passing test evidence recorded into the active Fable generation.
