# Integration Brief: Dokion

**Status:** Proposed Wave-1 provider  
**Date:** 2026-09-11

## Purpose

Use Dokion when a user explicitly activates a Dokion Playbook as an execution-control provider for declared order, permissions, approvals, verification and repair boundaries.

Fable must not convert Dokion into a generic capability selector or silently replace its declared execution contract.

## Measured current product boundary

Dokion states that `.dokion/playbook.json` is the sole execution authority for the active user-authored Playbook. The user controls capability selection, execution order, read/write/shell/network permissions, approvals, failure/retry policy and required gates.

Current Dokion runtime can inspect, validate, plan, execute, resume, verify and report provider-owned state/evidence. It fails closed when authority, evidence, repository identity or persisted state cannot be verified.

Dokion explicitly does not infer replacement capabilities, widen permissions, reorder steps or install undeclared dependencies.

## Fable capabilities

Initial mapping:

```text
workflow.execute_declared.v1
evidence.read.v1
approval.request.v1     # only where the active Dokion flow exposes an approval operation
```

Fable does NOT map Dokion to generic `workflow.plan.v1` for arbitrary Fable planning because the active Playbook is user-authored authority, not a general planner.

## Transport

### PROPOSED

Use Dokion's machine-readable CLI/SDK surface once exact JSON contracts are pinned in M5 conformance fixtures.

Relevant current commands include:

```text
dokion inspect
dokion doctor
dokion validate
dokion plan
dokion run
dokion step
dokion resume
dokion verify
dokion approve
dokion reject
dokion status
dokion findings
dokion report
```

The adapter must not scrape narrative terminal output. If a required command lacks a stable machine output, that capability remains blocked pending an adapter API or wrapper contract.

## Source of truth

For a Dokion-governed execution:

```text
.dokion/playbook.json     -> sole active execution authority
Dokion state              -> execution progress authority
Dokion evidence           -> provider-owned verification authority
```

Fable stores stable references and normalized status needed for coordination.

## Authority intersection

Effective permission/order is:

```text
Fable Runtime policy
INTERSECT
active Dokion Playbook
INTERSECT
provider/host enforcement limits
```

No layer can widen another layer's denial.

Fable can decide *when* a bounded Dokion-governed Task is schedulable. It cannot reorder internal Playbook steps or substitute undeclared capabilities inside that Task.

## Required permissions

Depends on the active Playbook. The Fable adapter must inspect/validate the playbook-derived requested permissions before execution and translate them to Fable policy domains.

Potential domains:

```text
filesystem.read
filesystem.write
shell.execute
network.connect
repository.write
external.side_effect
approval.request
```

Fable must not pre-grant the union of all permissions that any Dokion Playbook might request.

## Side effects

The adapter's side-effect class is derived from the active Playbook operation, not from provider identity alone.

`inspect/status/report/plan/validate` can be read/provider-state operations. `run/step/resume/approve/repair` may cause workspace/external side effects according to the Playbook.

## Invocation semantics

### Preflight

Before scheduling `workflow.execute_declared.v1`:

1. confirm `.dokion/playbook.json` exists and is the intended authority;
2. validate Dokion version/compatibility;
3. call Dokion validation/plan surface without executing capability steps;
4. collect declared permissions/order/gates as bounded structured metadata;
5. compare with Fable policy;
6. block on denied or unresolved authority.

### Execute

Fable invokes the Dokion operation and records a provider operation ref/status. Internal declared step ordering remains Dokion-owned.

### Resume

After Fable/host restart, revalidate:

- active Playbook identity/content digest;
- repository identity;
- Dokion persisted state;
- provider version compatibility;
- Fable approval/policy scope.

Only then invoke Dokion resume.

## Evidence produced

Dokion evidence remains under Dokion's store. Fable may reference:

```text
verification result
declared release-gate result
repair transaction verification
approval/decision receipt
report/findings refs
```

Fable cannot infer a missing Dokion gate as passing.

## Failure behavior

- missing active Playbook when Task requires Dokion -> `external-state` blocker;
- invalid Playbook -> `invalid-input` / blocked;
- repository/authority mismatch -> `external-state` and fail closed;
- permission requested outside Fable policy -> `permission-denied` before execution;
- unsupported/incompatible adapter command -> `incompatible`;
- provider execution failure -> bounded failure with Dokion report/evidence ref.

## Retry semantics

Fable must defer to Dokion's declared failure/retry policy inside the Playbook. It must not layer an automatic whole-workflow retry that could duplicate external side effects.

If a Fable transport timeout creates uncertainty, reconcile Dokion status/state before retry or resume.

## Health check

- Dokion executable/module available;
- supported version;
- doctor/inspect machine contract available;
- active repository identity can be resolved;
- no execution of Playbook steps during health check.

## Trust assumptions

First-party execution-control provider, but its active Playbook can authorize dangerous commands/side effects. Trust in Dokion code does not imply trust in every Playbook. The Playbook itself is reviewed authority input and must pass Fable policy.

## Adapter responsibilities

- preserve `.dokion/playbook.json` as sole active authority;
- expose declared permissions/order/gates structurally to Fable policy;
- never substitute or reorder inside the active contract;
- reconcile status after uncertain outcomes;
- preserve Dokion evidence references;
- keep Fable and Dokion approval identities distinct but linked;
- block when a Playbook changes after approval without revalidation.

## Integration tests

1. active Playbook permission denial in Fable prevents Dokion execution;
2. Fable approval cannot override a Dokion denial;
3. Dokion approval cannot override a Fable denial;
4. changed Playbook digest invalidates a pending resume/approval path;
5. Fable scheduler does not reorder declared internal steps;
6. transport retry does not start a second uncertain workflow execution;
7. Dokion verification result is referenced rather than copied as a new Fable authority;
8. no Playbook execution occurs during health/preflight-only checks.

## Integration acceptance

Authority mapping is **READY**. Exact M5 adapter implementation remains **NEEDS RESEARCH** until machine-readable command/API schemas are pinned and conformance fixtures are added.
