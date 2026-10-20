# Example Walkthrough: Differential Oracle & Flakiness Diagnosis

This walkthrough shows an agent diagnosing a suspected non-deterministic divergence using `fable-test` Tier 2 differential oracles.

---

## 1. Problem Statement

A test comparing tensor dot products between two test runs occasionally diverges due to floating-point rounding or non-deterministic hash map iteration order.

---

## 2. Investigation Protocol

### Step 1: Capture Baseline and Candidate Outputs
The agent serializes the output of Run A and Run B into JSON or canonical hex strings.

### Step 2: Invoke Native Differential Oracle
The agent calls `fable_neural_test` via the native CLI:

```bash
./target/release/get-fable-native rig call-tool --tool fable_neural_test --args '{
  "action": "differential",
  "baseline": "{\"keys\": [\"alpha\", \"beta\", \"gamma\"], \"values\": [1.0, 2.0, 3.0]}",
  "candidate": "{\"keys\": [\"beta\", \"alpha\", \"gamma\"], \"values\": [2.0, 1.0, 3.0]}"
}' --json
```

Output:
```json
{
  "action": "differential",
  "passed": false,
  "differential_exact_match": false,
  "mismatch_index": 10,
  "baseline_digest": "4a71...",
  "candidate_digest": "8e3b...",
  "summary": "Differential mismatch detected at byte offset 10"
}
```

### Step 3: Root Cause Isolation
Byte offset 10 corresponds to `"alpha"` vs `"beta"` in `"keys"`. The divergence is caused by non-deterministic key ordering during map serialization.

### Step 4: Fix Applied
The agent introduces canonical BTree sorting (`BTreeMap` in Rust or sorted keys in TypeScript) before serialization.

### Step 5: Verification of the Fix
The agent re-executes the differential oracle:

```bash
./target/release/get-fable-native rig call-tool --tool fable_neural_test --args '{
  "action": "differential",
  "baseline": "{\"keys\": [\"alpha\", \"beta\", \"gamma\"], \"values\": [1.0, 2.0, 3.0]}",
  "candidate": "{\"keys\": [\"alpha\", \"beta\", \"gamma\"], \"values\": [1.0, 2.0, 3.0]}"
}' --json
```

Output:
```json
{
  "action": "differential",
  "passed": true,
  "differential_exact_match": true,
  "mismatch_index": null,
  "summary": "Bit-exact match verified (digest: 4a71...)"
}
```

Differential oracle passes with zero discrepancy.
