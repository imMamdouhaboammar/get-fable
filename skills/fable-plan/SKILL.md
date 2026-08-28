---
name: fable-plan
description: >
  Convert discovery evidence into bounded, testable work cards with explicit acceptance criteria and architectural invariants. Use when designing multi-file features, planning complex refactors, decomposing architectural migrations, or structuring multi-step implementation tasks — even if the user does not explicitly say "fable-plan" (e.g. "plan this feature", "design the architecture", "break this task down", "create an implementation plan"). Do NOT use when load-bearing facts remain unknown (use fable-discover first) or for trivial single-scope bug fixes (use fable-tdd or fable-execute).

version: 1.3.0
pack: core
inputs:
  - requirements
  - evidence
requires:
  - load_bearing_unknowns_resolved
produces:
  - accepted_card
  - acceptance_condition
gates:
  - bounded_scope
  - named_acceptance
fallback: fable-discover
mutatesWorkspace: false
parallelSafe: false
neural_links:
  precursors:
    - fable-discover
    - fable-research
  continuations:
    - fable-tdd
    - fable-delegate
    - fable-execute
  lateral_peers:
    - fable-config
  recovery: fable-recover
---

# Fable Plan

Turn grounded evidence into an executable change strategy with explicit dependencies, risk boundaries, acceptance proof, and integration ownership.

## Mission
A plan is not a list of files to edit. It is a set of decisions that makes implementation boring enough to execute safely.

The planner should remove architectural uncertainty, expose order constraints, define what "done" means, and separate work only where the pieces can genuinely be reasoned about and verified independently.

## Activate When
- the task spans multiple files/components or introduces a new contract;
- a migration, schema change, public API change, or cross-package refactor is required;
- implementation requires sequencing or rollback reasoning;
- parallel workers may help but ownership/integration must be designed;
- requirements are understood but not yet decomposed into verifiable work.

## Do Not Activate When
- load-bearing facts are still unknown (`fable-discover`/`fable-research`);
- the change is truly bounded to one obvious edit with clear acceptance (`fable-execute`);
- the immediate job is to reproduce a behavior in a test (`fable-tdd`).

## Change Classification
Classify before decomposing.

| Change type | Main planning concern |
| --- | --- |
| Bounded behavior | acceptance and regression surface |
| Cross-module feature | contracts + integration points |
| Refactor | invariant preservation + staged compatibility |
| Data/schema migration | forward/backward compatibility + rollback |
| Public API/CLI | compatibility + versioning + docs/tests |
| Dependency upgrade | behavior delta + transitive risk |
| Security-sensitive | trust boundaries + fail-closed behavior |
| Release/distribution | artifact boundaries + external verification |

## Planning Protocol

### Stage 1 — Restate the contract
Capture:
- requested outcome;
- non-goals;
- evidence already established;
- externally visible behavior that must not regress;
- unresolved items and why they are non-blocking.

If a blocking unknown remains, stop and route back to discovery/research.

### Stage 2 — Map the change graph
Identify:
- components touched;
- contracts between them;
- data/state transitions;
- migration or compatibility edges;
- shared integration hotspots;
- generated artifacts and their sources;
- verification surfaces.

Represent ordering as dependencies, not just numbered tasks.

### Stage 3 — Choose seams for decomposition
A card should have one coherent reason to change and one clear acceptance story.

Do **not** require disjoint files as a universal rule. Two cards may touch one integration file sequentially if ownership/order is explicit. Conversely, two cards touching different files may still be unsafe to parallelize if they change one shared invariant or contract.

### Stage 4 — Plan risk-first
Move high-uncertainty or irreversible decisions earlier where possible:
- prove migration shape before broad data rewrite;
- prove compatibility adapter before deleting legacy path;
- prove third-party API contract before wiring all call sites;
- introduce observability before risky runtime changes.

### Stage 5 — Define each card
Each card must state:
- objective and user-visible effect;
- owned scope and prohibited scope;
- dependencies/preconditions;
- implementation notes only where they constrain correctness;
- acceptance evidence/commands;
- rollback or recovery note when failure is costly;
- handoff/integration expectation.

### Stage 6 — Define integration ownership
Name who/what proves the combined result. Worker-local green is not enough for cross-card behavior.

### Stage 7 — Check the plan against failure
Ask:
- What if card 2 fails after card 1 lands?
- Can old and new formats coexist during migration?
- Is any step irreversible?
- Does rollback preserve data/contracts?
- Are tests capable of detecting the main regression?
- Does parallel execution create merge or semantic conflicts?

## Decision Rules
- Unknown architecture → `fable-discover`; unknown external contract → `fable-research`.
- Behavior change with a testable contract → route the first implementation card through `fable-tdd`.
- Parallelize only when dependencies, ownership, shared invariants, and integration points make concurrency safe.
- Prefer staged compatibility over flag-day replacement when old/new callers or persisted data may coexist.
- If a card cannot name falsifiable acceptance evidence, it is not ready.
- If planning produces more than roughly 5 tightly interdependent cards, consider milestone boundaries or a different architecture rather than mechanically splitting more.
- Generated files belong to the card that changes their source/generator, not as independent manual edits.

## Invariants
- Every card traces back to a requirement or necessary enabling constraint.
- No blocking architectural unknown is hidden inside an execution card.
- Acceptance checks prove behavior, not merely file existence.
- Integration verification has an owner.
- Destructive/irreversible steps have explicit safeguards or rollback reasoning.
- Parallelism is justified by dependency analysis, not by file count alone.

## Failure Taxonomy
### Hidden dependency
A card unexpectedly requires another component. Update the dependency graph; do not let execution silently broaden scope.

### False independence
Cards touch disjoint files but share one invariant/contract. Serialize or define a compatibility seam.

### Acceptance weakness
A proposed check can pass while behavior is still broken. Strengthen the acceptance condition before execution.

### Migration hazard
Old/new states can coexist in production but plan assumes atomic cutover. Add compatibility, backfill, or staged rollout.

### Scope explosion
A card keeps discovering architectural work. Stop, return to discovery/plan, and redraw boundaries.

## Anti-Patterns
- one card per file;
- requiring disjoint files even when sequential integration is safer;
- parallelizing based only on "different files";
- acceptance such as "tests pass" without naming relevant behavior;
- hiding migrations/rollbacks inside implementation prose;
- treating documentation/generated output as separate cards when they are part of one behavior change;
- producing a long task list with no dependency model;
- over-specifying code line-by-line before execution evidence exists.

## Work Card Template

```text
Card: <outcome>
Why: <requirement/risk>
Depends on:
Owns:
Must not change:
Behavior/invariant:
Implementation constraints:
Acceptance evidence:
Rollback/recovery:
Integration handoff:
Parallel-safe with:
```

## Completion Criteria
Planning is complete when:
- blocking unknowns are gone;
- dependency/order constraints are explicit;
- cards are coherent and bounded by behavior, not arbitrary file slicing;
- each card has falsifiable acceptance evidence;
- migration/compatibility/rollback concerns are addressed where relevant;
- parallel work, if proposed, has explicit semantic ownership and integration proof.

## Progressive Resources
- Deep decomposition guide: `references/risk-and-dependency-decomposition.md`
- Existing decomposition rules: `references/decomposition-rules.md`
- Template: `templates/work-card.template.md`
- Example: `examples/multi-file-migration-plan.md`
