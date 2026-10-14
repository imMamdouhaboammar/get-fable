# Risk and Dependency Decomposition

Use this when a task is too large for one bounded edit but naive file-based splitting would hide semantic coupling.

## Build a change graph before cards
For each component identify:
- contract consumed/provided;
- state it reads/writes;
- migration format;
- external dependency;
- tests that prove it;
- cards that must precede/follow it.

Two files are not independent merely because they are different paths. If they change the same contract, invariant, schema, or rollout assumption, model that dependency explicitly.

## Useful dependency types

### Build dependency
Card B cannot compile/run until A exists.

### Contract dependency
Both cards depend on one interface/schema. Stabilize the contract first or serialize changes.

### Data dependency
A changes persisted shape used by B. Plan compatibility/backfill/rollback.

### Verification dependency
Worker-local tests pass, but only combined integration proves the outcome. Assign integration ownership.

### Operational dependency
Deploy order, feature flags, external configuration, or registry state constrains sequence.

## Risk-first ordering
Prefer early cards that falsify the biggest assumptions cheaply.

Examples:
- prove an SDK supports the required behavior before refactoring every call site;
- create a compatibility reader before writing a data backfill;
- add a regression test before changing a concurrency primitive;
- validate package contents before tagging a release.

## Parallelism test
Parallelize only if all are true:
- no write/write conflict;
- no shared invariant is being redefined independently;
- contract between workers is already stable;
- acceptance can be checked locally;
- parent integration has a named verification step;
- a failed worker does not invalidate another worker's assumptions.

If only file ownership is disjoint, that is not enough.

## Migration planning questions
- Can old and new readers coexist?
- Can old and new writers coexist?
- Is the migration idempotent?
- What happens if it stops halfway?
- Is rollback data-lossless?
- Does rollout need dual-read/dual-write?
- Which metric/log tells us the migration is healthy?

## Acceptance strength
A good acceptance condition can fail when the requirement is broken.

Weak:
- file exists;
- command exits 0 without exercising behavior;
- snapshot updated;
- "all tests pass" with no affected-path proof.

Stronger:
- regression test reproduces old failure then passes;
- compatibility fixture proves old and new format readers;
- clean-install smoke proves packaged CLI entrypoint;
- integration test crosses the exact changed contract.

## Card-size heuristic
A card is too large when:
- it contains multiple independent failure stories;
- implementation could be rejected in one area while accepted in another;
- rollback differs across subparts;
- the acceptance command does not prove all of it.

A card is too small when its only independent meaning is a filename or mechanical step that cannot be reviewed usefully on its own.