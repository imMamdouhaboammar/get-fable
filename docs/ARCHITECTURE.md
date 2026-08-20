# Architecture: get-fable 1.2

## Purpose

`get-fable` is a local-first coding lifecycle for AI-assisted software work. It makes high-value process behavior inspectable: evidence gathering, current-source research, bounded planning, test-first changes, delegation, verification, review, security checks, release readiness, handoff, evaluation, and failure recovery.

It changes process around a model. It does not modify model weights or claim proprietary-model equivalence.

## Core flow

```text
user task
  -> deterministic task router
  -> canonical registry v2
  -> selected skill contract
  -> compact prompt compiler / host adapter
  -> execution
  -> mutation-aware durable state
  -> typed evidence
  -> verification / review / security / release
  -> handoff or completion

repeated failure -> recovery -> new diagnosis -> next safe skill
```

The root `skills/` directory and `skills/get-fable/registry.json` are the semantic source of truth. Host-specific files are adapters only.

## Canonical packs

Core: `get-fable`, `fable-discover`, `fable-plan`, `fable-execute`, `fable-verify`, `fable-recover`

Intelligence: `fable-research`

Build: `fable-tdd`, `fable-delegate`

Proof: `fable-review`, `fable-security`

Delivery: `fable-release`, `fable-handoff`

Evolution: `fable-eval`

Historical material under `assets/` remains an optional reference library and is not the canonical lifecycle.

## Registry v2

Each skill entry declares:

```text
id
order
phase
pack
description
intents
requires
produces
gates
fallback
mutatesWorkspace
parallelSafe
next
keywords
```

The registry validates every canonical skill file and all `next` and `fallback` references at load time.

## Deterministic routing

Source: `src/core/task-router.ts`

Routing stays deterministic and explainable. Hard signals cover repeated failure, explicit security work, release readiness, handoff, evaluation, code review, behavior verification, current external research, repository discovery, delegation, architecture, testable behavior changes, and bounded execution.

A routing decision records:

```text
selectedSkill
selectedPack
taskShape
confidence
reasons
requiresPlan
requiredGates
fallbackSkill
parallelCandidates
nextSkills
scores
```

Routing scores are non-negative additive weights, not normalized probabilities;
values greater than one are expected. Confidence is the normalized `0..1`
summary. Persisted scores are explanatory routing provenance and do not override
the validated skill, pack, and task-shape scope tuple.

The router does not expose hidden chain-of-thought. Reasons are concise routing evidence.

## State schema v3

Source: `src/core/state.ts`

Initialized projects receive `.fable/state.json` with:

```text
schemaVersion
stateRevision
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

`workspaceId` is a short digest of the canonical real workspace path rather than a stored raw local path. Symlink aliases of the same workspace resolve to one identity, while schema-v2 or schema-v3 runtime state copied to another workspace is rejected.

Every new evidence record is also stamped with the state's `workspaceId`. A record carrying a different owner is invalid. Historical records without an evidence-level owner remain readable for compatibility, but they are not fresh completion proof until verification runs again in the current workspace.

The tracked repository template stays schema v1 and workspace-neutral. Its state container binds to the current workspace during migration, but historical schema-v1 evidence is not silently rebound into fresh proof. Schema-v2 runtime state migrates explicitly, and the next state mutation writes schema v3 with a monotonically increasing `stateRevision`.

## Mutation-aware verification

Every recognized workspace mutation advances `mutationGeneration`.

Write-oriented tool failures are treated conservatively as potential
mutations. A host failure only proves that the operation did not finish
successfully; it does not prove that no partial filesystem change occurred.
Read-only and command tools remain excluded by the mutation hook allowlist.

```text
mutationGeneration = 4
verifiedGeneration = 4
=> verification can be current

new mutation
mutationGeneration = 5
verifiedGeneration = 4
=> previous verification is stale
```

Substantial completion requires the newest evidence accepted for the routed claim, current generation, and current workspace to pass.
The completion gate is evaluated even when the requested phase is already
`complete`, preventing an idempotent transition from reaffirming stale state
after a later mutation.

Generic behavior-completion evidence kinds:

- test
- build
- runtime
- review
- observation

Security evidence is completion-capable only when the active routed job is itself a security review. It does not by itself close a normal feature, bug fix, or product repair. After a security repair mutates product behavior, behavior-appropriate verification is required again.

Evidence order remains significant across those scopes. A current-generation security failure that follows a functional pass blocks completion even for a non-security task. The gate reopens only after a newer completion-capable pass; an unrelated or security-only pass cannot erase a functional failure boundary.

When a canonical routing decision exists, completion scope comes from it, not the transient execution-stage skill. For legacy state without a routing decision, only the narrow canonical security `currentSkill` fallback may apply. Security evidence can close work only when the routed skill, pack, and task shape consistently identify security work. A contradictory or malformed decision is handled conservatively and cannot widen the accepted evidence kinds or activate the legacy fallback.

Non-completion evidence:

- research: supports decisions
- receipt: supports execution provenance
- handoff: supports continuity

One evidence type cannot be widened into a claim it did not check.

## Coarse phases, specialist skills

The durable phase vocabulary remains intentionally small for host compatibility:

```text
idle
discovering
planned
executing
verifying
recovering
complete
blocked
```

Several specialist skills can share one coarse phase. For example TDD and delegation execute, while review, security, release, handoff, and eval use the verifying phase. `currentSkill` preserves the specialist identity.

## Context compiler

Source: `src/core/prompt-compiler.ts`

The compiler injects only:

```text
short runtime contract
selected skill body
routing reasons
required gates
compact current state
```

It does not inject all skills or the historical prompt library on every request.

## CLI

Source: `src/cli.ts`

Lifecycle commands include:

```text
init
route <task> [--apply] [--json]
state <phase> [--substantial] [--json]
card <text> [--clear] [--json]
mutation [source] [--json]
evidence <pass|fail> <kind> <source> <detail> [--json]
doctor [--json]
status [--json]
lint
serve [port]
router [port]
```

Running without a command remains non-mutating.

## Host enforcement

### Claude Code

Lifecycle hooks restore state at session start, guard broad delegation, track command failure, advance mutation generations after successful write-oriented tools, and block stale substantial completion.

### Antigravity / Gemini

The installer copies the same canonical skills and hook implementations. The mutation hook includes an internal write-tool allowlist because host event matching can be broader than Claude's matcher semantics.

### Codex / ChatGPT

The package exposes the canonical skills and Codex plugin metadata. Repo-local Codex profiles remain optional execution aids and inherit the active model.

### Generic Agent Skills hosts

Hosts can consume root `skills/`. Without lifecycle hooks, mutation and evidence transitions can be applied explicitly through the CLI and skill contracts.

## Recovery

Repeated failure routes to `fable-recover` before another blind repair. Diagnosis follows this order:

1. harness, command, fixture, permission, environment
2. actual execution path, branch, build, cache, generated output, runtime identity
3. product logic
4. violated invariant

A retry should add evidence or change the diagnosis.

## Optional evidence adapters

External capabilities are optional providers, not dependencies:

- Riqor: ordered run/evidence traces
- AgentProof: execution receipt metadata
- Codex Security: threat modeling, diff scans, repository scans, finding validation
- current-source search: external research evidence

Their evidence remains scoped to what they actually observe.

## Evaluation

`fable-eval` applies a software-change discipline to prompts, skills, hooks, routers, memory, and other agent controls:

```text
capability gap
-> reproducible baseline
-> one bounded intervention
-> known scenarios
-> unseen holdouts
-> regression and safety checks
-> accept or reject
-> rollback
```

Repository trap scenarios live under `eval/scenarios/` and are executable through `test/eval.test.ts`.

## Request proxy trust boundary

Source: `src/router/index.ts`

The proxy accepts documented OpenAI-style and supported translated request shapes, compiles contextual Fable guidance, and returns a preview or forwards to one explicitly configured HTTP/HTTPS upstream.

Safety defaults remain loopback binding, no permissive CORS by default, bounded body size, bounded upstream timeout, and HTTP/HTTPS upstream schemes only. The proxy does not provide its own authentication boundary.

## Verification strategy

Repository CI checks:

- typecheck
- full tests
- coverage on the primary runtime
- build
- CLI and maturity smoke
- package inspection
- Ubuntu at the declared Bun floor
- Ubuntu and macOS at the pinned current Bun runtime

Lifecycle-specific tests cover routing ambiguity, schema migration, canonical workspace identity, mutation freshness, scoped evidence boundaries, hook parity, installer idempotency, plugin shape, and holdout-style trap scenarios.

## Related docs

- `README.md`
- `docs/USAGE.md`
- `docs/PLUGIN.md`
- `docs/superpowers/specs/2026-08-19-fable-coding-lifecycle-v2.md`
- `hooks/README.md`
- `SECURITY.md`
- `THIRD_PARTY_NOTICES.md`
