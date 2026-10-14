# Example: Bounded Card Execution

## Card
"Add exponential backoff retry to webhook delivery worker in `src/workers/webhook.ts`."

## Steps
1. Open `src/workers/webhook.ts`.
2. Add backoff calculation (`Math.pow(2, attempt) * 1000`).
3. Run `bun test test/webhook.test.ts`.
4. Observe test passing; record mutation generation advancement.
