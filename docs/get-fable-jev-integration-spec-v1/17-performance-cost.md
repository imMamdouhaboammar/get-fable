# Performance and cost model

## Current TypeSafe published envelope

As of 2026-09-18, TypeSafe documents for Jev 1.13:

- $0.042 per million input tokens
- output tokens free
- 250,000 tokens/second account rate limit
- 1,200 requests/minute
- 64k request context limit
- 32k for state plus longest question

These values are external and may change.

## get-fable design budget

Normal first pass target:

```text
state:       <= 4k tokens target
questions:   generated compactly from 30-skill registry
stage2:      only on ambiguity
```

The cost is expected to be small relative to generative coding calls, but cost is not the primary promotion argument. Routing quality and reliability are.

## Latency

TypeSafe publishes roughly 70-500ms for Jev in its current serving environment. get-fable users are geographically distributed, so do not adopt that number as an SLO.

Measure real:

- p50
- p95
- p99
- DNS/connect/TLS where observable
- timeout rate

## Route-path latency policy

- `off`: zero added network latency
- `shadow`: may add logging latency only if the caller awaits shadow; prefer bounded non-critical collection in explicit shadow tools
- `recommend`: bounded by configured timeout
- `guarded`: provider must finish within route budget or deterministic result wins

## Cache

A small process-local cache may be used for identical normalized routing envelopes in shadow/eval mode.

Do not cache across model version, registry hash, question schema version, or hard-policy version.

Cache key must include:

```text
model id
reflex question schema version
registry semantic hash
normalized state hash
```
