# Bounded Mutation and Failure Classification

Execution quality often fails in two places: scope quietly expands, or the agent reacts to every red command by editing more code without understanding what the failure means.

## Scope containment
Before the first edit, write down:
- outcome;
- allowed semantic surface;
- forbidden/unrelated surface;
- acceptance proof;
- assumptions that would force replanning if false.

A file list can help ownership, but semantic scope matters more. A one-line public API change may have a wider behavior surface than five private implementation files.

## Source-of-truth check
Before editing manifests, generated catalogs, lockfiles, schemas, or compiled output ask:
- Is this file generated?
- What command/source produces it?
- Should it be regenerated after source change?
- Will manual edits be overwritten?

Edit the source-of-truth, then regenerate deterministically.

## Failure classification after a mutation

### Introduced mechanical defect
Examples: syntax error, type mismatch caused by edit, missing import. Fix locally; the current hypothesis has not necessarily failed.

### Behavioral hypothesis disproved
Code runs but target assertion/behavior remains wrong. Update the hypothesis before a second substantial edit.

### Hidden dependency
Correct fix requires another contract/component not in the card. Stop and replan; do not quietly broaden.

### Harness/artifact failure
Wrong build, stale dist, test not reaching path, env mismatch. Do not keep editing product logic to satisfy misleading output.

### Acceptance mismatch
Command passes but never exercises changed behavior. Passing is not proof; strengthen acceptance.

## Concurrent user changes
When target files contain unrelated legitimate changes:
- inspect the diff first;
- preserve them;
- make surgical contextual edits;
- do not use reset/checkout/wholesale overwrite to simplify your task;
- if ownership is ambiguous, stop and surface the collision.

## Immediate verification
Use narrow feedback early because it preserves causality. After a coherent mutation, run the card-level check before adding a second behavior change. Full-suite verification belongs later, but long untested mutation chains make failures expensive to diagnose.

## Scope-expansion test
Stop execution if any answer becomes yes:
- Do we need a new public contract?
- Did a load-bearing assumption become false?
- Must we change an unowned persistence/schema boundary?
- Is a migration/rollback strategy now required?
- Does the acceptance condition need redesign rather than implementation?

Those are planning/discovery signals, not permission to improvise.