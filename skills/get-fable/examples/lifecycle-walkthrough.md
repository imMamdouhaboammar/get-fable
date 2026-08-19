# Example: End-to-End Lifecycle Walkthrough

## Scenario
Add a rate limiter middleware to an API backend.

1. **Route & Intake**: `get-fable route "Add rate limiting to express API" --apply` -> Routes to `fable-plan`.
2. **Planning**: `fable-plan` defines card with acceptance command `bun test test/rate-limiter.test.ts`.
3. **Execution**: `fable-tdd` writes failing test, implements minimal limiter in `src/middleware/rate-limiter.ts`.
4. **Verification**: `fable-verify` runs full suite; `evidence pass test "bun test" "14 tests passing"`.
5. **Review**: `fable-review` checks diff for memory leaks or edge cases.
6. **Completion**: `get-fable state complete` validates current-generation evidence.
