# Fable Coding Lifecycle v2

Date: 2026-08-19
Base branch: `master`
Base SHA: `be9a9b4b56cb2dc7c90a7a4b125c40574714f37c`

## Goal

Evolve get-fable from a six-skill execution core into a portable coding lifecycle for AI agents while preserving deterministic routing, inspectable state, host-independent skill contracts, and evidence-gated completion.

The project must improve agent process without claiming to reproduce a proprietary model, expose hidden reasoning, or guarantee equivalent model capability.

## Product contract

For substantial software work, get-fable should make the next safe step explicit and answer five questions continuously:

1. What job is being performed?
2. What evidence is still missing before the next decision?
3. What bounded action is allowed now?
4. What proof is required after that action?
5. What state must survive the current session?

## Canonical lifecycle

```text
INTAKE -> DISCOVER -> DECIDE -> PLAN -> BUILD -> PROVE -> SHIP -> CONTINUE -> LEARN
```

The lifecycle is a graph, not a forced linear wizard. Discovery can resume from execution, verification can return to recovery, and recovery can route back to discovery or planning when an assumption changes.

## Canonical skill packs

### Core

- `get-fable`: entry router and global contract
- `fable-discover`: repository/environment evidence
- `fable-plan`: bounded implementation cards
- `fable-execute`: smallest coherent implementation
- `fable-verify`: behavior-level falsification and completion evidence
- `fable-recover`: diagnosis before repeated repair

### Intelligence

- `fable-research`: current external facts and primary-source research

### Build

- `fable-tdd`: red/green behavior changes and regression protection
- `fable-delegate`: bounded parallel work with ownership and acceptance contracts

### Proof

- `fable-review`: independent diff/spec/standards review
- `fable-security`: security routing based on trust boundaries and change shape

### Delivery and continuity

- `fable-release`: release/merge readiness after required gates
- `fable-handoff`: durable continuation state for another session or agent

### Evolution

- `fable-eval`: baseline, trap cases, holdouts, regressions, and accept/reject evidence for changes to agent controls

## Registry v2

The canonical registry becomes the semantic source of truth for skill composition. Each entry adds:

- `pack`
- `intents`
- `requires`
- `produces`
- `gates`
- `fallback`
- `mutatesWorkspace`
- `parallelSafe`

`SKILL.md` remains portable agent guidance. Runtime-only metadata stays in the registry.

## Routing v2

Routing remains deterministic and explainable.

Hard precedence:

1. repeated or stale failure -> `fable-recover`
2. explicit security audit / security-sensitive review -> `fable-security`
3. completion/review claim -> `fable-verify` or `fable-review`
4. current external facts -> `fable-research`
5. unknown repository behavior -> `fable-discover`
6. architecture/migration -> `fable-plan`
7. behavior change/bug fix with testable contract -> `fable-tdd`
8. explicit parallel delegation -> `fable-delegate`
9. release/handoff/eval requests -> their specialist skills
10. bounded code mutation -> `fable-execute`

The routing decision records task shape, selected pack, required gates, fallback skill, and parallel candidates in addition to the existing confidence and reasons.

## State v2

Schema v2 adds mutation-aware verification and workspace identity:

```text
schemaVersion
workspaceId
phase
currentSkill
failureStreak
substantial
mutationGeneration
verifiedGeneration
activeCard
lastDecision
evidence[]
updatedAt
```

`workspaceId` is a content-safe digest of the resolved workspace path; raw local paths are not persisted.

Every workspace mutation increments `mutationGeneration`. Passing completion evidence records the current generation as `verifiedGeneration`. Completion requires fresh completion evidence for the current generation.

Schema-v1 state is migrated on read and written back as v2 only after a normal state mutation.

## Typed evidence

Evidence kinds become:

- `test`
- `build`
- `runtime`
- `review`
- `observation`
- `security`
- `research`
- `receipt`
- `handoff`

Only completion-capable kinds may advance `verifiedGeneration`: test, build, runtime, review, observation, security.

Research evidence supports decisions but cannot prove implementation correctness. Execution receipts support provenance/integrity claims but cannot prove correctness, quality, or security. Handoff evidence supports continuity only.

## Host enforcement

Hosts with lifecycle hooks should record mutation generations and enforce close gates. Hosts without those events apply the same policy through skill contracts and CLI commands.

Host-specific adapters may translate event names but must not fork the canonical semantics.

## External capability adapters

Optional integrations are treated as evidence providers, not dependencies:

- Riqor: ordered run/evidence traces and mutation-aware completion evidence
- AgentProof: execution receipt metadata only
- Codex Security: threat model, diff scan, repository scan, finding validation
- current-source search tools: external research evidence

Absence of an adapter must not prevent the core lifecycle from operating.

## Context compiler

The compiled directive should include only:

- immutable core contract
- selected skill body
- routing reasons and required gates
- compact current state, including mutation/verification generation

Other skills remain behind routing pointers rather than being injected every turn.

## Completion invariants

Substantial work cannot reach `complete` unless:

- current generation has passing completion evidence
- the latest completion evidence for that generation is passing
- no newer mutation exists
- the state is internally valid

Security, release, and review gates are task-dependent and come from registry/routing metadata rather than one universal checklist.

## Compatibility

- Keep current coarse state phases to avoid unnecessary host breakage.
- Preserve existing CLI commands and add mutation-aware operations additively.
- Preserve project initialization and automatic canonical skill installation.
- Continue packaging historical assets separately from canonical lifecycle semantics.

## Acceptance

The change is accepted only when CI proves:

- registry v2 integrity across all canonical skills
- deterministic routing for research, TDD, delegation, security, release, handoff, and eval cases
- schema-v1 state migration
- mutation invalidates prior verification
- fresh verification restores completion eligibility
- non-completion evidence cannot close the completion gate
- prompt compilation remains compact and selected-skill-only
- installer, plugins, CLI, lint, hooks, package inspection, and current tests do not regress
