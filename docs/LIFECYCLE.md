# Fable Coding Lifecycle v2

## Core Lifecycle States

```text
       [idle]
         │ (route task / intent)
         ▼
    [discovering] ────────────┐
         │ (resolve unknowns)  │
         ▼                     │
     [planned] ───────────────┤ (failureStreak >= 2)
         │ (accept card)       │
         ▼                     │
    [executing] ──────────────┤
         │ (diff complete)     ▼
         ▼                [recovering]
    [verifying] ───────────────┘
         │ (fresh passing evidence)
         ▼
     [complete]
```

## Phases & Rules
1. **`idle`**: Waiting for task intent or standing by silently with `fable-spark`.
2. **`discovering`**: Grounding execution paths, reading docs, resolving unknowns.
3. **`planned`**: Decomposing requirements into atomic, bounded work cards.
4. **`executing`**: Implementing single accepted cards (TDD, minimal edits).
5. **`verifying`**: Collecting machine-checked falsification and acceptance proofs.
6. **`recovering`**: Diagnosing root cause on repeated failure (`failureStreak >= 2`).
7. **`complete`**: State concluded with fresh passing evidence.
