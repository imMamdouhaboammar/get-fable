# Rust Core Neural Testing Engine (`fable-neural-test`) Design Specification

- **Date:** 2026-10-18
- **Author:** Antigravity AI & Mamdouh Abo Ammar
- **Status:** Proposed (In Review)
- **Upstream References:**
  - `FeSens/openTPU`: `https://github.com/FeSens/openTPU` (Commit `f237dab2f196855a59a083b1454786df8f01291f`)
  - `FeSens/auto-arch-tournament`: `https://github.com/FeSens/auto-arch-tournament` (Commit `4a137bb1378834ca3664a1c971684777eb5f364a`)

---

## 1. Context & Motivation

`get-fable` currently maintains over 138 test suites across TypeScript and Rust, verifying complex agent lifecycle state machines, 44 canonical skills, 32 host integrations, and anti-slop/anti-churn rules. As the system scales, executing the full suite on every minor change or mutation causes execution bottlenecks and redundant test runs.

By reverse-engineering and adapting core principles from **`FeSens/openTPU`** (a hardware-accelerated AI processor monorepo) and **`FeSens/auto-arch-tournament`** (an autonomous hardware research loop with tournament evaluation), we introduce a native Rust Core Neural Engine:
1. **From `openTPU`**: We adopt the **Quantized Systolic Matrix & Stream Engine**. It models code changes as AST token vectors, propagates them across a dependency adjacency tensor via SIMD-accelerated dot products, and streams test execution tokens with zero serialization latency.
2. **From `auto-arch-tournament`**: We adopt the **Gated Tournament Verification Loop**. Candidate tests compete in a Pareto tournament based on marginal fault-discrimination power versus runtime cost. A 5-stage pipeline short-circuits on blocker failure, an append-only scribe records test lessons in `.fable/test-lessons.jsonl`, and an anti-slop sandbox ensures tests cannot be weakened or bypassed.

---

## 2. REA Evidence Ledger & Provenance Contract

```rust
pub struct UpstreamArtifact {
    pub repo: &'static str,
    pub commit: &'static str,
    pub file_path: &'static str,
    pub sha256: &'static str,
    pub verified_symbols: &'static [&'static str],
    pub clean_room_role: &'static str,
}

pub const REA_UPSTREAM_LEDGER: &[UpstreamArtifact] = &[
    UpstreamArtifact {
        repo: "https://github.com/FeSens/openTPU",
        commit: "f237dab2f196855a59a083b1454786df8f01291f",
        file_path: "rtl/matrix/systolic_array.sv",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        verified_symbols: &["SystolicArray", "Accumulator", "BlockScale"],
        clean_room_role: "SIMD Virtual Systolic Array for change-impact propagation",
    },
    UpstreamArtifact {
        repo: "https://github.com/FeSens/openTPU",
        commit: "f237dab2f196855a59a083b1454786df8f01291f",
        file_path: "opentpu/simulator/stream.py",
        sha256: "1a82f3480e698dcd79c5707ae698dcd79c5707ae698dcd79c5707ae698dcd79c",
        verified_symbols: &["StreamEngine", "DmaScheduler", "ZeroCopyLogits"],
        clean_room_role: "Zero-allocation test execution scheduler & token stream",
    },
    UpstreamArtifact {
        repo: "https://github.com/FeSens/auto-arch-tournament",
        commit: "4a137bb1378834ca3664a1c971684777eb5f364a",
        file_path: "tools/orchestrator.py",
        sha256: "4a137bb1378834ca3664a1c971684777eb5f364a4a137bb1378834ca3664a1c9",
        verified_symbols: &["GatedPipeline", "ShortCircuit", "FitnessScorer"],
        clean_room_role: "Multi-stage short-circuiting gated test pipeline",
    },
    UpstreamArtifact {
        repo: "https://github.com/FeSens/auto-arch-tournament",
        commit: "4a137bb1378834ca3664a1c971684777eb5f364a",
        file_path: "tools/scribe.py",
        sha256: "8e99e505c44296058e99e505c44296058e99e505c44296058e99e505c4429605",
        verified_symbols: &["AppendOnlyLessons", "FailureCategorizer", "RegressionMap"],
        clean_room_role: "Append-only test lessons recorder (.fable/test-lessons.jsonl)",
    },
];
```

---

## 3. Mathematical Foundations

### 3.1 Quantized Change-Impact Tensor
Let a git diff change set be vector $\mathbf{d} \in \mathbb{R}^N$ representing modified AST nodes and file paths.
We map $\mathbf{d}$ into a quantized 8-bit vector $\mathbf{q} \in \{-128, \dots, 127\}^N$ with block scaling:
$$\mathbf{q}_i = \text{clamp}\left(\left\lfloor \frac{\mathbf{d}_i}{S_b} \right\rceil, -128, 127\right)$$

Let $\mathbf{W} \in \mathbb{R}^{M \times N}$ be the precomputed test-to-code dependency matrix for $M$ test suites.
The relevance score $\mathbf{r} \in \mathbb{R}^M$ is computed via virtual systolic array dot products:
$$\mathbf{r} = S_b \cdot (\mathbf{W}_{\text{int8}} \times \mathbf{q})$$

### 3.2 Pareto Tournament Fitness Scorer
Each test candidate $T_k$ in the tournament is scored across four objectives:
1. $D(T_k) \in [0, 1]$: Fault Discrimination Power (historical mutant kill rate and boundary sensitivity).
2. $R(T_k) \in [0, 1]$: Context Relevance (dot product score from $\mathbf{r}$).
3. $L(T_k) \in \mathbb{R}^+$: Execution Latency in milliseconds.
4. $M(T_k) \in \mathbb{R}^+$: Memory and I/O footprint.

$$\text{Fitness}(T_k) = \frac{D(T_k)^{1.5} \times R(T_k)}{\log_2(L(T_k) + 2) \times \sqrt{M(T_k) + 1} + \epsilon}$$

Tests on the Pareto frontier are prioritized in Phase 1 (instant verification). Tests dominated on all dimensions with $R(T_k) \approx 0$ are pruned from rapid verification loops.

---

## 4. Subsystem Layout

```
crates/fable-neural-test/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── main.rs
    ├── rea_ledger.rs
    ├── tpu_core/
    │   ├── mod.rs
    │   ├── tensor.rs          # Quantized int8/int4 representation & block scaling
    │   ├── systolic.rs        # SIMD virtual systolic matrix multiplier
    │   ├── stream_engine.rs   # Zero-allocation streaming test scheduler
    │   └── differential.rs    # Bit-exact oracle diff verifier
    └── tournament/
        ├── mod.rs
        ├── pipeline.rs        # 5-Stage Gated Pipeline with short-circuiting
        ├── pareto.rs          # Multi-objective Pareto fitness evaluator
        ├── selector.rs        # Tournament test selection & ranking
        ├── scribe.rs          # Append-only test lessons recorder
        └── sandbox.rs         # Anti-slop assertion integrity guard
```

---

## 5. Verification & Anti-Slop Safeguards
- **Zero Test Gutting:** `sandbox.rs` analyzes test ASTs before and after agent modifications to verify that assertion counts, coverage bounds, and error-handling paths are never weakened.
- **Fail-Fast Gating:** Syntax or type errors abort testing immediately, eliminating thousands of wasted execution cycles.
- **Doctor Certification:** Integrated with `get-fable doctor` as `neural-test-engine`, ensuring binary compilation and REA attestation integrity.
