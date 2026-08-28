---
name: fable-discover
description: >
  Gather the smallest set of repository, environment, documentation, and runtime evidence needed before planning or changing code. Use when load-bearing facts are unknown, tracing execution paths, inspecting unfamiliar packages, or resolving codebase contradictions — even if the user does not explicitly say "fable-discover" (e.g. "explore the codebase", "how does this work", "where is this implemented", "find where this route is handled"). Do NOT use when the bounded edit is already known (use fable-execute), for external API/version research (use fable-research), or for running existing test suites (use fable-verify).

version: 1.3.0
pack: core
inputs:
  - exploration_target
requires:
  - codebase_access
produces:
  - repository_evidence
  - execution_path
gates:
  - load_bearing_unknowns_resolved
fallback: fable-recover
mutatesWorkspace: false
parallelSafe: true
neural_links:
  precursors:
    - get-fable
  continuations:
    - fable-research
    - fable-plan
    - fable-execute
  lateral_peers:
    - fable-memory
  recovery: fable-recover
---

# Fable Discover

Build the smallest reliable mental model of an unfamiliar code path before anyone commits to a design or edit.

## Mission
Discovery is not "read a lot of files." It is uncertainty reduction.

The Skill should leave the next specialist with enough evidence to make a decision without rediscovering the repository, while stopping before exploration becomes archaeology.

## Activate When
- entry points, ownership, or execution flow are not known;
- a request spans an unfamiliar package/subsystem;
- generated code, plugins, runtime configuration, queues, jobs, or dependency injection may change the real execution path;
- the user describes behavior but not where it is implemented;
- a previous assumption about the repository has been contradicted.

## Do Not Activate When
- the exact bounded edit and target file are already known;
- the job is purely external API/version research (`fable-research`);
- the task is only to run existing checks (`fable-verify`).

## Situation Classification
Classify the unknown before searching.

| Unknown | First evidence to seek | Common trap |
| --- | --- | --- |
| Topology | manifests, workspace config, package boundaries | assuming root package owns runtime |
| Entry point | CLI/server/job/plugin bootstrap | starting from a similarly named helper |
| Execution path | calls, handlers, events, data transitions | following imports without proving runtime reachability |
| Configuration | env/schema/defaults/feature flags | reading defaults while production overrides them |
| Generated behavior | build scripts, codegen outputs, generated manifests | editing generated output instead of source |
| Plugin/extension path | registration, discovery, loader contracts | missing dynamic loading because grep finds no direct import |
| Persistence/data path | repositories, schemas, transactions, queues | stopping at service layer before side effects |
| Test architecture | harness, fixtures, test entry points | assuming tests exercise the same artifact users run |

## Discovery Protocol

### Stage 1 — Frame the unknowns
Write 2-7 questions whose answers would materially change the plan. Mark each as `load-bearing` or `nice-to-know`.

Examples:
- Which process receives this request?
- Is the package source executed directly or from `dist/`?
- Where is this plugin registered?
- Which storage boundary commits the state?

Do not start broad search until the questions are explicit.

### Stage 2 — Establish repository topology
Read project instructions and manifests first. Identify:
- workspace/package roots;
- build/test commands;
- generated directories;
- host/plugin manifests;
- source vs distribution entry points;
- configuration sources;
- relevant ownership boundaries.

### Stage 3 — Trace a real path
Start from an observable entry point and follow concrete symbols/events toward the target behavior.

For every hop record:
- file/symbol;
- why this hop is reachable;
- input/output contract;
- side effect or state transition;
- certainty: `[measured]`, `[inferred]`, or `[unresolved]`.

An import chain alone is not proof that code executes.

### Stage 4 — Probe runtime only when static evidence is insufficient
Use safe read-only runtime observation to answer a named question: logs, help output, route listing, test discovery, build metadata, or a narrow reproduction.

Do not mutate production state just to satisfy curiosity.

### Stage 5 — Resolve contradictions
When measured evidence contradicts the current model, update the model immediately. Do not preserve an old theory because it made the earlier search coherent.

### Stage 6 — Stop deliberately
Stop when every load-bearing question is either:
- answered with evidence; or
- explicitly unresolved with a named consequence and next Skill.

Nice-to-know questions do not block handoff.

## Decision Rules
- If the unknown is external and time-sensitive, hand that question to `fable-research` instead of inferring from model memory.
- If the exact edit becomes bounded and no design decision remains, hand off to `fable-execute`.
- If multiple components/risks must be coordinated, hand off to `fable-plan`.
- If search results suggest generated code, find the generator/source-of-truth before recommending edits.
- If direct imports disappear at a boundary, inspect registration tables, event buses, dependency injection, plugin discovery, reflection, codegen, and runtime configuration.
- If tests and runtime appear to disagree, record both paths; do not assume the test harness is authoritative.

## Invariants
- Discovery is read-only unless the user explicitly changes the task.
- Every load-bearing conclusion has concrete repository/runtime evidence.
- Inference is labeled as inference.
- Search breadth is justified by an unresolved question.
- Generated output is not treated as canonical source without proving it is hand-maintained.

## Failure Taxonomy
### Search miss
A symbol cannot be located. Check aliases, generated names, dynamic loading, registries, event dispatch, reflection, compiled output, and package boundaries.

### False path
Files look relevant but are not reachable from the real entry point. Return to a proven runtime/bootstrap boundary.

### Environment ambiguity
Behavior depends on env/flags/config. Identify precedence and which configuration is active; do not report a default as runtime fact.

### Source/artifact mismatch
Tests or commands execute built/stale artifacts rather than edited source. Record both paths and route to `fable-recover` if this caused repeated failure.

### Unknown remains load-bearing
Do not paper over it. Hand off to research or report the unresolved decision explicitly.

## Anti-Patterns
- reading every file in a package "for context";
- trusting filenames as architecture;
- treating grep frequency as importance;
- following imports without proving runtime reachability;
- ignoring build/codegen/plugin registration;
- reporting assumptions without `[inferred]` labels;
- continuing discovery after the planning decision is already safe.

## Evidence Packet / Handoff
Produce a compact packet:

```text
Target:
Load-bearing questions:
Measured facts: file:symbol → fact
Execution path: entry → ... → side effect
Configuration/runtime notes:
Generated/plugin boundaries:
Unresolved questions + consequence:
Recommended next Skill:
```

## Completion Criteria
Discovery is complete when the next specialist can explain:
- where execution starts;
- which path reaches the behavior;
- which contracts/state boundaries matter;
- which facts are measured vs inferred;
- what remains unknown;
- why those remaining unknowns do or do not block the next action.

## Progressive Resources
- Deep playbook: `references/repository-investigation-playbook.md`
- Existing evidence protocol: `references/evidence-gathering-protocol.md`
- Example: `examples/codebase-inspection.md`
