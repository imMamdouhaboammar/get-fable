# Example: Multi-File Migration Plan

## Task
Migrate database queries from raw SQL strings to parameterized query builder.

## Decomposed Cards
- **Card 1: User Repository**: Migrate `src/db/users.ts` -> Acceptance: `bun test test/users.test.ts`.
- **Card 2: Billing Repository**: Migrate `src/db/billing.ts` -> Acceptance: `bun test test/billing.test.ts`.
- **Card 3: Audit & Cleanup**: Remove raw SQL helpers in `src/db/raw.ts` -> Acceptance: `bun run typecheck && bun test`.
