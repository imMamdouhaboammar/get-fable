# Fable Testing Tool & Skill Dispatch Matrix

`fable-test` acts as the testing architect and orchestrator across the full project lifecycle, delegating to specialized skills and engines as needed.

---

## Tool & Skill Dispatch Decision Table

| Need / Context | Target Engine / Skill | Dispatch Mechanism | Required Outcome |
|---|---|---|---|
| **Authoring tests for new feature or bugfix** | `fable-tdd` | Lifecycle route to `fable-tdd` | Red-Green-Refactor sequence with observable failing test first |
| **Visual E2E testing of Web/Mobile GUI** | `get-fable test-engine` (Midscene) | CLI: `bun ./bin/get-fable.js test-engine run --tool midscene` | Multimodal AI visual inspection without fragile CSS selectors |
| **API traffic capture & deterministic replay** | `get-fable test-engine` (Keploy) | CLI: `bun ./bin/get-fable.js test-engine run --tool keploy` | Zero-code API regression testing with database virtualization |
| **Auditing test code for slop & weak assertions** | `fable-anti-slop-engineering` | CLI: `bun ./bin/get-fable.js anti-slop scan` | Zero skipped tests, zero tautological assertions, zero swallowed errors |
| **Evaluating test value & detecting zero-selection** | `get-fable test-value` | CLI: `bun ./bin/get-fable.js test-value spearhead` | Verified test count > 0, risk-weighted boundary assertions |
| **Recording final verification proof** | `fable-verify` | CLI: `bun ./bin/get-fable.js evidence pass test ...` | Machine-checked evidence stamped with current mutation generation |

---

## Delegation Contract (Zero Scope Drift)

1. When writing tests during an active implementation phase, never write the implementation first. Hand off to `fable-tdd`.
2. Before declaring tests done, run `anti-slop scan` to ensure no `test.skip` or `expect(true).toBe(true)` slipped into the diff.
3. Once all tests pass, record passing evidence via `get-fable evidence pass test "<command>" "<detail>"`.
