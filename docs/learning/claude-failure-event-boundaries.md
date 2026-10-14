# Claude Failure Event Boundary Lesson

## Problem

The recovery hook was installed for `PostToolUse` and tried to infer failure
from `tool_response`. Claude uses that event after successful tools. Failed tool
executions arrive through `PostToolUseFailure` with a top-level `error`, so the
failure streak never advanced in normal Claude execution.

## Incorrect assumption

A post-execution hook receives both successful and failed results in one stable
payload shape.

## Engineering concept

**Lifecycle event identity is part of an integration's typed boundary.**

When a host separates success and failure into distinct events, the event name
is stronger evidence than parsing human-readable output. A durable state
transition should key on that explicit boundary and use payload text only for
diagnostics.

## What get-fable now does

Claude installations register the same small state hook for both Bash result
events:

- `PostToolUse` records success and resets the consecutive-failure streak.
- `PostToolUseFailure` records failure regardless of whether the host could
  produce a process exit code.

When recovery context is emitted, its `hookEventName` matches the event that
actually invoked the hook. Legacy direct payloads without an event name remain
supported through best-effort `tool_response` parsing.

## Failure case

Two documented failure payloads containing
`hook_event_name: "PostToolUseFailure"` and a top-level `error` previously left
`failureStreak` at zero. They now move the durable phase to `recovering` and
select `fable-recover`.

The sequence `failure -> success -> failure` is equally important: it must end
at streak one, proving that adding the failure event did not remove successful
reset behavior.

## Test proving behavior

`test/hooks-state.test.ts` drives both official event shapes through the Python
hook. `test/plugin.test.ts` verifies both plugin registrations, and
`test/installer.test.ts` proves global installation is idempotent and preserves
unrelated hooks.

## Remaining limitation

This contract is Claude-specific. The Antigravity adapter retains its own event
registration until its host semantics are independently verified.
