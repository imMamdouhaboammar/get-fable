---
name: fable-execute
description: Implement a bounded coding task against explicit acceptance criteria. Use after scope is stable and the requested change can be executed without reopening product design.
---

# Fable Execute

Implement the accepted card without widening scope.

## Procedure

1. Restate the active card and its acceptance condition internally from durable state or the current request.
2. Read the minimum code required to trace the real execution path.
3. Make the smallest coherent change that satisfies the card.
4. Match local naming, error-handling, testing, and architectural conventions.
5. Run the card's acceptance check immediately.
6. Do not mark the card complete until the check passes and the evidence is recorded.

If the same approach fails twice or the evidence contradicts the plan, stop patching symptoms and route to `$fable-recover`.

After the last implementation card, route to `$fable-verify` for the complete behavior.
