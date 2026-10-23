# fable-test

> Orchestrate, author, and verify automated tests in any application codebase, enforcing Test-Guard anti-bloat rules, test-value calculus, and tool dispatch.

**Pack:** proof · **Phase:** verifying

[View the canonical Skill source](https://github.com/imMamdouhaboammar/get-fable/blob/master/skills/fable-test/SKILL.md)

---

# Fable Test: Universal Quality Engineering & Testing Harness

Orchestrate, author, and verify robust automated testing suites in any consumer application codebase.

---

## Mission

Transform ad-hoc or hallucinated testing into an autonomous, rigorous, and deterministic quality engineering pipeline. `fable-test` serves as the universal testing orchestrator for developers and AI agents:
1. **Stack & Topology Discovery**: Automatically inspect the project to identify runtimes, test frameworks, and boundary layers.
2. **Test-Guard Rules Enforcement**: Eliminate AI-generated test bloat by applying 9 universal testing discipline rules.
3. **Test-Value Calculus**: Validate each test's economic justification and protect against zero-selection false positives.
4. **Tool & Skill Dispatch**: Orchestrate TDD workflows, visual E2E testing, API replay virtualization, and AST quality checks.

---

## Activation Contract

### Activate When
- User requests executing the test suite or improving test coverage: *"اختبر المشروع"*, *"run tests"*, *"test this feature"*, *"add tests for X"*.
- Agent needs to assess existing test coverage or diagnose test suite failures.
- Designing or auditing test architecture for a service, API, or frontend application.

### Do Not Activate When
- Driving a single behavior change via test-first red-green-refactor during implementation -> use `fable-tdd`.
- Performing the mandatory final gating check before session completion -> use `fable-verify`.
- Performing security penetration testing against external targets -> use `fable-redteam`.
- Testing `get-fable`'s own internal engine crates (maintainer only) -> use `fable-core-test`.

---

## Situation Classification

| Project Context | Primary Focus | Strategy |
|---|---|---|
| **Greenfield / New Feature** | Public behavioral contracts | Define data factories; enforce behavior-not-implementation (Rule 1); delegate to `fable-tdd`. |
| **Existing Legacy Codebase** | Regressions & boundary characterization | Map external boundaries; use real test databases where appropriate (Rule 9). |
| **Complex GUI / Web UI** | Visual layout & interactive state | Dispatch to `get-fable test-engine` with Midscene (AI vision testing). |
| **High-Traffic Web API** | End-to-end replay & regression locking | Dispatch to `get-fable test-engine` with Keploy (traffic replay & DB virtualization). |
| **Pre-Ship / PR Diff Review** | Anti-slop and test integrity | Run `anti-slop scan` to block skipped tests, swallowed errors, or weak assertions. |

---

## Protocol

### Stage 1: Stack & Topology Discovery
Inspect the repository topology to determine test commands rather than assuming conventions:
- TypeScript/JavaScript: `bun test`, `vitest run`, or `jest`.
- Python: `pytest` or `uv run pytest`.
- Go: `go test ./...`.
- Rust: `cargo test`.
- PHP: `./vendor/bin/pest` or `./vendor/bin/phpunit`.

### Stage 2: The 9 Universal Test-Guard Rules
Every test authoring or modification pass must strictly enforce:
1. **Test Behavior, Not Implementation**: Assert observable outputs and state changes from caller's view; never mock internal helper call counts.
2. **Every Mock Must Be Justified**: Mock strictly at system boundaries (network, external storage, clocks, third-party APIs).
3. **One Scenario Per Test**: Merge repetitive tests into parameterized data-driven suites.
4. **Justify Existence**: Answer: *"What specific defect does this catch that no other test catches?"*
5. **Semantic Scenario Naming**: Use `test_<scenario>_<expected_outcome>`.
6. **Regression Tests Are Sacred**: Incident repro tests are permanent; never delete or weaken them.
7. **No Tests for Framework Guarantees**: Test application business logic, not library defaults.
8. **State & Value Objects Are Real**: Never mock DTOs or entities; use real instances and data factories.
9. **Infrastructure Under Test Gets Real Infrastructure**: Persistence tests must run against real database instances.

### Stage 3: Test-Value Correctness & Zero-Selection Guard
1. Apply the 3-questions calculus:
   - *Which concrete mistake fails this test, and what loss would it cause?*
   - *Would an equivalent refactor fail?* (Detect and eliminate brittle tests).
   - *Does added protection justify ongoing maintenance cost?*
2. Verify executed test count: ensure `tests_executed >= 1`. Never accept exit code 0 when zero tests were matched.

### Stage 4: Specialized Tool & Skill Dispatch
- Route to `fable-tdd` when creating new features or fixing bugs.
- Run `get-fable test-engine run --tool midscene` for vision-based browser testing.
- Run `get-fable test-engine run --tool keploy` for deterministic API traffic capture and replay.
- Run `bun ./bin/get-fable.js anti-slop scan` to eliminate skipped tests (`test.skip`) or tautological assertions.
- Call `get-fable evidence pass test "<command>" "<detail>"` to record machine-checked proof.

---

## Decision Rules

1. **If an assertion checks a mock of an internal private function**: Delete the mock, call the public interface, and assert the observable output.
2. **If multiple tests differ only in scalar values**: Collapse into a single data-driven test table.
3. **If a test runner exits with code 0 but reports 0 tests ran**: Mark as a fatal zero-selection violation and re-scope filter.
4. **If a test would still pass when business logic returns undefined**: Refactor assertions to be strict and falsifiable.

---

## Invariants

- **The Behavioral Assertion Invariant**: Tests must verify observable outcomes, state mutations, or contract boundaries — never internal execution sequence.
- **The System Boundary Mock Invariant**: Mocking is permitted only at boundaries with external systems (network, clock, external persistence, third-party SDKs).
- **The Zero-Selection Invariant**: A test command is valid evidence only if total executed tests > 0.
- **The Anti-Slop Cleanliness Invariant**: Test suites must not contain skipped tests (`test.skip`, `xit`), empty error catches, or unconstrained assertions (`expect(x).toBeDefined()`).

---

## Failure Taxonomy

| Failure Mode | Root Cause | Remediation Protocol |
|---|---|---|
| **Brittle Refactor Failure** | Test asserts internal variable or private helper | Rewrite test against the public caller API. |
| **Zero-Selection False Green** | Regex filter matched 0 files/tests but exited 0 | Audit test runner pattern matching and verify execution counts. |
| **Mock Drift / Mock Lie** | Mocked boundary does not match real API schema | Switch to real test database or update contract fixtures from upstream schemas. |
| **Flaky Async Race** | Test relies on arbitrary `sleep()` rather than polling | Replace `sleep` with deterministic condition polling (`waitFor`, event listener). |

---

## Anti-Patterns

| Prohibited Anti-Pattern | Correct Engineering Practice |
|---|---|
| Asserting `expect(internalHelper).toHaveBeenCalled()` | Assert return value or external observable state change. |
| Mocking domain entities or database models | Construct real models with minimal factory helpers. |
| Silencing tests with `test.skip` to pass CI | Fix underlying defect or delete obsolete test with recorded rationale. |
| Writing tests for framework validation defaults | Write tests only for custom business validation rules. |
| Accepting `0 tests passed` as success | Require strict verification that executed count > 0. |

---

## Completion Criteria

A testing task is complete only when:
- All target scenarios execute against real implementations and exit 0.
- Executed test count is verified > 0 (zero-selection check passed).
- Diff is scanned with `fable-anti-slop` with 0 blockers (no skipped tests or weak assertions).
- Machine-checked passing test evidence is recorded via `get-fable evidence pass test ...`.

---

## Progressive Resources

- [The Nine Universal Test-Guard Rules](references/test-guard-rules.md): In-depth violation patterns and fixes.
- [Stack Discovery Guide](references/stack-discovery.md): Taxonomy of project runtimes and test runners.
- [Test-Value Calculus & Anti-Brittleness Guard](references/test-value-calculus.md): The 3-questions calculus and zero-selection prevention.
- [Tool Dispatch Matrix](references/tool-dispatch.md): How to route to TDD, Midscene, Keploy, and Anti-Slop.
