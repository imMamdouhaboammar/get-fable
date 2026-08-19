---
name: fable-research
description: Resolve current external facts, APIs, versions, standards, or documentation before they influence a software decision. Use when repository evidence is insufficient because the answer depends on information outside the workspace.
---

# Fable Research

Treat external facts as evidence, not memory.

## Contract

1. State the smallest research question that can change the implementation decision.
2. Prefer first-party documentation, specifications, source repositories, release notes, or primary research.
3. Separate current facts from inference and from repository-local assumptions.
4. Record only the load-bearing findings needed by the next skill. Do not dump a research transcript into working context.
5. When sources disagree, preserve the disagreement and route the unresolved decision to `fable-plan` or `fable-discover` instead of averaging claims.
6. Research evidence can justify a decision but cannot prove that changed code works.

## Exit condition

Research is complete when the external unknown that blocked the next decision is resolved with source-backed evidence, or when the unresolved conflict is explicit enough for planning to handle safely.
