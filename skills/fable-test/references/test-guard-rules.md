# The Nine Universal Test-Guard Rules for AI Coding Agents

When authoring, modifying, or reviewing tests in any codebase, agents must strictly enforce these nine rules to prevent AI-generated test bloat, brittle assertions, and false confidence.

---

## Rule 1: Test Behavior, Not Implementation
Test what code does from the caller's perspective. Assert return values, state changes, and observable side effects. Never assert that an internal private method or helper was called with specific arguments — such tests break on every refactor while catching zero real bugs.

- **Violation Pattern**: Mocking an internal helper function and asserting `expect(helper).toHaveBeenCalledWith(...)`.
- **Correction**: Invoke the public entry point and assert the return value or the persisted outcome the caller expects.

---

## Rule 2: Every Mock Must Be Justified
Mock **only** at genuine system boundaries:
1. Outbound network and HTTP calls.
2. Database drivers (when persistence logic itself is not the subject under test).
3. Filesystem I/O on external filesystems.
4. System clock and non-deterministic randomness.
5. Third-party SDKs and LLM API endpoints.

**Prohibition**: Never mock internal domain classes, service layers, or helper functions to create artificial "unit isolation". The seams you create hide the integration bugs worth catching.

---

## Rule 3: Single Scenario Per Test, Data-Driven for Variants
If two or more tests share identical setup and execution logic, differing only in input/output values, merge them into a single data-driven parameterized test (`@pytest.mark.parametrize`, `test.each`, `#[DataProvider]`).

- **When Separate Tests Are Valid**: Genuinely different preconditions, distinct mock behaviors, or different failure recovery paths.

---

## Rule 4: Every Test Must Justify Its Existence
Before writing or keeping any test, answer clearly:
> *"What specific defect does this test catch that no other test in this suite catches?"*

Delete tests that only verify compiler guarantees, default constructor assignments, trivial pass-through properties, or type system rules.

---

## Rule 5: Semantic Scenario-Based Naming
Test names must read like behavioral requirements, not repeats of method signatures.

| Anti-Pattern | Standard Pattern |
|---|---|
| `test_handle_request_error` | `test_missing_authorization_header_returns_401` |
| `test_parse_user` | `test_malformed_email_payload_is_rejected_with_validation_error` |
| `test_cache_hit` | `test_subsequent_read_returns_cached_record_without_db_query` |

---

## Rule 6: Production Regression Tests Are Sacred
Any test that reproduces a reported production bug or incident is permanent. Annotate it with the incident ID or issue link. Never delete or weaken a regression test during refactoring.

---

## Rule 7: Do Not Test Framework Guarantees
Never test that the web framework's router routes, the ORM persists, or the validation library validates. Test **your** application logic running on top of the framework.

- **Violation**: Testing that a library's built-in email regex rejects invalid strings.
- **Correction**: Testing that your application service surfaces the appropriate user-facing validation error when an invalid email is submitted.

---

## Rule 8: State and Value Objects Are Real, Never Mocked
Never mock DTOs, domain models, or entities. Construct real instances using minimal fixtures or data factories. Mocking data models hides schema drift and renamed fields.

---

## Rule 9: Infrastructure Under Test Gets Real Infrastructure
When database queries, migration behavior, or transactional boundaries are the primary subject under test, execute them against a real test database (e.g. Docker container, SQLite in-memory, or isolated test schema). Mocking the database session tests nothing about your SQL.
