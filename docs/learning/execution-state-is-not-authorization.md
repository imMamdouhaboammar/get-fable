# Execution State Is Not Authorization

## Problem

`currentSkill` changes as work moves through execution, verification, and
recovery. The completion gate also used it as an independent signal that a task
was security-scoped. A contradictory state could therefore turn a security pass
into completion proof for generic work.

## Incorrect assumption

Every field that describes what the runtime is doing can also authorize what
evidence is sufficient. Execution stage and task scope are different claims.

## Engineering concept

Authorization should come from one canonical, internally consistent source.
Derived or transient fields may narrow behavior conservatively, but must not
widen authority when they disagree with that source.

## What get-fable now does

When `lastDecision` exists, security evidence is completion-capable only when
its canonical selected skill, pack, and task shape all identify security work.
`currentSkill` can still move to verification or recovery without losing the
original scope, and a contradictory execution-stage value cannot expand it.
Legacy state without a routing decision retains a narrow current-skill fallback;
a malformed decision fails closed instead of being treated as absent.

## Failure case

A generic `fable-tdd` decision combined with `currentSkill: fable-security`
previously advanced `verifiedGeneration` after a security-only pass.

## Tests proving behavior

`test/evidence-provenance.test.ts` and
`test/hook-evidence-policy-v2.test.ts` cover conflicting skill and task-shape
markers, legitimate security work during another execution stage, and
TypeScript/Python completion-gate parity.
