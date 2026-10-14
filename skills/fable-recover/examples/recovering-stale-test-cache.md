# Example: Recovering from Stale Build Cache

## Situation
A TypeScript change was made to `src/auth.ts`, but `bun test` kept failing with an old method signature error despite correct code.

## Recovery Sequence
1. Step 1 (Harness): Check test command -> `bun test test/auth.test.ts` was importing from `dist/index.js` instead of `src/auth.ts`.
2. Step 2 (Execution Path): `dist/` was not rebuilt after edit!
3. Revised Diagnosis: Test driver was evaluating stale built bundle.
4. Bounded Fix: Update test import or run build before test.
