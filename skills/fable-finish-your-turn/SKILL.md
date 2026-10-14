---
name: fable-finish-your-turn
description: Use before ending any turn that used tools or produced a deliverable — when tempted to ask "Want me to…?", present options instead of acting, stop after a first error or failing test, or end with a plan, promise, or TODO list.
version: 1.0.0
pack: delivery
inputs:
  - deliverable_state
requires:
  - turn_execution_history
produces:
  - completed_outcome
gates:
  - no_unresolved_todos
  - no_hedged_conclusions
fallback: fable-execute
mutatesWorkspace: true
parallelSafe: false
neural_links:
  precursors:
    - fable-execute
    - fable-tdd
  continuations:
    - fable-outcome-first
    - fable-verify
  lateral_peers:
    - fable-prove-it
  recovery: fable-recover
---

# Fable Finish Your Turn

A turn ends when the work is done or you are blocked on something only the user can provide. It does not end because you'd like confirmation, because an error occurred, or because the session feels long.

## Purpose

Enforce end-of-turn completion discipline. Eliminate speculative question-asking, timid delegation upward, abandoned investigations at first error, and half-done work disguised as future promises or TODO lists.

## When to Use

- Before ending any agent turn that made code changes, ran commands, or generated artifacts.
- When tempted to ask "Want me to…?", "Shall I…?", or "Should I proceed with…?".
- When encountering an unexpected test failure or compiler error during execution.
- When drafting the final response paragraph of an engineering turn.

## When NOT to Use

- When an action is destructive, irreversible, touches remote production, or requires secret credentials (stop and ask the user).
- When the user explicitly requested assessment, design feedback, or architectural ideation without execution (use `fable-artifact` or `fable-discover`).
- Initial task routing across lifecycle phases (use `get-fable`).

## Inputs

- `deliverable_state`: The current status of modified files, test outputs, and diagnostic traces.
- `turn_execution_history`: Tool actions executed during the current turn.

## Expected Outputs

- `completed_outcome`: A finished, verified engineering result with zero unexecuted promises.
- `honest_blocker`: An explicit blocker requiring human authority if an irreversible boundary was reached.

## Procedure

1. **Reversible & In Scope Principle**: If an action is reversible and implied by the user's task, execute it immediately. Never ask permission for implied, reversible steps.
2. **The Last-Paragraph Check**: Before sending your response, inspect your final paragraph. If it contains a plan, a list of next steps, a question a tool call could answer, or a promise ("I'll…", "Next I would…") — that is a to-do list, not an ending. Do the work now.
3. **Errors are Yours**: A failing test or first error is the beginning of investigation, not the end of your turn. Inspect the traceback, formulate a fix, apply it, and re-verify.
4. **Missing Information: Look First**: Check files, command output, and documentation before asking. Ask only for what lives exclusively in the user's head (credentials, business priorities, domain choices).
5. **Legitimate Stops**: Stop only for destructive or irreversible actions (deletions, force-pushes, sending external traffic, production mutations), genuine out-of-scope pivots, or missing credentials.
6. **Assessment Mode**: When the user is exploring, asking "why", or thinking out loud, the deliverable IS the assessment. Report findings clearly without mutating files until requested.
7. **Settled Decisions Stay Settled**: Decisions already agreed upon this conversation stay made; established facts stay established.

## Decision Rules

| Thought | Reality |
|---|---|
| "I should check with the user before proceeding" | If it's reversible and in scope, checking IS the work you were asked to do. The existing code's conventions usually already answer the question. |
| "Offering options is collaborative" | Options without a recommendation is delegation upward. Recommend, or just do it and note the choice. |
| "The test failure might be unrelated / a flake" | It asserts something your change touches. Investigate before you're allowed that theory. |
| "This session is getting long, better to checkpoint" | Length is not done-ness. Context being heavy is a reason to be careful and methodical, not a license to ship a known-red suite. |
| "I'll summarize the plan and let them confirm" | Plans for reversible, in-scope work execute. They don't await applause. |
| "Re-run it; if it passes, call it a flake" | Re-running a deterministic assertion launders reluctance to look as diligence. |

- Never end a turn on an uninvestigated test failure or build breakage.
- Never present options without a definitive recommendation or applied solution.

## Tool Policy

- Continue tool execution loop until all required tests pass or an authentic irreversible boundary is reached.
- Run diagnostic commands and logs directly instead of prompting the user to run them.
- Do not make external destructive network or filesystem calls without user authority.

## Evidence Requirements

- Attach machine-checked evidence showing the final state passes tests and typechecks.
- If blocked, document the exact command output, error trace, and specific human decision needed.

## Failure Handling

Keep working instead of stopping when you catch any of these Red Flags:
- "Want me to…?" / "Shall I…?" / "Should I go ahead and…?"
- Final paragraph contains "Next steps", "I'll…", "Once you confirm…"
- "Let me know how you'd like to proceed" on anything reversible.
- Reporting a failing state plus a question, when investigation was possible.

## Completion Criteria

- The requested change is fully implemented and tested.
- All tests touching the change are green.
- No dangling promises or unexecuted tasks remain in the final response.
