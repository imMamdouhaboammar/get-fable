# Fable Runtime M0 Architecture Plan

> **Scope:** architecture/repository archaeology only. Do not implement the production Agency Runtime in M0.

**Goal:** leave a reviewed, evidence-backed product/runtime architecture that a fresh implementation session can use without rediscovering ownership, host strategy, Provider ABI direction, Worker/evidence/security contracts or milestone dependencies.

**Architecture principle:** Fable owns agency coordination; existing providers retain their domain authority; DSH/Cordis are initial host substrate behind a Fable-owned compatibility boundary.

## M0 evidence baseline

### Completed archaeology

- [x] Inspect current get-fable repository metadata, package manifest, current core state/types and DSH integration.
- [x] Inspect current `docs/ARCHITECTURE.md`, historical ADR-001 and existing Superpowers plan conventions.
- [x] Inspect current open Issues/PRs to avoid duplicating active DSH/updater/state work.
- [x] Inspect DSH architecture, AgentFactory/AgentRegistry, subagent lifecycle, experimental Agent Teams, Session persistence, LLM adapters, credentials, approvals/sandbox and Desktop packaging/update model.
- [x] Inspect Cordis Context/Fiber lifecycle and reversible effect model.
- [x] Inspect Agent Kernel current source-of-truth/ContextFS ownership.
- [x] Inspect Riqor current evidence/freshness/run ownership.
- [x] Inspect Dokion active Playbook authority and execution boundary.
- [x] Inspect Awesome DSH Plugin security warning about native plugin execution trust.

## Measured contradictions recorded

- [x] Current repository instructions/doc surfaces contain state-version drift relative to current v3 state source; existing Issue #113 already covers documentation/schema parity, so M0 creates no duplicate Issue.
- [x] Current DSH adapter still contains legacy state/planning compatibility reads and casts; existing DSH hardening Issues already cover these areas, so M0 does not duplicate them.
- [x] DSH Agent Teams are experimental and write scopes are advisory, so they are not selected as Fable authority.
- [x] DSH child/subagent approval behavior does not support treating child interactive approval as the Fable privileged-action model.
- [x] DSH Session persistence and Fable Run persistence have different responsibilities.

## M0 documentation work

### Task 1 — Product/Runtime RFC

**File:** `docs/superpowers/specs/2026-09-11-fable-studio-agency-runtime-v1.md`

- [x] Define product thesis and non-goals.
- [x] Define terminology.
- [x] Map current repository/upstream state.
- [x] Define Run/Task/Worker/Provider/Capability/Evidence/Policy model.
- [x] Define first vertical slice.
- [x] Define milestones and risks.
- [x] Record unresolved items with evidence/owner/blocking milestone.

### Task 2 — Authority and state ownership

**Files:**
- `docs/architecture/authority-and-state-ownership.md`
- `docs/adr/0004-state-authority-model.md`

- [x] Produce Authority Matrix.
- [x] Define one source of truth per state domain.
- [x] Define provider reference/caching rules.
- [x] Define recovery ownership.

### Task 3 — Provider ABI

**Files:**
- `docs/superpowers/specs/2026-09-11-fable-provider-abi-v1.md`
- `docs/adr/0003-fable-provider-boundary.md`

- [x] Separate manifest and runtime invocation contracts.
- [x] Define permissions, side effects, trust, health, cancellation and reconciliation.
- [x] Define bounded M6 capability taxonomy.
- [x] Define conformance requirements.

### Task 4 — Worker / evidence / security

**Files:**
- `docs/architecture/capability-and-worker-model.md`
- `docs/architecture/evidence-model.md`
- `docs/architecture/trust-and-security-model.md`

- [x] Define state machines and transitions.
- [x] Define scheduler/readiness/concurrency.
- [x] Define typed artifacts.
- [x] Define evidence freshness and completion gates.
- [x] Define plugin/provider trust and credential/approval boundaries.

### Task 5 — Long-term decisions

**Files:**
- `docs/adr/0002-dsh-cordis-host-strategy.md`
- `docs/adr/0005-model-as-provider.md`
- `docs/adr/0006-agency-run-persistence.md`

- [x] Decide initial DSH/Cordis relationship.
- [x] Decide model-as-provider.
- [x] Decide separate Fable Run Store.
- [x] Define revisit triggers.

### Task 6 — Wave-1 integration briefs

**Files:**
- `docs/integrations/agent-kernel.md`
- `docs/integrations/riqor.md`
- `docs/integrations/dokion.md`
- `docs/integrations/github.md`

- [x] Capabilities.
- [x] Transport direction.
- [x] Authority/state ownership.
- [x] permissions/side effects.
- [x] invocation/failure/retry/health/trust.
- [x] adapter tests/acceptance.

### Task 7 — M1 and roadmap

**Files:**
- `docs/spikes/dsh-cordis-feasibility.md`
- `docs/roadmap/fable-runtime-roadmap.md`
- `docs/superpowers/plans/2026-09-11-fable-runtime-m1-dsh-spike.md`

- [x] Define executable M1 spike and falsifiers.
- [x] Define dependency-aware work cards/readiness.
- [ ] Create only non-duplicate GitHub Issues needed for the next execution chain.

## M0 review checklist

### Architecture

- [ ] No public Fable contract depends on Cordis Context/Fiber or DSH Agent/Session event types.
- [ ] Run != Session and Worker != Agent are consistent across documents.
- [ ] Provider output cannot complete a Run directly.
- [ ] Riqor/Agent Kernel/Dokion/GitHub ownership is not duplicated.
- [ ] Runtime approval and host/provider approval intersection is consistent.

### Product

- [ ] First vertical slice is Issue -> verified PR, not a generalized marketplace/platform launch.
- [ ] Run Detail data is defined before broad Studio surface redesign.
- [ ] M8/M9 work remains deferred.

### Security

- [ ] Plugin implementation trust is separate from tool approval/sandbox.
- [ ] merge/credentials/package installation remain separate high-risk permissions.
- [ ] no raw secrets are part of Run/Provider persisted contracts.

### Planning

- [ ] Every near-term Work Card has dependencies/readiness.
- [ ] M1 is the next production-adjacent action.
- [ ] blocked work states exact unblock evidence.
- [ ] no fake parallelism across ABI/policy authority.

### Documentation quality

Before opening the documentation PR, search new files for vague placeholders such as:

```text
TBD
TODO
somehow
probably
should work
```

`later` and `appropriate` are allowed only when they describe an explicitly named deferred milestone/policy, not a hidden decision.

## M0 acceptance gate

M0 is complete when:

- the architecture documents pass the review checklist;
- M1 plan is executable from a fresh session;
- GitHub backlog is deduplicated and dependency-labelled in issue bodies;
- branch contains documentation/planning only;
- no claim says M1 behavior has been executed when it has not;
- a draft documentation PR is open for review with current branch/head evidence.

## Handoff

The next implementation session starts at **C10 — Execute DSH/Cordis Worker feasibility spike** and follows `docs/superpowers/plans/2026-09-11-fable-runtime-m1-dsh-spike.md`.
