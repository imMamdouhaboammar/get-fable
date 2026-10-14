# Modular frontier execution core design

## Goal

Turn get-fable from a collection of prompts, hooks, and assets into an inspectable execution framework that reliably improves how an LLM plans, acts, verifies, and recovers on substantial work.

The framework must improve behavior without claiming that it changes model weights, reproduces a proprietary model, or guarantees frontier-model capability.

## Product invariant

A stronger result comes from forcing high-value behaviors that weaker or rushed agents commonly skip:

1. evidence before architecture
2. bounded plans before broad edits
3. focused execution with explicit acceptance
4. adversarial verification before completion
5. diagnosis before repeated repair
6. durable state outside the conversation
7. compact context instead of one giant static prompt

## Canonical skill graph

The root `skills/` directory is the canonical workflow source.

Ordered skills:

1. `get-fable` - entry router and global contract
2. `fable-discover` - inspect code, docs, environment, and load-bearing unknowns
3. `fable-plan` - convert evidence into bounded cards and acceptance criteria
4. `fable-execute` - implement one accepted card without scope drift
5. `fable-verify` - falsify the implementation and collect real evidence
6. `fable-recover` - diagnose repeated failure before another edit

A machine-readable `skills/registry.json` defines triggers, phase ownership, and allowed transitions. Host-specific files may adapt this graph but must not become independent sources of truth.

## Runtime routing

Routing is deterministic and explainable. A task receives weighted signals for discovery, planning, execution, verification, and recovery. The router returns:

- selected skill
- confidence
- reasons
- whether planning is required
- next allowed skills

Recovery has precedence when repeated-failure signals exist. Verification has precedence for review/completion requests. Discovery wins when the request depends on unknown repository or external facts. Planning wins for architecture, migration, or broad multi-file work. Otherwise execution is the default.

## Durable state

Initialized projects receive `.fable/state.json` with schema version 1.

Phases:

`idle -> discovering -> planned -> executing -> verifying -> complete`

Failure can move `executing` or `verifying` to `recovering`. Recovery may return to discovery, planning, or execution. Invalid transitions are rejected.

The state records the current skill, failure streak, last routing decision, evidence records, and update timestamp. Markdown files remain human-readable working artifacts; JSON state supplies strict runtime semantics.

## Evidence gate

Completion is not a prose decision. Evidence records have a kind, command or observation, result, and timestamp. A completion transition requires at least one passing evidence record for substantial work.

The existing ledger remains supported. `fable lint` validates both ledger annotations and state consistency when state exists.

## Prompt compiler

The local request proxy must stop injecting the full monolithic Fable prompt for every request.

For each normalized request it extracts the latest user intent, routes the task, and compiles a compact directive from:

- a short immutable Fable core contract
- the selected canonical skill
- current project state when present

The original system prompt remains preserved after the Fable directive.

## Diagnostics

`get-fable doctor` validates:

- canonical skill registry structure
- referenced skill files
- allowed transition targets
- plugin manifest presence
- project state schema and phase
- project skill installation when `.fable` is active
- required Python hook runtime availability as an advisory check

`--json` returns a stable machine-readable report.

## CLI additions

- `get-fable route <task> [--json]`
- `get-fable doctor [--json]`
- `get-fable status --json`

Existing commands and default no-command safety remain compatible.

## Installer direction

Project initialization installs the canonical skill pack under `.agents/skills/` and creates state without replacing existing project-owned files.

Global host installation uses the canonical skills rather than treating the large historical asset library as the default workflow pack. Historical assets stay available as an optional library.

## Testing

The maturity gate must prove:

- routing precedence and explanations
- state transition validity
- evidence-gated completion
- registry integrity
- compact prompt compilation
- project initialization of canonical skills and state
- doctor JSON contract
- status JSON contract
- existing installer, router, CLI, and package behavior does not regress

## Compatibility and claims

Use `frontier-like execution discipline` to describe the goal. Do not state that get-fable turns one model into another model, changes model capability, exposes hidden reasoning, or guarantees equivalent benchmark performance.
