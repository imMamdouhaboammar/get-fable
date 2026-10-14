# Failure Lessons Index & Enforced Invariants

> Quick-discovery index of engineering failure classes, architectural remediations, and binding project invariants.

---

## Lessons Index

| Lesson | Failure Class | Prevention Rule | System | Status | Document |
|---|---|---|---|---|---|
| ${SAMPLE_LESSON_TITLE} | ${SAMPLE_FAILURE_CLASS} | ${SAMPLE_PREVENTION_RULE} | ${SAMPLE_SYSTEM} | ${SAMPLE_STATUS} | [${SAMPLE_DOC_NAME}](./${SAMPLE_DOC_PATH}) |

---

## Rules We Now Enforce

The following invariants have been hard-won through real engineering failures. Every contributor and coding agent must respect these non-negotiable rules:

1. **Single Source of Invariant Truth**:
   One domain invariant must have exactly one canonical validation source. Never duplicate validation independently across entry points.

2. **Completeness Implies Resource Readiness**:
   A public `completed` or terminal state must strictly imply that all underlying artifacts, resources, and evidence are available and verified.

3. **Terminal-State Guarantees for Transitions**:
   Every transitional or background lifecycle state must possess explicit timeouts, backoff, and guaranteed terminal-state transitions (failure or success).

4. **Machine-Actionable Capabilities**:
   Recommendations and tools emitted to agents or users must resolve to existing, executable capabilities rather than speculative APIs.

5. **Semantic Error Boundaries**:
   Caller input errors must never be classified or logged as internal server faults. Preserve distinct error taxonomies at service boundaries.

6. **Reproduce Before Fixing**:
   A regression test must provably fail on the unpatched defect before a fix is accepted. A test that passes before and after does not protect against the failure.

7. **Verification Evidence Over Passing Suites**:
   A passing test suite is not equivalent to verified requirement coverage. Substantial behavioral claims require fresh, machine-checked execution evidence.

---

## How to Add or Update a Lesson

1. Determine the canonical **Failure Class** (not ticket ID).
2. Author or append the lesson entry in the appropriate topic document using the 14-section schema.
3. Update the table above with the lesson link, prevention rule, and resolution status (`Resolved`, `Partially mitigated`, `Unresolved`, `Superseded`).
4. If the lesson establishes a critical universal invariant, append it to **Rules We Now Enforce**.
5. Ensure a corresponding regression test is documented in [`testing-and-verification.md`](./testing-and-verification.md).
