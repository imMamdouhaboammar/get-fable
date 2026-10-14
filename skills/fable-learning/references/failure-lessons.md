# Failure Lessons & Project Knowledge Base Protocol

## Mission: Convert Sessions Into Durable Project Learnings

Every engineering session contains operational, architectural, and debugging knowledge that should not evaporate when an agent or contributor finishes. 

The primary mandate of the Failure-Lessons protocol is:
> **Pay for an engineering mistake once. After that, the project should remember it.**

Never settle for a simple session summary or a laundry list of modified files. Convert failures, discoveries, corrections, architectural trade-offs, debugging insights, testing strategies, and implementation mistakes into reusable engineering lessons that future contributors and coding agents can immediately act upon.

---

## 1. Directory Structure (`Failure-lessons/`)

Unless an established repository convention explicitly dictates otherwise, all failure lessons are stored in:

```text
Failure-lessons/
├── README.md                     # Knowledge base principles, triggers, and maintenance rules
├── lessons-index.md              # Compact index table and "Rules We Now Enforce"
├── testing-and-verification.md   # Regression test mappings, oracle proofs, and testing patterns
└── <topic-specific-lessons>.md   # Lessons grouped by failure domain (e.g. state-management.md)
```

### Topic Document Conventions
Do not create empty files simply to match a checklist. Author topic documents based on what was actually encountered:
- `authentication.md`
- `state-management.md`
- `database-integrity.md`
- `api-contracts.md`
- `background-jobs.md`
- `caching.md`
- `artifact-lifecycle.md`
- `performance.md`
- `frontend-state.md`
- `deployment.md`
- `testing.md`
- `security.md`
- `data-quality.md`
- `model-lineage.md`
- `observability.md`

---

## 2. Organizing by Failure Class, Not Ticket Number

Avoid ephemeral identifiers that degrade over time:
- ❌ `Bug #143`
- ❌ `Issue from Tuesday`
- ❌ `Fix applied in PR #92`

Prefer stable, descriptive failure classes:
- ✅ `Non-atomic resource publication`
- ✅ `Validation logic duplicated across entry points`
- ✅ `Background jobs without terminal-state guarantees`
- ✅ `Client and server disagreeing about API semantics`
- ✅ `Regression tests that never reproduced the original failure`

---

## 3. Separating Facts From Hypotheses

Never convert speculation into historical fact. Categorize every root cause into one of four empirical states:

| Root Cause State | Meaning | Required Evidence |
|---|---|---|
| **Confirmed** | Fully isolated and proven root cause | Machine verification or reproducible failing test |
| **Strongly indicated** | Highly probable cause supported by strong data | Correlated logs or behavior, but root mechanism not 100% isolated |
| **Open hypothesis** | Plausible explanation requiring further validation | Observable symptoms documented honestly without asserting causation |
| **Unknown** | Cause entirely undetermined despite the observable symptom | Factual description of symptom with explicit statement of unknown cause |

---

## 4. The 14-Section Failure-Lesson Schema

Every meaningful failure lesson adheres to this schema:

```markdown
## [Failure / lesson name]

### Context
Where this class of problem appeared (subsystem, host, boundary).

### What happened
Short factual description of the execution flow.

### Observable symptom
What engineers, users, or automated monitors actually saw (exact error strings, HTTP codes).

### Impact
Why the failure mattered (data corruption, service outage, latency, blocker).

### Incorrect assumption
What the system, design, or implementation implicitly assumed that was false.

### Root cause
State: **Confirmed** | **Strongly indicated** | **Unresolved**. Then cite the evidence.

### Why the architecture allowed it
The deeper system condition, lack of guardrails, or boundary failure that made the defect possible.

### Fix
The implemented solution at the proper architectural abstraction level (avoid documenting only a one-line patch if the meaningful fix was systemic).

### Verification
How the fix was proven (exact test commands, fixtures, or benchmarks).

### Prevention rule
The invariant future implementations must preserve.

### Reusable lesson
Where else this lesson applies across the project or future architectures.

### Related code
Stable module references, symbol names, or paths (avoid fragile line numbers).

### Related tests
Relevant automated regression or integration test paths.

### Related lessons
Cross-links to related failure lessons.

### Status
One of: **Resolved** | **Partially mitigated** | **Unresolved** | **Superseded**.
```

---

## 5. Extracting the Lesson Behind the Bug

Do not stop at superficial descriptions (e.g. *"We forgot to validate input X"*).

Ask deeper diagnostic questions:
- *Why could validation be forgotten?*
- *Was the same invariant implemented independently in multiple places?*
- *Was the service contract ambiguous?*
- *Was the failure mode silently swallowed?*
- *Was the test suite over-mocked or too narrow?*
- *Was state duplicated or unsynchronized?*

Transform local fixes into systemic rules:
> **Superficial**: "Endpoint B forgot the tenant validation check."  
> **Systemic**: "Domain invariants implemented independently across entry points will drift. Route all entry points through one canonical validation service."

---

## 6. Capturing Successful Patterns & Fix-Process Mistakes

### Successful Patterns
Record engineering practices that prevented or exposed defects:
- Deterministic test fixtures
- Property-based tests and fuzzing
- Contract and schema validation
- Explicit state-machine transitions
- Fault injection and chaos testing
- Red-green regression verification

### Fix-Process Mistakes
Document mistakes made during the debugging and repair process:
- Fixing the symptom instead of the underlying cause
- Creating another redundant layer of abstraction
- Writing a test that could never fail
- Over-mocking an integration boundary
- Trusting stale test results without fresh execution
- Accepting completion claims without verification evidence
- Weakening assertions or skipping tests to make the suite pass

---

## 7. Falsifiable Regression Test Verification

Every high-impact failure must be guarded by a real regression test. Where practical, challenge the test using the 3-step verification cycle:

```text
Fixed implementation   --> Test passes (exit 0)
Reverted defect        --> Test FAILS (exit != 0)
Restored fix           --> Test passes (exit 0)
```

If a test continues to pass even when the defect is reintroduced, it offers false confidence and does not guard the claimed failure class.

---

## 8. Multi-Target Storage Synchronization

Once repository documentation under `Failure-lessons/` is complete, synchronize distilled patterns into agent memory layers:

```bash
# 1. agent-kernel (system-wide critical invariants)
agent-kernel remember "<prevention invariant>" --type rule --level critical

# 2. GBrain (associative recall)
gbrain remember "<failure class>: <invariant>" \
  --provenance "session:<id> failure-class:<slug>" \
  --entity "failure-lessons/<domain>"

# 3. docs/solutions/ (single-topic resolution artifacts)
# Created for L3+ verified resolutions alongside Failure-lessons/
```

---

## 9. Final Report Format

Upon concluding the learning extraction mission, emit a concise 8-section report:
1. **Learning tools used**: Available tools utilized (`/learn`, `fable-learning`, `agent-kernel`, `gbrain`, etc.).
2. **Files created**: New documents under `Failure-lessons/`.
3. **Files updated**: Existing knowledge bases extended.
4. **Core lessons extracted**: Summary of the highest-value reusable lessons.
5. **Rules we now enforce**: Updated project invariants.
6. **Failure-to-test mappings**: Linkages between failure classes and automated tests.
7. **Unresolved knowledge**: Open hypotheses, partial mitigations, or missing regression tests.
8. **Repository changes**: Commit SHA or staged diff summary.
