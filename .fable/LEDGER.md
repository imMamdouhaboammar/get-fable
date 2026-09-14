# get-fable repository ledger

The repository is armed with get-fable, but no work round is persisted in this tracked file

For substantial work, create bounded cards with explicit acceptance checks

- [x] implement ADR 0007 transport boundaries and proto schemas -- evidence: docs/adr/0007-transport-boundaries-rest-vs-grpc.md and proto/fable_worker.proto created
- [x] implement gRPC worker server, client adapter, and CLI command -- evidence: bun test test/worker-rpc.test.ts (5 pass)
- [x] implement fable-architecture core evaluation engine & deterministic scoring algorithm -- evidence: bun test test/fable-architecture.test.ts (22 pass)
- [x] create complete skills/fable-architecture/ skill package with schema v2 -- evidence: validateSkillPackage('fable-architecture') (valid: true, 0 errors, 13 resources)
- [x] integrate fable-architecture into registry, task router, hook dispatch, and regenerate catalogs -- evidence: bun run check:generated (pass) and bun ./bin/get-fable.js doctor --json (0 errors, 28 skills)
- [x] verify architecture enforcement test suite and system doctor -- evidence: bun run typecheck (pass), bun test test/fable-architecture.test.ts (22 pass), bun run build (pass)

```text
example open:   - [ ] <card> -- acceptance: <command or observable condition>
example done:   - [x] <verified card> -- evidence: <command/result or concrete observation>
example defer:  - [~] <deferred card> -- deferred: <reason>
```

`PAUSED: <reason>` may temporarily suspend lifecycle enforcement for unrelated user work

Strict runtime phase, failure streak, routing decision, and evidence records live in `.fable/state.json`
