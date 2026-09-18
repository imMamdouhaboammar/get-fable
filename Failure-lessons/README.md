# Engineering Failure Lessons & Durable Knowledge Base

> Pay for an engineering mistake once.
> After that, the project should remember it.

## Purpose

This directory records engineering failures by reusable failure class, including what happened, why it happened, how it was fixed, how the fix was verified, and which invariant now prevents recurrence.

Do not treat this as a simple session summary or ticket archive. This knowledge base preserves hard-won engineering wisdom so that future contributors and coding agents can act with confidence and avoid repeating past defects.

---

## Directory Organization

```text
Failure-lessons/
├── README.md                     # Knowledge base principles, triggers, and directory contract
├── lessons-index.md              # Compact registry table and "Rules We Now Enforce"
├── testing-and-verification.md   # Regression test mappings, oracle proofs, and test strategies
└── <topic-specific-lessons>.md   # Grouped by domain/failure class (e.g. state-management.md)
```

---

## Maintenance Triggers

Update existing entries or create new ones when:
- The same problem reappears
- A deeper root cause is discovered
- Architecture changes invalidate an old lesson
- Stronger verification is added
- A previous fix proves incomplete
- Two lessons share one cause
