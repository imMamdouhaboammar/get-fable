# Spark Next-Move Policy

## State & Evidence Rules
1. **Repeated Failure**: `failureStreak >= 2` -> "diagnose the repeated failure".
2. **Mutation Delta**: `mutationGeneration > verifiedGeneration` -> "run the affected tests" or "run the build".
3. **Missing Gates**:
   - `fable-tdd` with no failing test -> "write the failing test".
   - `fable-review` with unreviewed diff -> "review the diff".
   - `fable-research` -> "check the current official docs".
   - `fable-release` -> "check release readiness".
   - `fable-handoff` -> "prepare the handoff".
4. **Intake**:
   - Bug/fix intent -> "reproduce the bug".
   - Doc/API intent -> "check the official docs".
   - General intent -> "route the task".
