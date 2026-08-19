---
name: get-fable
description: Route substantial software work through get-fable's complete coding lifecycle. Use when the user requests Fable-style rigor, when a project has active .fable state, or when the next safe engineering step depends on discovery, research, planning, testing, delegation, verification, review, security, release, handoff, evaluation, or recovery.
---

# get-fable

This is the entry skill. It changes execution discipline around a model; it does not claim to change model weights or reproduce a proprietary model.

## Routing contract

Use `registry.json` as the canonical graph when it is available. Route by the missing evidence or decision, not by task size alone.

Hard precedence:

1. `$fable-recover` for repeated failure, stale execution, or contradictory evidence
2. `$fable-security` for explicit security or trust-boundary work
3. `$fable-release` for merge, publish, tag, or release readiness
4. `$fable-handoff` for durable continuation to another session or agent
5. `$fable-eval` for changes to prompts, skills, hooks, routers, memory, or agent controls
6. `$fable-review` for independent diff, branch, commit, spec, or standards review
7. `$fable-verify` for behavior proof and completion claims
8. `$fable-research` when the decision depends on current external facts or primary sources
9. `$fable-discover` when repository behavior or execution paths are unknown
10. `$fable-delegate` for bounded independent work with explicit ownership
11. `$fable-plan` for architecture, migrations, broad refactors, or multi-file design
12. `$fable-tdd` for testable feature and bug behavior changes
13. `$fable-execute` for an already bounded mutation

## Durable state

When `.fable/state.json` exists, treat it as strict runtime state.

- `docs/SPEC.md` holds requirements and decisions
- `.fable/LEDGER.md` holds cards and acceptance evidence
- `.fable/PROGRESS.md` holds concise resumable context
- `.fable/state.json` holds phase, routing, mutation generation, verification generation, failure state, and typed evidence

Every recognized workspace mutation advances `mutationGeneration`. A previous verification does not prove a newer generation. Substantial completion requires completion-capable passing evidence for the current generation.

## Evidence semantics

Behavior evidence: test, build, runtime, review, observation, security.

Decision evidence: research.

Execution provenance: receipt.

Continuity evidence: handoff.

Do not use one evidence type to claim something it did not check. An execution receipt is not correctness proof. Research is not runtime proof. A clean security review is not functional verification.

## Execution contract

For substantial work:

- resolve load-bearing unknowns before architecture
- convert broad work into bounded acceptance cards
- use red-green behavior checks when the change is meaningfully testable
- delegate only disjoint work with explicit ownership and acceptance
- invalidate old verification after later workspace mutations
- verify the real affected path before completion
- route repeated failure through diagnosis before another repair
- preserve a compact handoff when work crosses a context boundary

A substantial task is complete only when the current mutation generation has passing completion evidence and all task-specific gates are accounted for, or when a precise blocker is reported.
