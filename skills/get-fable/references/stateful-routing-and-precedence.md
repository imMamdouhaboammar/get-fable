# Stateful Routing and Precedence

The router should answer one question: **who owns the next load-bearing decision?**

## Precedence beats keywords
A task can contain words associated with a later phase while the current state still requires an earlier gate.

Examples:
- "Publish this package" + stale verification → verify before release.
- "Fix this again" + two similar failed patches → recover before execute.
- "Implement the new SDK method" + unknown current signature → research before TDD/execute.
- "Review this auth change" → security may be primary before generic review.

## Earliest unresolved decision
When multiple Skills are plausible, choose the earliest unresolved decision whose answer changes later work.

```text
Where is the behavior?         → discover
What does current API support? → research
Which contract/design?         → plan
How do we prove behavior gap?  → TDD
What code satisfies it?        → execute
Does current diff work?        → verify
Is diff semantically sound?    → review
Is trust boundary safe?        → security
Can exact artifact ship?       → release
```

Do not select a later Skill merely because it is closer to the user's desired final outcome.

## State signals
Treat these as routing inputs, not metadata:
- failure streak;
- active card;
- mutation generation;
- verified generation;
- unresolved findings;
- phase;
- handoff/resume status.

State can narrow or override intent. If state appears inconsistent with repository evidence, state itself becomes the thing to diagnose.

## Re-routing triggers
Keep current specialist unless one of these changes:
- new load-bearing unknown;
- scope/contract expands;
- repeated failure;
- evidence becomes stale;
- security boundary appears;
- worker dependency collision;
- user changes requested outcome materially;
- current specialist reaches its handoff gate.

This prevents orchestration churn.

## Compound requests
For "review, fix, test and release", do not activate four Skills at once. Build a sequence from dependency:

`review → bounded repair/TDD → verify → security if relevant → release`

If review finds nothing, repair stage disappears. If verification fails ambiguously, recovery interrupts the sequence.

## Routing explanation quality
A good route states:
- selected Skill;
- evidence/state that caused selection;
- why closest alternatives are not primary now;
- gate that ends this Skill's ownership.

That explanation is more useful than exposing an opaque numeric routing score.