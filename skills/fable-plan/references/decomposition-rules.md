# Work Card Decomposition & Dependency DAG Rules

## Purpose
Rules for breaking down broad software features and migrations into right-sized, independent work cards with explicit acceptance criteria and dependency ordering.

## Card Sizing Rules (The 1-3 File Invariant)
- **Bounded Scope**: A single work card should touch no more than 1 to 3 closely related files.
- **Single Behavioral Unit**: A card should deliver one coherent, testable capability.
- **Time/Complexity Budget**: A skilled agent should be able to implement and locally verify the card in a single execution turn.

## Anatomy of an Accepted Work Card
Every work card must contain four mandatory sections:
1. **Goal Statement**: What capability is being added or fixed.
2. **Target File Boundaries**: Explicit list of files to create, modify, or delete.
3. **Machine-Checkable Acceptance Test**: The exact command that proves the card succeeded (e.g. `bun test test/auth/jwt.test.ts`).
4. **Architectural Invariants**: Specific constraints that must remain true (e.g. "no breaking changes to public /v1 routes").

## Dependency Ordering & DAG Construction
- Order cards so that dependencies are resolved upstream before downstream consumers are implemented:
  1. Interfaces / Schemas / Data Types
  2. Storage / Model / Database Adapters
  3. Service Logic / Business Rules
  4. API Endpoints / CLI Commands
  5. UI Components / Public Interfaces
- Group independent cards at the same DAG depth for parallel execution via `fable-delegate`.
