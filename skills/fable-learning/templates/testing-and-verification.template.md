# Testing Strategies, Regression Mappings, and Verification Oracles

> A regression test must reproduce the original failure mode.
> If a test passes while the bug is present, it protects nothing.

---

## 1. Failure-to-Regression Test Mapping

Every resolved high-impact failure must connect directly to an automated test verifying the protected invariant:

| Failure Class | Regression Test File / Identifier | Protected Invariant | Oracle Type |
|---|---|---|---|
| ${SAMPLE_FAILURE_CLASS} | `${TEST_PATH}:${TEST_SUITE_NAME}` | ${PROTECTED_INVARIANT} | Deterministic Assertion |

---

## 2. Real Regression Verification Protocol (The 3-Step Challenge)

Where practical, challenge important regression tests to ensure they are falsifiable:

1. **Step 1 (Fixed Implementation)**:
   Run the test against the current patched codebase.
   $$\text{Result: } \mathbf{PASS} \quad (\text{Exit code } 0)$$
2. **Step 2 (Reverted Defect Simulation)**:
   Temporarily reintroduce the flaw (in a safe branch/worktree or mock condition).
   $$\text{Result: } \mathbf{FAIL} \quad (\text{Exit code } \neq 0)$$
   *If the test still passes when the defect is present, the test is invalid or over-mocked.*
3. **Step 3 (Restored Fix)**:
   Re-apply the verified fix and re-run.
   $$\text{Result: } \mathbf{PASS} \quad (\text{Exit code } 0)$$

---

## 3. High-Leverage Testing Patterns Catalog

Preserve testing techniques that successfully exposed or prevented failure classes in this project:

### Deterministic Test Fixtures
- **Exposed Failure**: Flaky execution order and state leakage between parallel workers.
- **When to Use**: Isolated state machines, database seeding, cryptographic hashes.
- **False Confidence Risk**: Fixtures may become decoupled from changing production schemas.

### Property-Based Testing & Fuzzing
- **Exposed Failure**: Unexpected boundary combinations, Unicode escaping bugs, buffer boundaries.
- **When to Use**: Encoders/decoders, parsers, mathematical formulas, state machine invariants.
- **False Confidence Risk**: Weak generators may miss clustered domain edge cases.

### Fault Injection & Chaos Probing
- **Exposed Failure**: Silent swallow of network failures, infinite hanging on dropped sockets.
- **When to Use**: Upstream API integrations, timeout handling, retry/circuit-breaker logic.
- **False Confidence Risk**: Injected errors must mimic realistic production failure modes.

### Contract & Schema Enforcement
- **Exposed Failure**: Semantic drift between client expectations and server API responses.
- **When to Use**: Distributed subagent communication, gRPC schemas, external HTTP endpoints.
- **False Confidence Risk**: Does not verify business logic correctness beyond schema types.

---

## 4. Unresolved Testing Debt

Document known gaps where a critical failure occurred but automated regression coverage could not yet be established:

- [ ] **Item**: ${UNRESOLVED_TEST_GAP}
  - **Reason**: Complex concurrency simulation / hardware dependency
  - **Interim Mitigation**: Manual verification runbook or smoke script
