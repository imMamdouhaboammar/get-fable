# Integration Brief: Agent Kernel

**Status:** Proposed Wave-1 provider  
**Date:** 2026-09-11

## Purpose

Use Agent Kernel as Fable's first-party provider for reviewed project memory, architecture knowledge, repository conventions, failure lessons and environment continuity without copying its durable store into Fable Run state.

## Measured current product boundary

Agent Kernel describes itself as a local memory/governance layer for existing coding agents. Its architecture states that the authoritative reviewed source lives under `~/.agent-kernel/source` and generated AGENTS/CLAUDE/Cursor/Gemini files are adapters. ContextFS projects existing records behind `ak://` URIs while original JSON/JSONL stores remain authoritative.

ContextFS supports bounded L0/L1/L2 reads, hierarchical find, usage recording and review-first proposal materialization. Novel durable candidates are proposals rather than auto-approved memory.

## Fable capabilities

Initial mapping:

```text
memory.project.read.v1
memory.project.propose.v1
```

Optional later capabilities require separate evidence before inclusion:

```text
architecture.policy.read.v1
environment.reference.describe.v1
```

Environment secret/value access is intentionally NOT part of the initial memory capability.

## Transport

### PROPOSED

Prefer a stable machine interface in this order:

1. Agent Kernel SDK/module API if a documented stable programmatic interface exists at M5;
2. Agent Kernel MCP surface if it exposes the required bounded ContextFS operations with stable schemas;
3. CLI `--json` adapter as the compatibility floor.

Do not scrape human-formatted CLI text.

### Measured CLI examples

Current documentation exposes commands such as:

```text
agent-kernel context tree ... --json
agent-kernel context read ... --level ... --json
agent-kernel context find ... --budget ... --trace --json
agent-kernel context used ... --json
agent-kernel context commit ... --dry-run --json
agent-kernel context commit ... --json
agent-kernel project status --json
agent-kernel doctor
```

## Source of truth

Agent Kernel owns:

- reviewed memory/rules/skills/policies source;
- ContextFS object identity and retrieval hierarchy;
- pending memory proposals;
- architecture policy/guard results it authors;
- Environment Vault state it authors.

Fable stores Context/Artifact refs and bounded summaries only.

## State ownership

Fable MUST NOT:

- rewrite generated Agent Kernel adapter files as memory authority;
- auto-approve proposal candidates;
- bulk-copy Agent Kernel memory into each Run;
- store Environment Vault secret values in Run state.

Fable MAY record:

```text
provider = agent-kernel
ak:// URI or stable record id
retrieval level
bounded summary
digest/revision if exposed
reason used
```

## Required permissions

`memory.project.read.v1`:

- local process invocation or SDK access;
- read access to Agent Kernel local state through its own API;
- no repository mutation by default.

`memory.project.propose.v1`:

- write permission to Agent Kernel proposal/session state through its API;
- no automatic approval/publication.

Environment Vault access is a distinct permission/capability if added later.

## Side effects

Read: `local_read`.  
Propose: bounded provider-owned `local_write` to proposal/session state.

The adapter must not call `compile`, `sync`, project link, Environment Vault push/restore, or hooks merely to answer memory reads.

## Invocation semantics

### memory.project.read.v1

Input should include:

```text
workspace/repository identity
query
under URI scope if known
file locality if relevant
budget
requested detail ceiling (L0/L1/L2)
```

Output:

```text
ordered ContextRefs
bounded summaries
stable Agent Kernel refs/URIs
retrieval trace ref if available
revision/provenance metadata
```

Fable should default to L0/L1 and request L2 only for specific authoritative detail, preserving Agent Kernel's progressive retrieval model.

### memory.project.propose.v1

Input:

```text
session/run linkage
candidate lesson/rule
reason/provenance
scope
```

Output:

```text
proposal/provider ref
status
potential deduplication result
```

The result must not be reported as approved durable memory unless Agent Kernel says it is approved.

## Evidence produced

Memory reads produce `observation` or context provenance, not completion proof by themselves.

A proposal write can produce a `receipt` proving proposal creation, not approval or correctness.

## Failure behavior

Normalize:

- Agent Kernel unavailable/not installed -> `unavailable`;
- project not connected -> `external-state` / blocked where the Task requires project memory;
- malformed JSON/schema -> `incompatible` or `internal` and provider degradation;
- requested URI missing -> capability-defined not-found result, not a fabricated memory answer;
- permission/ownership violation -> `permission-denied`.

Memory provider failure should not corrupt the Run Store.

## Retry semantics

Reads are normally idempotent and may retry under bounded transient failure policy.

Proposal creation must use provider-supported deduplication/session semantics or a Fable idempotency key where possible. Do not blindly create duplicate durable proposals after an uncertain timeout.

## Health check

Wave-1 adapter health should establish:

- executable/module/MCP surface is available;
- provider version is compatible;
- project identity can be resolved where project-scoped memory is requested;
- JSON/machine interface returns supported schema.

Running a mutating setup command is not a health check.

## Trust assumptions

First-party reviewed local provider. It still has access to sensitive local memory/environment state, so Fable permissions must distinguish ordinary memory reads from environment/secret-related operations.

## Adapter responsibilities

- map Fable workspace identity to Agent Kernel project identity without persisting raw secrets;
- apply bounded retrieval budgets;
- preserve `ak://`/provider refs;
- keep generated adapter files non-authoritative;
- expose proposals without auto-approval;
- redact any environment secret values if a provider response unexpectedly contains them;
- convert provider failures to Fable ABI failure categories.

## Integration tests

1. bounded project memory read returns stable refs and no unrequested L2 data;
2. missing project produces a clear blocked/unavailable result;
3. proposal call creates at most one proposal under retry/reconciliation;
4. proposal does not become “approved” in Fable without provider authority;
5. Run serialization contains refs/summaries but not the complete Agent Kernel store;
6. environment values/secrets are absent from adapter fixtures;
7. provider upgrade with incompatible machine schema is detected by health/conformance.

## Integration acceptance

READY for M5 implementation only when the chosen machine transport is identified and its schema is captured in adapter contract tests. Until then the architecture mapping is ready, but the transport card is **NEEDS RESEARCH** rather than implementation-ready.
