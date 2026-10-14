# OpenMythos Recurrent-Depth & MoE/MoDA/ACT Engine Upgrade (`get-fable`)

## 1. Provenance & Reverse Engineering (`/rea`) Evidence Ledger

- **Upstream Repository**: [`https://github.com/kyegomez/OpenMythos`](https://github.com/kyegomez/OpenMythos)
- **Commit SHA**: `155430a88d2a98322fc4c79b2a067792c3c9579a`
- **Git Tree SHA**: `e360623b4d887000dc11230efe6fd4e9b26ff8b6`
- **Clean-Room Adaptation**: `src/core/mythos/` & `src/cli/commands/mythos.ts`

| Upstream Path | Git Blob SHA-1 | SHA-256 Digest | Bytes | Lines | Primary Symbols |
|---|---|---|---|---|---|
| `open_mythos/main.py` | `65b0fa829f5371d633d2c397bde5175aa73851b4` | `5c03daebcc0bafaf8cdb10d74ec1e31d999392affbc8ca067fc76e99a5d012c9` | 43,881 | 1,085 | `OpenMythos`, `RecurrentBlock`, `LTIInjection`, `ACTHalting`, `LoRAAdapter`, `MLAttention`, `MoEFFN`, `KVCache` |
| `open_mythos/moda.py` | `94f6af593f86410dd20c81510428f5055bd97931` | `335c76d353550cbd3bc409ecfae92141b1ab70265429e0f8e33ccdcb5cd06492` | 42,070 | 1,063 | `OpenMythosMoDA`, `MoDARecurrentBlock`, `MoDAAttention`, `DeepSeekMoE`, `DeepSeekGate`, `DeepSeekExpert` |
| `open_mythos/variants.py` | `83f7dd4f9156b3703233076b09380122bb4d63f1` | `2fbd61a142bf8dfe8e93fed8b65d3ac027fc0e243a0bf0e70b99fe565553fc49` | 5,393 | 198 | `mythos_1b` .. `mythos_1t` |
| `open_mythos/tokenizer.py` | `fadb3a5fe9b2f3b18d3eddcbaf5fa85114f1581c` | `d00ec3a07bf4862f949960d6360bcf11983799e083daa916bb7f8a20b310c86a` | 1,808 | 64 | `MythosTokenizer` |
| `docs/open_mythos.md` | `01c75c05879c91586598dff3037172b63e25f455` | `a6c3e7b9be8117ad21f704671dfd1adf5b066b354e4fcc92ab36ceca23c109df` | 20,418 | 471 | Architectural thesis & derivations |
| `training/3b_fine_web_edu.py` | `e980302c2079ef779d81459f2551ee79156f1294` | `88bfe4c3c71812dd8f73edc87c157be734529b93e8da240d42cada84ee9a0e70` | 21,006 | 551 | `TrainConfig`, `FineWebEduStream`, `train` |
| `tests/test_main.py` | `c54c46267651a4e03e9cbc99c6dc75712c0f88a3` | `62a122ddcb596326d20aafe3abe8a8df3021cb17a063fbd9664390cee06348b6` | 24,650 | 678 | Unit & gradient flow verification suite |

---

## 2. Multi-Skill Architectural & Codebase Synthesis

### A. `/fable-architecture` Vector Evaluation
- **Scale & Load Vector**: `9 / 10` (1B to 1T total parameters, up to 128 recurrent loop iterations, 131K sequence length)
- **Domain Decoupling Vector**: `8 / 10` (Distinct Prelude/Recurrent/Coda stages, 16–384 routed domain specialists + 1–4 shared experts)
- **Resource Intensity Vector**: `10 / 10` (Iterative tensor contractions, per-depth KV cache growth, distributed FSDP/DDP training)
- **Composite Score**: `9.0` $\ge 7.0 \implies$ `allowMonolith: false`.
- **Enforced Polyglot Topology**:
  - **North-South Edge**: Category B (`Bun / TypeScript / Fastify`)
  - **East-West Swarm & MoE Coordinator**: Category A (`gRPC Protobuf` via `proto/fable_worker.proto` + `TOON` contracts)
  - **Inference & Kernel Plane**: Category D (`Python / PyTorch / FSDP`) + Category C (`Rust / Triton` fused MoE & MLA kernels)

### B. `/repo-scan` Component Verdicts
1. `open_mythos/main.py` (`93.7 / 100`) — **Core Asset**: Three-stage Recurrent-Depth pipeline, ZOH LTI-stable input injection, ACT halting with remainder trick, sinusoidal loop-index embedding, depth-wise LoRA, and MLA.
2. `open_mythos/moda.py` (`95.0 / 100`) — **Core Asset**: Mixture-of-Depths Attention (unified sequence + depth KV softmax) and DeepSeek-V3 aux-loss-free load-balanced MoE gate.
3. `open_mythos/variants.py` (`92.3 / 100`) — **Extract & Merge**: 7 canonical scale presets (`mythos_1b` through `mythos_1t`) extracted into `MYTHOS_ARCHITECTURE_VARIANTS`.
4. `training/3b_fine_web_edu.py` (`81.3 / 100`) — **Extract & Merge**: Ponder loss regularization (`ponder_coeff * ponder_cost`) and expert balance loss dynamics.
5. `open_mythos/tokenizer.py` (`69.0 / 100`) — **Rebuild**: Replaced HuggingFace `AutoTokenizer` wrapper with zero-Python-dependency native TypeScript latent encoding and TOON serialization.

### C. `/repo-to-skill` Codebase Constitution Invariants
- **MUST ALWAYS**:
  1. Guarantee spectral radius $\rho(A_{\text{discrete}}) < 1.0$ and $\min(A_{\text{discrete}}) > 0.0$ across all recurrent state channels via Zero-Order Hold (ZOH) discretization:
     $$A_{\text{discrete}} = \exp\bigl(-\exp(\text{clamp}(\log \Delta t + \log A, -20, 20))\bigr) \in (0, 1)$$
  2. Freeze the Prelude encoding $e$ across all recurrent loop iterations and re-inject $B(e)$ on every loop step:
     $$h_{t+1} = A_{\text{discrete}} \odot h_t + B(e) + \Delta_{\text{recurrent}}(h_t, e, t)$$
  3. Ensure ACT effective weights sum to $1.0$ across executed loops via the Remainder Trick ($r = \max(0, 1.0 - \sum_{k < t} p_k)$).
  4. Clamp depth-wise LoRA loop index at $\min(t, T_{\max} - 1)$ during inference-time depth extrapolation.
  5. Activate Shared Experts (`get-fable`, `fable-scope-discipline`, `fable-prove-it`) alongside top-$K$ Routed Experts.
- **MUST NEVER**:
  1. Allow post-halt loop iterations to contribute non-zero weight to the recurrent output accumulator.
  2. Early-exit the recurrent loop before `nLoops` when stateful per-depth KV caching is enabled (`useKvCache = true`).
  3. Add `router_bias` directly into the gating weights multiplied by expert outputs (`router_bias` applies only to top-$K$ selection scores).

### D. `/code-review` Findings & Clean-Room Remediations
- **`CR-MYTHOS-01` (Medium — Engineering Standards)**: `MoEFFN.forward` in `open_mythos/main.py:L510-L530` loops over `top_idx.unique()` in Python with boolean masks. Remediated in `src/core/mythos/moe-moda-router.ts` via vectorized single-pass group-limited top-$K$ selection.
- **`CR-MYTHOS-02` (High — Specification Compliance)**: In `open_mythos/main.py:L712-L714`, `exp(-exp(-20.0))` rounds to `1.0` in 32-bit/16-bit IEEE-754 floating point, violating the strict inequality $\rho(A) < 1.0$ at the lower clamp boundary. Remediated in `computeLtiDiscreteOperator` by bounding $A_{\text{discrete}} \in [10^{-12}, 1 - 10^{-9}]$.
- **`CR-MYTHOS-03` (Medium — Specification Compliance)**: Codified the KV-cache full-loop invariant (`open_mythos/main.py:L888`) in `runMythosRecurrentPipeline` via `useKvCache` and `kvCacheForcedAllLoops`.
