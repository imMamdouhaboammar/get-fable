# Example Walkthrough: Full Test Pyramid Run

This walkthrough demonstrates an AI agent executing the full 7-tier test pyramid of `get-fable` following a core feature addition.

---

## 1. Context & Task

The agent has just completed implementing a new Rig agent tool in Rust (`crates/fable-rig`) and bound it to the TypeScript CLI (`src/cli/commands/rig.ts`). Before declaring the task complete, the agent executes `fable-test`.

---

## 2. Execution Log

### Step 1: Tier 1 Unit & Type Check
The agent begins at the base of the pyramid:

```bash
bun test test/rig-integration.test.ts
```
Output:
```text
bun test v1.4.3
✓ fable-rig integration and native CLI bridge > findNativeBinary locates a valid get-fable-native binary [1.50ms]
✓ fable-rig integration and native CLI bridge > CLI command rig status returns ready engine status and tools [18.31ms]
...
7 pass
0 fail
51 expect() calls
```

Then verifies the Rust workspace:
```bash
~/.cargo/bin/cargo test --workspace
```
Output:
```text
running 8 tests in fable_rig... ok
running 11 tests in fable_neural_test... ok
running 9 tests in fable_anti_slop... ok
running 4 tests in fable_anti_churn... ok
test result: ok. 0 failed across all crates.
```

And checks types:
```bash
bun run typecheck
```
Output:
```text
$ tsc --noEmit
# Exited with code 0.
```

### Step 2: Tier 2 Neural Differential Oracles
The agent checks bit-exact token stream processing:

```bash
./target/release/get-fable-native rig call-tool --tool fable_neural_test --args '{
  "action": "differential",
  "baseline": "stream_matrix_abc123",
  "candidate": "stream_matrix_abc123"
}' --json
```
Output:
```json
{
  "action": "differential",
  "passed": true,
  "differential_exact_match": true,
  "summary": "Bit-exact match verified"
}
```

### Step 3: Tier 3 Anti-Slop AST Diff Guard
The agent scans the git diff to ensure no weak assertions or skipped tests were added:

```bash
bun ./bin/get-fable.js anti-slop scan --base HEAD
```
Output:
```text
=== Fable Anti-Slop Engineering Gate: [CLEAN] ===
Findings: 0 blocker(s), 0 review item(s), 0 warning(s)
All test assertions maintain integrity.
```

### Step 4: Tier 4 Integration & RPC
The agent tests the live gRPC worker service:

```bash
bun test test/worker-rpc.test.ts
```
Output:
```text
5 pass, 0 fail.
```

### Step 5: Tier 7 System Doctor Audit
The agent runs the system doctor:

```bash
bun ./bin/get-fable.js doctor --json-v1
```
Output:
```json
{
  "schemaVersion": 1,
  "command": "doctor",
  "data": {
    "ok": true,
    "checks": [...]
  }
}
```

---

## 3. Final Evidence Stamped

The agent commits fresh passing evidence into `.fable/state.json`:

```bash
bun ./bin/get-fable.js evidence pass test "cargo test --workspace && bun test" "7 tiers verified with 0 failures and 0 anti-slop blockers"
```

The task is verified with zero false claims.
