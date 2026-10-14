# Example: Verification and Falsification Session

## Task
Verify new JWT revocation feature.

## Steps
1. Run positive test: `bun test test/jwt-revocation.test.ts` -> PASS.
2. Attempt falsification: Test revoked token reuse after server reboot -> Uncovered bug in memory-only token blacklist.
3. Report finding; hand off to `fable-execute` for durable Redis blacklist fix.
4. Re-verify: Full test suite passes; record `evidence pass test "bun test" "All 12 revocation tests pass"`.
