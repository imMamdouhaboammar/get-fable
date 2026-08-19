# Example: Pausing a Session Mid-Migration

## Handoff Record
- **Objective**: PostgreSQL connection pool refactoring.
- **Done**: `src/db/pool.ts` rewritten with generic pool. Tests passing.
- **Next**: Implement healthcheck probe in `src/db/health.ts`.
- **Prerequisite**: Start test database container.
