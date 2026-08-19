# Example: Adding a Discount Calculator via TDD

## Steps
1. Write test in `test/discount.test.ts` for 20% loyalty discount.
2. Run `bun test test/discount.test.ts` -> OBSERVE RED: `calculateDiscount is not a function`.
3. Implement `calculateDiscount(price, rate)` in `src/discount.ts`.
4. Run `bun test test/discount.test.ts` -> OBSERVE GREEN: `1 pass`.
5. Hand off to `fable-verify`.
