# Test-Value Calculus & Anti-Brittleness Guard

Every test added or maintained in a project carries a continuous maintenance cost. The Test-Value calculus establishes whether that protection is justified.

---

## The Three Questions of Test Value

```mermaid
flowchart TD
    Q1["1. Which concrete mistake fails this test, and what loss would it cause?"]
    Q2["2. Would an equivalent refactor or valid variant also fail?"]
    Q3["3. Which existing check already catches this, and does added protection justify cost?"]
    
    Q1 -->|Concrete loss identified| Q2
    Q1 -->|Vague or zero loss| Reject["Reject / Delete Test"]
    Q2 -->|No: test only fails on actual bug| Q3
    Q2 -->|Yes: test coupled to implementation details| Refactor["Refactor to Public Contract"]
    Q3 -->|Added protection > Maintenance cost| Accept["Keep / Add Test"]
    Q3 -->|Duplicate of existing check| Consolidate["Merge into Parametrized Suite"]
```

### 1. Concrete Defect & Consequence
If an agent cannot articulate the exact behavioral failure or regression that would trigger the test failure, the test is decorative slop.

### 2. The Brittle Test Trap
A test is brittle if changing internal structure, renaming private variables, or improving performance breaks the test while leaving the caller's observable behavior unchanged. Tests must assert against public contracts.

### 3. Protection vs. Maintenance Cost
High-consequence boundaries (data integrity, auth/permissions, money/billing, failure recovery) justify dedicated integration tests. Incidental pass-through logic does not.

---

## The Zero-Selection Trap (False Positive Guard)

A pervasive AI agent failure mode:
1. Agent runs `bun test --filter my-new-test` or `pytest -k nonexistent`.
2. Test runner finds 0 matching tests and exits with code 0 (`0 passed, 0 failed`).
3. Agent misinterprets exit code 0 as a passing test suite and claims victory.

**Invariant**: A test command is only evidence of passing behavior if `tests_executed >= 1` and `failed == 0`. An execution with 0 matching tests is a `FAIL` (Zero-Selection Violation).
