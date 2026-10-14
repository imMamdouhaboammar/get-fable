# Behavioral Diff Review Playbook

Use this to review for defects rather than formatting preferences.

## Start with behavior delta
Before reading line details, write:
- what users/callers could observe before;
- what they should observe after;
- which invariants must remain unchanged;
- what new failure modes the change introduces.

This gives every later comment a relevance test.

## Review lenses

### Control flow
- early returns that skip cleanup/validation;
- fallthrough/default branches;
- error swallowed or converted incorrectly;
- retry loops that duplicate side effects;
- async operations not awaited/cancelled when ownership ends.

### Data flow
- wrong source of truth;
- stale/cached value;
- partial update leaving inconsistent state;
- serialization/deserialization mismatch;
- nullable/optional value crossing an unsafe boundary.

### State and lifecycle
- resource acquired but not released;
- listener/timer/task outlives component/request;
- transaction commits before all validations;
- rollback omits side effect;
- initialization order changes.

### Concurrency
Reason about at least two interleavings where shared state changes. Look for:
- check-then-act races;
- unsynchronized mutation;
- lock scope/order deadlock;
- duplicate retry/at-least-once delivery;
- cancellation after side effect begins.

### Compatibility
- old callers with new defaults;
- persisted old data with new reader;
- new writer with old reader during rolling deploy;
- CLI flag/exit/output changes;
- package/export rename.

### Test adequacy
Ask what production mutation would make each new test fail. If the answer is unclear, the test may be too implementation-coupled or weak.

## Finding calibration

### Blocking
Likely correctness/security/data-loss/public-contract failure under a plausible scenario.

### Important
Material reliability/maintainability issue with realistic future defect risk, but not necessarily immediate user failure.

### Suggestion
Optional simplification/readability improvement. Keep sparse.

## Reject weak findings
Drop or investigate further if the comment is only:
- "this could be cleaner";
- "consider error handling";
- "maybe add a test";
- "use another abstraction";
- "I prefer naming X".

Convert it into a concrete failure scenario or remove it.

## Review large diffs
For large changes:
1. map files to card/requirement;
2. identify public/state boundaries first;
3. inspect highest blast-radius changes deeply;
4. sample mechanical/generated changes after proving generator/source;
5. return to combined behavior and tests.

Do not spend most of review budget on low-risk generated churn while missing a five-line contract change.

## Approval standard
Approval means: after reading the actual diff and affected contracts, you found no grounded blocking/important defect that current evidence leaves unresolved.

It does not mean the code is perfect, every style preference is satisfied, or security has been independently proven.