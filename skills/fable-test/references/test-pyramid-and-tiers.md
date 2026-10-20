# The 7-Tier Test Pyramid of get-fable

This document establishes the architecture, boundaries, tooling, and execution semantics of the `get-fable` testing ecosystem.

---

## 1. Architectural Philosophy

Testing in `get-fable` is built around three core principles:
1. **Multi-Runtime Integrity:** `get-fable` is a hybrid polyglot system composed of TypeScript (Bun), Rust native kernels, Python hooks, and Cypress browser automation. Testing one runtime is insufficient.
2. **Adversarial Falsification:** Tests are not written to confirm that code works under ideal conditions. They are designed to probe boundary conditions, invalid states, state recovery, and malicious inputs.
3. **Anti-Slop Sandboxing:** Artificial test inflation (adding tautological assertions like `expect(true).toBe(true)` or silently skipping tests via `.skip()`) is detected and blocked by AST diff guards.

---

## 2. Tier Breakdown

### Tier 1: Fast Local Unit & Property Suites
- **Runtime:** Bun (`bun test`), Rust (`cargo test --workspace`).
- **Target Surfaces:** Pure business logic, state machines, math routines, serialization, and router rules.
- **Speed:** < 2 seconds for the entire suite.
- **Coverage:** High code branch density with zero network or external dependencies.

### Tier 2: Neural Test Acceleration & Differential Oracles
- **Runtime:** Native Rust binary `fable-neural-test` via `get-fable rig call-tool fable_neural_test`.
- **Target Surfaces:** Quantized matrix operations, token stream scheduling, systolic arrays, and bit-exact differential execution.
- **Speed:** Sub-millisecond SIMD execution.
- **Key Capability:** Proves that an updated algorithm produces identical or intended differential behavior compared to a verified baseline.

### Tier 3: Anti-Slop AST & Diff Integrity Guard
- **Runtime:** Native Rust binary `fable-anti-slop` via `bun ./bin/get-fable.js anti-slop scan`.
- **Target Surfaces:** Git working tree diffs and commit boundaries.
- **Checks:**
  - `ERROR_SWALLOW`: Catches empty catch blocks or suppressed errors.
  - `WEAK_ASSERTION`: Catches tautologies or vacuous assertions.
  - `SKIPPED_TEST`: Flags newly introduced test skips (`it.skip`, `#[ignore]`).
  - `DEV_NOTE_IN_UI`: Flags developer notes leaking into user-visible DOM.

### Tier 4: Native Rig LLM Tools & gRPC East-West RPC
- **Runtime:** Bun test with native binary bridges (`target/release/get-fable-native`) and gRPC server.
- **Target Surfaces:** Rig tool definitions (`AntiSlopTool`, `AntiChurnTool`, `NeuralTestTool`, `FableLifecycleTool`), parameter schema validation (`schemars`), and East-West Protobuf serialization.
- **Execution:** Spawns live sub-processes and evaluates end-to-end tool calling.

### Tier 5: E2E Browser Smoke & Cypress Workflows
- **Runtime:** Cypress headless browser (`cypress run`).
- **Target Surfaces:** User documentation portal, dashboard components, and interactive web tools.
- **Execution:** Runs against an isolated, bounded local HTTP server.

### Tier 6: Behavioral Evals & Holdout Benchmarks
- **Runtime:** Fable behavioral evaluation engine (`bun ./bin/get-fable.js behavior-eval`).
- **Target Surfaces:** 44 canonical skills across 8 packs.
- **Evidence:** 1020 holdout test cases evaluated across M0 to M5 maturity levels.

### Tier 7: System Doctor & Ecosystem Audit
- **Runtime:** Fable Doctor (`bun ./bin/get-fable.js doctor --json-v1`).
- **Target Surfaces:** 40+ system-level checks including skill package schemas, marketplace manifests, supply chain pinning, neural graph integrity, and 32-host installer parity.
