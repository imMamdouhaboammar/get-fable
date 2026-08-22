# Newer Failures Outrank Older Proof

## Problem

A functional test pass was completion-capable for ordinary work. If a security
check failed afterward in the same mutation generation, the gate searched only
functional completion kinds and could still accept the older pass.

## Incorrect assumption

Evidence outside a task's completion-capable kinds can be ignored when deciding
freshness.

## Engineering concept

Evidence has two distinct policies: what can prove completion, and what can
invalidate earlier proof. Security evidence cannot complete a generic feature,
but a security failure must still invalidate older functional proof. Ordering is
therefore evaluated across all failure-relevant kinds before accepting the
newest completion-capable pass.

## What get-fable now does

TypeScript and Python scan current-generation evidence newest-first. The first
failure-relevant failure blocks. A completion-capable pass is accepted only when
it is newer than such failures, owned by the workspace, and substantive.
Schema-v1 migration uses the same task-aware completion-kind policy.

## Test proving behavior

`test/evidence-provenance.test.ts` and
`test/hook-evidence-policy-v2.test.ts` prove the sequence `functional pass ->
security fail -> block -> functional pass -> allow` and task-aware migration of
legacy security work.
