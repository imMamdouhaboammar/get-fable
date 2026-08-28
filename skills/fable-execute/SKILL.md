---
name: fable-execute
description: >
  Implement one accepted, bounded work card with immediate local verification, invariant preservation, and zero scope drift. Use when executing a planned work card, applying a well-defined code change, implementing an isolated function, or performing targeted single-scope edits — even if the user does not explicitly say "fable-execute" (e.g. "implement this card", "write the code for this step", "apply the agreed changes", "build this component"). Do NOT use when new architectural decisions are required (use fable-plan) or when tests are repeatedly failing (use fable-recover).

version: 1.3.0
pack: core
inputs:
  - accepted_card
requires:
  - bounded_scope
produces:
  - implementation_diff
  - card_completion
gates:
  - invariants_preserved
  - acceptance_checked
fallback: fable-plan
mutatesWorkspace: true
parallelSafe: false
neural_links:
  precursors:
    - fable-plan
    - fable-tdd
    - fable-delegate
  continuations:
    - fable-verify
  lateral_peers:
    - fable-simplify
  recovery: fable-recover
---

# Fable Execute

Implement one accepted change without turning a bounded card into an unreviewable wandering session.

## Mission
Execution owns implementation, not architecture discovery. The agent should make the smallest coherent change that satisfies the accepted card, keep invariants visible, validate immediately, and stop when new facts invalidate the plan.

"Minimal" means minimal behaviorally complete diff, not necessarily the fewest changed lines.

## Activate When
- scope and acceptance are explicit;
- load-bearing architecture/external facts are settled;
- the card can be implemented without inventing a new public contract;
- the task is a bounded static/config/docs change where TDD adds no meaningful proof;
- a TDD Skill has already established RED and implementation is ready.

## Do Not Activate When
- a behavior change still needs a valid RED (`fable-tdd`);
- implementation reveals a new architecture decision (`fable-plan`);
- a repeated failure needs diagnosis (`fable-recover`);
- the task is to independently verify or review an existing diff (`fable-verify`/`fable-review`).

## Change Classification
Before editing, classify the card:

| Change | Execution concern |
| --- | --- |
| Local behavior | preserve surrounding contract |
| Config/manifest | precedence, generated source, packaging |
| Public API/CLI | compatibility and caller impact |
| Data/persistence | transaction/migration invariant |
| Generated output | edit source/generator, regenerate once |
| Dependency wiring | lifecycle/cleanup/error propagation |
| Repair after TDD | satisfy RED without widening behavior |
| Repair after review | fix only grounded finding + affected proof |

## Protocol

### Stage 1 — Re-read the card against current workspace
Confirm:
- objective;
- owned scope;
- prohibited scope;
- dependencies/assumptions;
- acceptance evidence;
- current git/workspace state.

If the workspace changed since planning in a way that invalidates assumptions, stop and replan rather than force the old card through.

### Stage 2 — Inspect before mutation
Read the exact target code and its immediate contracts/callers/tests. Avoid broad rediscovery, but do not edit from stale memory.

Identify invariants that must stay true during the change.

### Stage 3 — Choose the smallest coherent mutation
Prefer:
- existing repository patterns;
- source-of-truth over generated output;
- local compatibility over speculative abstractions;
- reversible changes when uncertainty remains;
- one behavior change at a time.

### Stage 4 — Mutate and record impact
Track:
- files/surfaces changed;
- new/changed contract;
- generated artifacts affected;
- acceptance command required after this mutation.

If an edit crosses card boundaries, pause and explain why before continuing.

### Stage 5 — Immediate acceptance check
Run the narrowest meaningful acceptance evidence as soon as the coherent mutation exists.

A command exit code alone is insufficient if it does not exercise the changed behavior.

### Stage 6 — Classify failure before another edit
On failure ask:
- expected RED from ongoing TDD?
- typo/compile issue introduced by current edit?
- incorrect implementation hypothesis?
- stale/build/config/harness problem?
- hidden dependency/architecture change?

Only make another mutation if the failure provides new information that justifies it.

### Stage 7 — Clean the diff
Before handoff:
- remove debug output/dead experiments;
- inspect accidental formatting or generated noise;
- verify no unrelated file changed;
- regenerate deterministic outputs from source when required;
- preserve user-owned concurrent changes.

### Stage 8 — Handoff for independent verification
Send `fable-verify`:
- card objective;
- diff/touched surfaces;
- acceptance command/result;
- invariants considered;
- generated/config impacts;
- residual risk and unverified surfaces.

## Decision Rules
- New load-bearing unknown → stop and route to discover/research/plan.
- New architecture/public contract decision → `fable-plan`; do not hide it as implementation detail.
- Behavior change with no valid regression test where one is feasible → `fable-tdd`.
- Generated file requested → locate generator/source and mutate source; regenerate output afterward.
- Existing user/unrelated changes in target file → preserve them and make the smallest contextual edit; do not reset/overwrite wholesale.
- Acceptance fails for a clearly introduced syntax/type error → repair directly, rerun, and keep scope bounded.
- Similar implementation hypothesis fails repeatedly → `fable-recover`; arbitrary "try again" loops are forbidden.
- Acceptance command passes but does not exercise the changed path → do not claim card completion; strengthen acceptance or hand off with that gap explicit.

## Invariants
- Card scope does not expand silently.
- User/unrelated changes are preserved.
- Source-of-truth is edited instead of derived output when applicable.
- Every meaningful mutation makes prior verification stale.
- No unrelated cleanup is bundled into a repair unless required for correctness.
- Acceptance evidence corresponds to the changed behavior.

## Failure Taxonomy
### Local implementation defect
Current edit causes a direct syntax/type/assertion failure. Fix within card.

### Hypothesis failure
Code is valid but behavior remains wrong. Revise hypothesis; repeated similar failures route to recovery.

### Hidden dependency
Correct behavior requires a component/contract outside the accepted card. Stop and replan scope.

### Harness/artifact mismatch
Commands execute stale build, wrong env, wrong branch, or generated artifact. Route to recovery when this obscures causal evidence.

### Acceptance weakness
Check passes without exercising the change. Strengthen proof before completion.

### Concurrent-work conflict
Target contains legitimate changes not owned by this card. Preserve them, narrow edit, or coordinate ownership; never overwrite for convenience.

## Anti-Patterns
- "while I'm here" refactors;
- editing generated files directly;
- broad search/architecture work after execution starts;
- retrying the same patch with superficial syntax changes;
- replacing an entire user-modified file for a small fix;
- accepting a build pass as functional proof when behavior is not exercised;
- adding abstraction/configurability not required by the card;
- hiding an architecture decision inside implementation.

## Execution Packet

```text
Card:
Owned scope:
Files/surfaces changed:
Behavior/contract delta:
Acceptance command/result:
Invariants checked:
Generated/config impacts:
Unexpected facts:
Residual risk:
Recommended verify scope:
```

## Completion Criteria
Execution completes when:
- the accepted behavior is implemented within explicit scope;
- immediate acceptance evidence is green or any proof gap is explicitly handed off;
- diff contains no accidental/unrelated mutation;
- new architecture decisions have not been smuggled into implementation;
- the verification specialist has a precise map of what changed and what remains to falsify.

## Progressive Resources
- Deep containment guide: `references/bounded-mutation-and-failure-classification.md`
- Existing containment reference: `references/mutation-containment.md`
- Example: `examples/bounded-card-execution.md`
