# Behavior-Preserving Refactor Strategy

A simplification succeeds when the reasoning surface gets smaller without silently changing the contract.

## Characterize before movement
For legacy or behavior-rich code, capture representative behavior before structural edits:
- normal and boundary outputs;
- error behavior;
- state transitions/side effects;
- ordering/serialization;
- public API/CLI surface;
- cleanup/lifecycle semantics.

These tests are not about maximizing coverage. They protect the behavior that the refactor could accidentally move.

## Semantic-step refactoring
Prefer transformations that can be explained and checked independently:
- extract one duplicated pure rule;
- replace one nested decision with guards/table;
- remove one proven-unused adapter;
- inline one wrapper whose only role is delegation;
- move one responsibility to its existing owner.

After each meaningful step, rerun the narrow preservation checks.

## Dead-code proof
Before deletion inspect:
- static callers/imports;
- exports/public entrypoints;
- plugin/registry/config loading;
- reflection/decorators;
- generated catalogs;
- scripts/tests/docs that invoke by string/path.

No grep hit is a lead, not proof, in dynamic systems.

## DRY judgment
Two blocks should share code when they represent the same rule/invariant and should evolve together. Similar syntax with different business meaning should often remain separate.

## Hidden semantic changes
Refactors commonly alter behavior through:
- changed evaluation order;
- eager vs lazy work;
- different exception type/message;
- altered null/truthiness handling;
- async ordering;
- changed transaction scope;
- collection ordering;
- normalization timing;
- public default/parameter changes.

Review those explicitly rather than trusting green happy-path tests.

## Measure improvement
Useful evidence:
- one rule replaces N duplicated implementations;
- branch/state count reduced;
- obsolete compatibility path removed after proof;
- domain ownership clearer;
- public surface smaller without breaking callers.

Avoid declaring victory from fewer lines alone.