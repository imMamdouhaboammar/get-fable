# Jev question contracts

## First-pass request

Use one `systemOne` call with structured state and multiple parallel questions.

### `selected_skill`: Choice

Criteria keys are the canonical skill ids except `get-fable`.

Each criterion is generated from the registry, augmented by a small hand-maintained semantic boundary table.

Example criterion:

```json
{
  "fable-discover": {
    "job": "Gather repository/runtime evidence before planning or mutation",
    "use_when": ["the execution path is unknown", "repository facts must be inspected"],
    "not_when": ["the main missing fact is current external documentation", "a concrete bounded card is already accepted"]
  }
}
```

Do not dump entire SKILL.md files into the first pass.

### `task_shape`: Choice

Options match `FableTaskShape`:

- research
- architecture
- bug-fix
- feature
- delegation
- review
- security
- release
- handoff
- eval
- bounded-change
- unknown

This result is diagnostic in v1. The final task shape remains produced by deterministic route construction until separately promoted by evaluation.

### Companion Nouls

Each question must be atomic and literal.

Examples:

```text
needs_recovery:
The task describes a repeated failed attempt, stale execution path, wrong branch/build/cache, or an unresolved contradiction that should be diagnosed before another code edit.

security_relevant:
The task's primary requested work is a security or trust-boundary activity, not merely code that happens to mention authentication.

needs_current_external_research:
The task cannot be implemented responsibly without checking current external official documentation, API behavior, release notes, or version-specific facts.

needs_planning:
The requested work has enough cross-file, architectural, migration, or sequencing complexity that a bounded plan should precede implementation.

needs_behavior_verification:
The user's primary request is to prove, validate, or falsify current behavior rather than to make a change.

is_behavior_change:
The request asks to change product/runtime behavior in a way that should receive test-first regression coverage.

benefits_from_delegation:
The request contains multiple genuinely independent work items that can be assigned with disjoint ownership.
```

## Second-pass request

State contains:

- sanitized task
- relevant lifecycle state
- deterministic route and reasons
- top three Jev candidate skill ids/probabilities
- full registry description, intents, gates, requires/produces, and selected excerpts for only those candidates

Questions:

1. `best_candidate`: Choice(top3 + `none_of_these`)
2. `candidate_fits`: Noul asking whether the selected candidate directly owns the primary requested job

Second-stage output is used only for disambiguation.

## Why no numeric Score in the critical path

Jev 1.13 documentation warns against numeric precision and exact interpolation. Routing does not need a pseudo-precise 0-10 risk score. Risk tier is code-owned, and ambiguity already has probabilities/confidence.

Score may later be used for descriptive experimental features such as semantic complexity, but it is excluded from v1 authority.

## Cardinality

The current get-fable skill count fits comfortably below Jev Choice's documented 255-option limit.

## Model pinning

Production-like eval and any guarded/authority mode use an approved versioned model id such as `jev-1.13.0`, not `jev-latest`.

`jev-latest` may be used only in explicit exploration commands.
