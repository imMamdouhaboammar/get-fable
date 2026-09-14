# Task Plan: Architecture Enforcement Skill Integration for Get-Fable System

## Goal
Design, implement, package, and integrate a native system skill (`fable-architecture`) within `get-fable` that intercepts project specifications at inception (Step One), deterministically evaluates scale, domain decoupling, and resource intensity vectors, hard-constrains agents to a microservices architecture when thresholds are met, assigns curated language-framework stacks by core competency, and enforces strict communication standards (North-South REST vs. East-West gRPC/Brokers).

## Next Step
Register `fable-architecture` in `skills/get-fable/registry.json`, update `task-router.ts`, implement inception hook guard, and run `generate:catalog`.

## Current Phase
Phase 4: Registry, Task Router & Hook Interception Integration

## Phases

### Phase 1: Planning & Implementation Plan Design
- [x] Research get-fable skill package conventions, hook dispatcher, and registry mechanics
- [x] Document architectural vectors, scoring rules, and tech stack matrix in `findings.md`
- [x] Create comprehensive `implementation_plan.md` artifact for user review
- [x] Receive user approval
- **Status:** complete

### Phase 2: Core Architecture Evaluation Engine
- [x] Implement `src/core/architecture-eval.ts` with:
  - Vector evaluation (Scale & Load, Domain Decoupling, Resource Intensity)
  - Monolith restriction lock (`allowMonolith: false`)
  - Deterministic stack selection (Categories A, B, C, D for Scenarios 1-4)
  - Protocol assignment (Inbound REST, East-West gRPC/Message Broker)
- [x] Implement TOON / JSON serialization for microservice architecture manifests
- **Status:** complete

### Phase 3: Canonical Skill Package Definition (`skills/fable-architecture/`)
- [x] Author `skills/fable-architecture/SKILL.md` (progressive disclosure, YAML frontmatter, execution rules)
- [x] Author `skills/fable-architecture/skill.package.json` (schemaVersion 2)
- [x] Create `agents/openai.yaml` (`architect-enforcer` agent profile)
- [x] Create `references/` (`vector-scoring.md`, `tech-stack-matrix.md`, `communication-standards.md`, `subagent-role-distribution.md`)
- [x] Create `templates/` (`microservices-manifest.toon`, `docker-compose.microservices.yml`, `service-contract.proto`)
- [x] Create `examples/` (`fintech-scale-walkthrough.md`, `ai-media-pipeline-walkthrough.md`)
- [x] Create `evals/` (`scenarios.json` with positive, negative, and threshold test cases)
- [x] Create `scripts/` (`evaluate-architecture.py` deterministic validator)
- **Status:** complete

### Phase 4: Registry, Task Router & Hook Interception Integration
- [x] Register `fable-architecture` in `skills/get-fable/registry.json` (order 220, pack `system`, phase `planned`)
- [x] Update `src/core/task-router.ts` with intent matching, vector scoring signals, and task shaping
- [x] Implement `hooks/fable_architecture_guard.py` hook handler to intercept project inception prompts
- [x] Wire hook into `hooks/fable_hook_dispatch.py` and `hooks/hooks.json`
- [x] Run `bun run generate:catalog` to regenerate catalog artifacts
- **Status:** complete

### Phase 5: Verification, Doctor Audits & Documentation
- [x] Author automated test suite in `test/fable-architecture.test.ts`
- [x] Run `validateSkillPackage('fable-architecture')` (valid: true, 0 errors)
- [x] Run `bun run check:generated` (pass)
- [x] Run `get-fable doctor --json` and verify zero errors (44 checks passing)
- [x] Run `bun run typecheck && bun test && bun run build` (all passing)
- [x] Update `progress.md` with verification results
- **Status:** complete

## Key Questions
1. How should the inception hook communicate monolith lockout to host agents?
   - Via injected ephemeral context in `SessionStart` / `PreInvocation` and prompt directive compiler, plus `PreToolUse` blocking if a monolithic file is scaffolded when `allowMonolith: false`.
2. What format should the architecture contract take?
   - Standard Fable TOON block (`microservices_manifest.toon`) and companion JSON specification.

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Skill ID: `fable-architecture` | Fits existing canonical naming (`fable-security`, `fable-artifact`, `fable-config`) and pack `system` |
| Deterministic Scoring Function | Threshold-based with 3 discrete vector scores (Scale, Domains, Workload) and a composite index to eliminate agent hallucination |
| Dual-Transport Alignment with ADR 0007 | North-South REST HTTP/JSON; East-West gRPC Protobuf or Kafka/RabbitMQ |
| SchemaVersion 2 Skill Package | Strictly adheres to Fable package validator (`skill.package.json`, data-only scripts, non-empty resources) |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| None yet | - | - |

## Notes
- Bun is mandatory for all package/script executions.
- Do not bypass `get-fable doctor` or `bun test`.
- Wait for user approval before modifying production source or executing code changes.
