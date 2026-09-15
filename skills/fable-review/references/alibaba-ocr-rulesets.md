# Alibaba Open Code Review (OCR) Zero-API Delegation Protocol

## Overview

The Alibaba Open Code Review (OCR) architecture separates code review into two distinct layers:
1. **Deterministic Engineering Pipeline**: Programmatic file selection, noise exclusion, bounded file bundling, and rule resolution.
2. **Host Coding Agent Reasoning (Zero-API Delegation Mode)**: The active AI coding agent (Antigravity, Claude Code, Codex, Cursor) performs deep semantic evaluation, line-level fault localization, and concrete remediation proposals **without requiring any external LLM API keys or endpoints**.

---

## 1. Hybrid Review Architecture

```text
[Changed Code / Diff]
        │
        ▼
[1. Deterministic Selection & Filtering] ──► Discards lockfiles, minified files, test fixtures, binaries
        │
        ▼
[2. File Bundling] ────────────────────────► Groups into bounded batches (threshold: 50 lines/file, 100 lines/group)
        │
        ▼
[3. Rule Resolution] ──────────────────────► Matches file paths with .opencodereview/rule.json & Multi-Language Rules
        │
        ▼
[4. In-Agent Semantic Analysis] ───────────► Coding Agent applies deep reasoning to each bounded file bundle
        │
        ▼
[5. Reflection & Line Anchoring] ──────────► Verifies start_line & end_line in new file; rejects floating/line-0 nits
        │
        ▼
[6. Structured Verdict] ───────────────────► APPROVE, CHANGES_REQUIRED, or INCOMPLETE with actionable findings
```

---

## 2. Multi-Language Rulesets

### TypeScript / JavaScript (`**/*.{ts,tsx,js,jsx,mjs,cjs}`)
- **NPE / Nullish Safety**: Defend against `TypeError: Cannot read property of undefined/null`. Use optional chaining (`?.`), nullish coalescing (`??`), and parameter guards.
- **Concurrency & Promises**: Every Promise must be awaited or chained with `.catch()`. Prevent race conditions when mutating shared state across async calls.
- **Security & XSS**: Avoid `dangerouslySetInnerHTML`, sanitize prototype pollution vectors (`__proto__`, `constructor`), and validate all external API and webhook payloads.
- **Resource Discipline**: Clear timers, listeners, stream handles, and database connections in cleanup hooks.

### Python (`**/*.py`)
- **NoneType Safety**: Prevent `AttributeError: 'NoneType' object has no attribute`. Check return values and dictionary `.get()` calls before dereference.
- **Default Arguments**: Never use mutable default arguments (`def func(items=[])`).
- **SQLi & Injection**: Never format raw SQL strings; always use parameterized queries. Avoid `subprocess.run(..., shell=True)` with user inputs.
- **Resource Context**: Always wrap files, sockets, and sessions in `with` blocks.

### Go (`**/*.go`)
- **Nil Pointer Safety**: Always check `err != nil` before dereferencing pointers or results. Verify map lookups with the 2-value idiom (`val, ok := m[key]`).
- **Goroutine Leaks & Data Races**: Ensure every goroutine terminates via `context.Context` or done channels. Guard shared struct mutations with `sync.Mutex` or `sync.RWMutex`.
- **Resource Discipline**: Always `defer resp.Body.Close()` or `defer file.Close()` immediately after checking `err == nil`.

### Rust (`**/*.rs`)
- **Panic Hardening**: Avoid `.unwrap()` and `.expect()` in production paths; propagate errors with `Result<T, E>` and `?`.
- **Lock Deadlocks**: Keep `Mutex`/`RwLock` guards in the narrowest scope; never hold locks across async `.await` points.
- **Unsafe Audit**: Verify pointer alignment, slice bounds, and provenance inside `unsafe` blocks.

### Java (`**/*.java`)
- **Null Pointer Exceptions (NPE)**: Validate arguments with `Objects.requireNonNull()` or `@NonNull`. Use `Optional<T>` appropriately.
- **Thread Safety**: Synchronize shared mutations, use `java.util.concurrent` classes, and ensure `volatile` for visibility.
- **SQL Injection**: Use `PreparedStatement` or `#{} ` parameter syntax in MyBatis. Always use try-with-resources.

### SQL & Schema Migrations (`**/*.{sql,ddl}`)
- **Index Coverage**: Ensure foreign keys and frequent filter predicates have supporting indexes.
- **Non-Destructive Migrations**: Ensure schema migrations follow the expand-contract pattern and do not break older running application instances.

---

## 3. Finding Classification & Schema

Each finding emitted by the reviewer must conform to the following schema:

```json
{
  "path": "src/core/auth.ts",
  "start_line": 42,
  "end_line": 48,
  "category": "security",
  "severity": "critical",
  "content": "Unsanitized user token passed directly to SQL query string",
  "suggestion_code": "const user = await db.query('SELECT * FROM users WHERE token = $1', [token]);"
}
```

### Severity Triage:
- **`critical`**: Data loss, remote code execution, authentication bypass, unhandled crash in critical path.
- **`high`**: Logic regression, race condition, severe memory leak, unhandled error causing state corruption.
- **`medium`**: Missing edge-case validation, performance degradation, missing parameter checks.
- **`low`**: Minor maintainability or documentation suggestion (only report if high value; discard trivial style nits).

---

## 4. Custom Configuration (`.opencodereview/rule.json`)

Projects can define custom rules that automatically merge with or override built-in system rules:

```json
{
  "rules": [
    {
      "path": "src/api/**/*.ts",
      "rule": "All HTTP endpoints must validate request body schema with Zod and return typed errors",
      "category": "bug",
      "merge_system_rule": true
    }
  ],
  "excludes": [
    "**/generated/**",
    "**/fixtures/**"
  ]
}
```
