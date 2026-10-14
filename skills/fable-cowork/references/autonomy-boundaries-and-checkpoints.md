# Autonomy Boundaries and Checkpoints

Autonomous execution should remove low-value conversational friction while preserving high-value decision boundaries.

## Continue without asking when
- the next step is reversible and implied by the accepted card;
- repository evidence selects one obvious implementation detail;
- tests reveal a bounded mechanical defect;
- a required deterministic verification command is available;
- generated outputs need routine regeneration from an already changed source.

## Stop or surface when
- two product behaviors are both plausible and user intent does not select one;
- a public API/schema/migration choice has meaningful compatibility trade-offs;
- an irreversible external action is not authorized;
- credentials/access are missing;
- user-owned concurrent changes would be overwritten;
- repeated failure no longer has a justified next mutation;
- required external evidence cannot be produced in the environment.

## Checkpoint cadence
Create a durable checkpoint at meaningful boundaries, not every tool call:
- discovery completed / plan accepted;
- card completed + evidence;
- before/after risky migration or release stage;
- before context transfer/interruption;
- when a hard wall appears;
- after recovery changes the diagnosis.

## Silent execution is not silent evidence
Internally collect exact commands/results, mutation freshness, diff ownership, and blockers. The final report can stay concise because the underlying state is precise.

## Outcome-first final report
Useful order:
1. delivered result or exact blocker;
2. fresh verification/review evidence;
3. important design decisions or files changed;
4. remaining external/manual action;
5. next safe action if incomplete.

Avoid a chronological diary of every search/edit/test call.

## Autonomy budget
Long sessions need explicit stop conditions even without a token counter:
- requested outcome achieved;
- no new information after repeated recovery probes;
- remaining action depends on unavailable external event/permission;
- scope required would exceed accepted objective;
- risk rises beyond authorization.

Autonomy is valuable because it maintains focus, not because it refuses to stop.