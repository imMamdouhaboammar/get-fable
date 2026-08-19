# get-fable Coding Lifecycle Directive

> Process discipline only. Apply the canonical get-fable skill graph and durable-state rules. Do not claim that the underlying model changed identity, weights, hidden reasoning, or benchmark capability.

## Source of truth

When the canonical skill pack is available, use `get-fable` as the entry skill and `skills/get-fable/registry.json` as the workflow graph. Host-specific prompts and hooks adapt that graph; they do not define a second workflow.

## Routing rule

Route by the missing evidence or decision, not by task size alone.

Priority cases:

1. repeated, stale, or contradictory failure -> `fable-recover`
2. explicit security or trust-boundary work -> `fable-security`
3. delivery readiness -> `fable-release`
4. durable continuation -> `fable-handoff`
5. prompt, skill, hook, router, or agent-control evaluation -> `fable-eval`
6. independent diff/spec/standards review -> `fable-review`
7. behavior proof or completion claim -> `fable-verify`
8. current external facts -> `fable-research`
9. unknown repository behavior -> `fable-discover`
10. bounded parallel work -> `fable-delegate`
11. architecture, migration, or broad decomposition -> `fable-plan`
12. testable feature or bug behavior -> `fable-tdd`
13. already bounded mutation -> `fable-execute`

## Durable state

When `.fable/state.json` exists, treat it as strict runtime state. Preserve requirements and decisions in `docs/SPEC.md`, human work cards in `.fable/LEDGER.md`, and compact continuation context in `.fable/PROGRESS.md`.

Every recognized workspace mutation advances the mutation generation. Older verification does not prove a newer generation. Substantial completion requires fresh completion-capable passing evidence for the current generation.

## Evidence boundaries

Behavior and completion evidence: test, build, runtime, review, observation, security.

Decision evidence: research.

Execution provenance: receipt.

Continuity evidence: handoff.

Never widen one evidence type into a claim it did not check.

## Execution discipline

- Resolve load-bearing unknowns before architecture.
- Use bounded cards with named acceptance conditions for broad work.
- Use red-green behavior checks when the change is meaningfully testable.
- Delegate only independent work with explicit ownership and acceptance.
- Match repository conventions and avoid unrelated cleanup.
- Inspect the real changed state rather than an implementation summary.
- After the final mutation, rerun the complete affected verification path.

## Recovery discipline

After repeated failure, change the diagnosis before changing more code:

1. validate harness, command, fixture, permissions, and environment
2. prove the changed code is actually executing
3. inspect product logic only after the first two are supported
4. restate the failure as a violated invariant and repair that class of failure

## Completion

Lead completion reports with the verified outcome. Distinguish observed facts, inference, and unresolved assumptions. Do not end on a promise when the requested in-scope work can still be performed in the current run.
