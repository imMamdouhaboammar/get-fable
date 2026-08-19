# Retry & Recovery Policy

## Core Principle
Do not retry blind code edits without diagnosing root cause.

## Rules
1. **Failure Streak Trigger**: Two consecutive test/command failures (`failureStreak >= 2`) immediately transition phase to `recovering` and route to `fable-recover`.
2. **Revised Hypothesis Requirement**: Recovery cannot exit back to execution until a revised diagnosis or root cause is explicitly stated.
3. **Loop Detection**: If the same error signature recurs >3 times, pause and request user guidance.
