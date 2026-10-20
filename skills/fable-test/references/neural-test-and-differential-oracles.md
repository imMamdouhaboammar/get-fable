# Neural Test Acceleration & Differential Oracles

Guide for executing, diagnosing, and asserting with Fable's native Rust neural test engine (`crates/fable-neural-test` and `crates/fable-rig`).

---

## 1. What is Differential Testing?

In complex agentic and numerical systems, traditional unit assertions (`assert_eq!(result, expected)`) often fail to capture subtle semantic drift across model updates, quantizations, or algorithmic refactors.

Differential testing evaluates two candidate implementations (or a baseline and treatment) against identical inputs, computing:
1. **Bit-Exact Equivalence:** Identical output buffers across both executions.
2. **First Mismatch Index:** If outputs diverge, pinpointing the exact byte index where execution parted paths.
3. **Cryptographic Fingerprints:** SHA-256 digests of baseline and candidate execution streams.

---

## 2. Using the Differential Oracle via Rig CLI

The native CLI exposes the differential oracle directly to AI agents:

```bash
# Test bit-exact equality between baseline and candidate token streams
get-fable rig call-tool --tool fable_neural_test --args '{
  "action": "differential",
  "baseline": "stream_tensor_v1_0010203040",
  "candidate": "stream_tensor_v1_0010203040"
}' --json
```

Output:
```json
{
  "action": "differential",
  "passed": true,
  "differential_exact_match": true,
  "mismatch_index": null,
  "baseline_digest": "3d5f...",
  "candidate_digest": "3d5f...",
  "summary": "Bit-exact match verified (digest: 3d5f...)"
}
```

If an output diverges:
```bash
get-fable rig call-tool --tool fable_neural_test --args '{
  "action": "differential",
  "baseline": "token_stream_0123456789",
  "candidate": "token_stream_01234X6789"
}' --json
```

Output:
```json
{
  "action": "differential",
  "passed": false,
  "differential_exact_match": false,
  "mismatch_index": 18,
  "summary": "Differential mismatch detected at byte offset 18"
}
```

---

## 3. REA Provenance Ledger Verification

The neural test engine cryptographically verifies its clean-room reverse engineering provenance against upstream sources:

```bash
get-fable rig call-tool --tool fable_neural_test --args '{"action":"ledger"}' --json
```

Checks:
- All upstream commits are valid 40-character commit SHAs.
- All artifact digests are valid 64-character SHA-256 strings.
- Upstream repositories match declared origins (`FeSens/openTPU`, `FeSens/auto-arch-tournament`).
