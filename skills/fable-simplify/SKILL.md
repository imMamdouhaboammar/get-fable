---
name: fable-simplify
description: "Refactor and simplify settled, recently modified code to improve readability, remove dead branches, flatten deeply nested logic, and reduce duplication while preserving behavior. Use when cleaning up complex functions, eliminating boilerplate, deduplicating logic, or improving code altitude after tests pass — even if the user does not explicitly say \"fable-simplify\" (e.g. \"simplify this code\", \"clean up this function\", \"refactor this logic\", \"make this cleaner\"). Do NOT use when tests are failing (use fable-recover) or for speculative architectural rewrites (use fable-plan)."
version: 1.3.0
pack: system
inputs:
  - target_module
requires:
  - passing_tests
produces:
  - simplified_diff
gates:
  - behavior_preserved
  - tests_pass
fallback: fable-verify
mutatesWorkspace: true
parallelSafe: false
neural_links:
  precursors:
    - fable-execute
  continuations:
    - fable-verify
    - fable-review
  lateral_peers:
    - fable-execute
  recovery: fable-recover
---

# Fable Simplify

Reduce accidental complexity while proving the externally relevant behavior and contracts did not change.

## Mission
Simplification is not permission for a broad rewrite. It should make the code easier to reason about through small, reviewable transformations backed by characterization/invariant evidence.

"Cleaner" is subjective. Behavior preservation, reduced duplication/branching/indirection, and clearer ownership can be demonstrated.

## Activate When
- duplicated logic creates divergence risk;
- nested/control-flow complexity obscures invariants;
- dead code/obsolete indirection is proven unused;
- a refactor is explicitly requested with no intended behavior change;
- a completed implementation needs bounded cleanup before review.

## Do Not Activate When
- user-visible behavior/API/schema is intended to change (`fable-tdd`/`fable-execute`);
- behavior is not characterized well enough to preserve;
- architecture itself is being redesigned (`fable-plan`);
- a cleanup opportunity is unrelated to the active card.

## Simplification Classification
| Smell | Safe first move |
| --- | --- |
| duplicated behavior | prove equivalence, extract shared rule |
| nested branching | identify decision table/invariants, flatten incrementally |
| dead code | prove no runtime/registration/reflection reachability |
| wrapper/indirection | prove callers/semantics before collapse |
| data transformation chain | characterize representative + boundary inputs |
| public/internal API clutter | preserve public contract; simplify behind boundary |
| generated code noise | change generator/source, not output manually |

## Protocol
### Stage 1 — Establish preservation contract
State what must not change:
- public inputs/outputs/errors;
- side effects/state transitions;
- serialization/order/timing where contractual;
- package/API/CLI compatibility;
- performance requirements if material.

Capture baseline tests/fixtures/runtime evidence. If coverage is weak, add characterization before structural mutation.

### Stage 2 — Identify the complexity to remove
Name it concretely: duplicated condition, unnecessary branch, dead adapter, repeated parsing, ownership split, obsolete compatibility path.

Avoid "modernize this module" as an unbounded objective.

### Stage 3 — Prove reachability/deadness before deletion
Search callers plus dynamic registration/plugin/reflection/generated paths. "grep found no import" is not enough for code that may load dynamically.

### Stage 4 — Refactor one semantic step at a time
Examples:
- extract a shared pure rule;
- replace nested branch with explicit guard/decision table;
- collapse wrapper whose contract is identical;
- remove dead branch after reachability proof.

Run the narrow preservation checks after each meaningful step.

### Stage 5 — Watch for accidental contract changes
Review diff for:
- changed exception/error type/message relied on by callers;
- iteration/order changes;
- truthiness/null semantics;
- eager vs lazy evaluation;
- async sequencing;
- transaction/cleanup movement;
- public export/signature/default changes;
- performance/resource behavior if required.

### Stage 6 — Measure simplification honestly
Useful evidence can include:
- fewer duplicated rules/branches;
- smaller public surface;
- fewer states/indirection layers;
- improved named invariant ownership.

Line count alone is not a quality metric.

### Stage 7 — Fresh verify and review
After the last refactor mutation, run fresh affected verification and independent diff review. A pre-refactor green baseline is stale for the simplified code.

## Decision Rules
- No characterization/proof for behavior-rich legacy code → add it before refactor.
- Removing dead code requires runtime reachability confidence, including dynamic registries/plugins.
- If simplification reveals a desired behavior change, split it into a separate TDD/execution card.
- Prefer a few reversible transformations over a from-scratch rewrite.
- Do not collapse abstraction when it represents a real domain/ownership boundary even if it adds lines.
- Avoid DRY when two similar blocks encode different future invariants; shared syntax is not always shared concept.
- If tests break, diagnose whether refactor changed behavior or test was coupled to internals; do not blindly revert/update assertions.

## Invariants
- Accepted external behavior remains unchanged.
- Public contracts do not drift accidentally.
- Each transformation is reviewable and evidence-backed.
- Unrelated cleanup stays out of scope.
- Dynamic/generated reachability is considered before deletion.
- Verification is fresh after final mutation.

## Failure Taxonomy
### Behavior drift
Refactor changes output/error/state/order. Restore invariant or separate intended behavior change.

### Test coupling
Tests fail because they assert internal structure rather than contract. Determine whether test or code should change from accepted behavior—not preference.

### False dead code
Dynamic registration/reflection/plugin path still reaches code. Restore and improve discovery evidence.

### Abstraction collapse
Removed layer encoded a real boundary/invariant. Reintroduce clearer boundary rather than optimizing line count.

### Scope creep
Refactor expands into architecture/feature work. Stop and split/replan.

### Complexity displacement
Code gets shorter locally but moves complexity into callers/config/generic abstraction. Evaluate whole affected decision surface.

## Anti-Patterns
- rewriting a module from scratch to "simplify" it;
- using line count as primary success metric;
- deleting code because no static import exists;
- DRY extraction across semantically different rules;
- changing API signatures during cleanup;
- updating tests to match refactor without checking contract;
- bundling unrelated cleanup after feature work;
- replacing explicit domain logic with clever generic abstraction.

## Simplification Packet
```text
Preservation contract:
Baseline evidence:
Complexity targeted:
Reachability/deadness evidence:
Transformations:
Risky semantic deltas checked:
Fresh verification:
Review result:
Measured simplification:
Deferred behavior changes:
```

## Completion Criteria
Simplification completes when:
- complexity reduction is concrete and scoped;
- behavior/public contracts are characterized and preserved;
- deletion/refactor reachability assumptions are grounded;
- final evidence is fresh;
- independent review finds no hidden behavior drift;
- no unrelated behavior change is smuggled into cleanup.

## Progressive Resources
- Deep guide: `references/behavior-preserving-refactor-strategy.md`
- Existing patterns: `references/refactoring-patterns.md`
- Example: `examples/flatten-nested-logic.md`
