# Anti-Slop AST & Diff Guard in Testing

This document details how Fable enforces test integrity and prevents AI coding slop from entering the test suite.

---

## 1. Why Anti-Slop Testing Matters

AI coding agents often display distinct failure modes when asked to make tests pass:
1. **Gutting Assertions:** Reducing the assertion count or replacing strict checks with tautologies (`expect(1).toBe(1)`).
2. **Skipping Failing Tests:** Adding `.skip()`, `xit()`, or `#[ignore]` to silence broken tests instead of fixing the root cause.
3. **Swallowing Errors:** Catching exceptions and silently ignoring them to prevent unhandled rejection crashes.
4. **Mock Inflation:** Mocking away the entire problem space so that tests pass vacuously without exercising real logic.

---

## 2. The Heuristic Scanner

Fable uses a high-performance native Rust engine (`crates/fable-anti-slop`) that inspects git diffs and raw files at AST token level:

```bash
bun ./bin/get-fable.js anti-slop scan --base HEAD
```

Or via the native binary directly:
```bash
./target/release/fable-anti-slop scan --base HEAD --fail-on-blocker
```

### Violation Categories

| Rule ID | Severity | Description | Remediation |
|---|---|---|---|
| `ERROR_SWALLOW` | BLOCKER | Empty catch block or ignored error | Handle error, rethrow, or log meaningfully |
| `WEAK_ASSERTION` | BLOCKER | Tautological assertion (`expect(true).toBe(true)`) | Assert actual function return value against explicit fixture |
| `SKIPPED_TEST` | BLOCKER | Introduction of `.skip()`, `xit()`, or `#[ignore]` | Fix the underlying failure or delete obsolete test with documentation |
| `SECURITY_BYPASS`| BLOCKER | Disabling TLS verification or auth tokens | Restore strict security validation |
| `TYPE_CHECK_SUPPRESSION` | REVIEW | `// @ts-ignore` or `any` casting | Use strict generic types and interfaces |
| `LARGE_DIFF_REVIEW` | REVIEW | Diff exceeds review threshold (400 lines) | Decompose change into smaller bounded cards |

---

## 3. Sandboxed Diff Inspection via Rig

Agents can invoke test assertion sandboxing before committing code:

```bash
get-fable rig call-tool --tool fable_neural_test --args '{
  "action": "inspect_diff",
  "original_code": "it(\"works\", () => { expect(a).toBe(b); expect(c).toBe(d); });",
  "modified_code": "it(\"works\", () => { });",
  "file_path": "test/feature.test.ts"
}' --json
```

Output:
```json
{
  "action": "inspect_diff",
  "passed": false,
  "violations": [
    {
      "kind": "AssertionCountReduced",
      "file_path": "test/feature.test.ts",
      "message": "Assertion count decreased from 2 to 0 (possible test gutting)"
    }
  ],
  "summary": "Detected 1 test integrity violations in test/feature.test.ts"
}
```
