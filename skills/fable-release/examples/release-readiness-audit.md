# Example: Release Readiness Audit

## Steps
1. Run `bun test` -> All 167 tests pass.
2. Run `bun run typecheck` -> Clean.
3. Run `npm pack --dry-run` -> Verify `skills/`, `schemas/`, `packs/` are bundled.
4. Issue verdict: "Ready for release v1.2.1."
