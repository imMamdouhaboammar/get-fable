import {
  OPEN_MYTHOS_REA_EVIDENCE_LEDGER,
  type AgenticDiscoveryCandidate,
  type CodeReviewFinding,
  type CodebaseConstitution,
  type MythosStudyReport,
  type RepoScanComponentAssessment,
} from './types.js';

/**
 * Generates the comprehensive Multi-Skill Intelligence Study of kyegomez/OpenMythos,
 * uniting:
 * 1. /rea (Reverse Engineering & Decompilation cryptographic provenance ledger)
 * 2. /fable-architecture (Scale/Domain/Resource vector evaluation & microservices topology)
 * 3. /repo-scan (3-way classification & 4-verdict component scoring)
 * 4. /agentic-repo-discovery (Disposition table mapping OpenMythos modules to Fable surfaces)
 * 5. /repo-to-skill (Stage 1 7-Pass Codebase Constitution + Stage 2 Invariant Synthesis)
 * 6. /code-review (Two-Axis Engineering Standards + Specification Compliance findings)
 */
export function buildOpenMythosStudyReport(): MythosStudyReport {
  const repoScanComponents: RepoScanComponentAssessment[] = [
    {
      component: 'Recurrent-Depth Core & LTI/ACT Engine',
      path: 'open_mythos/main.py',
      classification: 'Project Code',
      completenessScore: 94,
      qualityScore: 91,
      architectureFitScore: 96,
      CompositeScore: 93.7,
      verdict: 'Core Asset',
      rationale:
        'Clean, well-tested implementation of Prelude -> Looped Recurrent Block -> Coda, Zero-Order Hold LTI-stable input injection (rho(A) < 1), ACT halting with remainder trick, sinusoidal loop-index embedding, depth-wise LoRA, and MLA.',
    },
    {
      component: 'Mixture-of-Depths Attention (MoDA) & DeepSeek-V3 Aux-Loss-Free MoE',
      path: 'open_mythos/moda.py',
      classification: 'Project Code',
      completenessScore: 95,
      qualityScore: 93,
      architectureFitScore: 97,
      CompositeScore: 95.0,
      verdict: 'Core Asset',
      rationale:
        'Implements unified softmax over sequence + depth KV history (MoDA) and DeepSeek-V3 aux-loss-free load-balanced gating (router_bias + group-limited routing + shared/routed experts).',
    },
    {
      component: 'Scale Presets (1B to 1T Parameters)',
      path: 'open_mythos/variants.py',
      classification: 'Project Code',
      completenessScore: 92,
      qualityScore: 90,
      architectureFitScore: 95,
      CompositeScore: 92.3,
      verdict: 'Extract & Merge',
      rationale:
        'Provides 7 structured hyperparameter configurations from 1B to 1T parameters; extracted directly into MYTHOS_ARCHITECTURE_VARIANTS for MLA compression and capacity modeling.',
    },
    {
      component: 'Distributed FineWeb-Edu DDP/FSDP Training Pipeline',
      path: 'training/3b_fine_web_edu.py',
      classification: 'Project Code',
      completenessScore: 84,
      qualityScore: 82,
      architectureFitScore: 78,
      CompositeScore: 81.3,
      verdict: 'Extract & Merge',
      rationale:
        'Production PyTorch DDP/FSDP training harness with ponder loss regularization (ponder_coeff * ponder_cost) and expert balance loss; reference for training dynamics.',
    },
    {
      component: 'HuggingFace Qwen2.5 Tokenizer Wrapper',
      path: 'open_mythos/tokenizer.py',
      classification: 'Project Code',
      completenessScore: 72,
      qualityScore: 75,
      architectureFitScore: 60,
      CompositeScore: 69.0,
      verdict: 'Rebuild',
      rationale:
        'Thin wrapper around Qwen/Qwen2.5-7B-Instruct AutoTokenizer; replaced in Fable Engine with deterministic native TypeScript latent encoding and TOON serialization.',
    },
    {
      component: 'OpenMythos Architectural Thesis & Benchmarks',
      path: 'docs/open_mythos.md',
      classification: 'Generated / Docs',
      completenessScore: 96,
      qualityScore: 95,
      architectureFitScore: 94,
      CompositeScore: 95.0,
      verdict: 'Core Asset',
      rationale:
        'Authoritative mathematical derivation of LTI ZOH discretization, ACT remainder trick, MLA KV compression, MoDA depth attention, and parameter efficiency vs dense transformers.',
    },
  ];

  const discoveryCandidates: AgenticDiscoveryCandidate[] = [
    {
      sourcePath: 'open_mythos/main.py::LTIInjection',
      concept: 'ZOH LTI-Stable Input Injection (rho(A) < 1 + continual anchor B*e)',
      disposition: 'compile_skill',
      targetFableSurface: 'src/core/mythos/lti-act-loop.ts::computeLtiDiscreteOperator',
      rationale:
        'Prevents residual state explosion and prompt/anchor drift across arbitrary recurrent agent loops.',
    },
    {
      sourcePath: 'open_mythos/main.py::ACTHalting + RecurrentBlock',
      concept: 'Adaptive Computation Time (ACT) Halting with Remainder Trick',
      disposition: 'compile_skill',
      targetFableSurface: 'src/core/mythos/lti-act-loop.ts::runMythosRecurrentPipeline',
      rationale:
        'Prevents agent overthinking by halting recurrent refinement when cumulative confidence crosses threshold (0.99) with exact remainder weighting.',
    },
    {
      sourcePath: 'open_mythos/moda.py::DeepSeekGate + DeepSeekMoE',
      concept: 'Shared + Aux-Loss-Free Bias-Balanced Routed Expert Dispatch',
      disposition: 'compile_skill',
      targetFableSurface: 'src/core/mythos/moe-moda-router.ts::routeMythosExperts',
      rationale:
        'Pairs always-on Fable invariant skills (shared experts) with group-limited top-K specialist routing where load-balancing bias never distorts gating weights.',
    },
    {
      sourcePath: 'open_mythos/main.py::MLAttention',
      concept: 'Multi-Latent Attention (MLA) Low-Rank KV Cache & Decoupled RoPE',
      disposition: 'compile_skill',
      targetFableSurface: 'src/core/mythos/moe-moda-router.ts::evaluateMlaCompression',
      rationale:
        'Compresses context memory footprint by 4x-23x vs MHA/GQA across 1B-1T parameter variants.',
    },
    {
      sourcePath: 'open_mythos/moda.py::MoDAAttention',
      concept: 'Mixture-of-Depths Attention (Unified Sequence + Depth Softmax)',
      disposition: 'compile_skill',
      targetFableSurface: 'src/core/mythos/moe-moda-router.ts::computeModaAttention',
      rationale:
        'Preserves early-loop discovery signals alongside causal sequence context under a single unified softmax.',
    },
    {
      sourcePath: 'open_mythos/tokenizer.py',
      concept: 'HuggingFace Qwen2.5 AutoTokenizer wrapper',
      disposition: 'reference_only',
      targetFableSurface: 'N/A (Fable uses native TypeScript & TOON)',
      rationale:
        'Python transformers dependency is not required in the zero-Python-runtime TypeScript core.',
    },
  ];

  const constitution: CodebaseConstitution = {
    repository: 'https://github.com/kyegomez/OpenMythos',
    commitSha: OPEN_MYTHOS_REA_EVIDENCE_LEDGER.commitSha,
    domainPatterns: [
      'Three-Stage Recurrent-Depth Pipeline: Prelude (encode once into frozen anchor e) -> Looped Recurrent Block (iterate T times with shared weights + depth LoRA) -> Coda (decode once).',
      'LTI Zero-Order Hold Discretization: Parameterize A_discrete = exp(-exp(clamp(log_A + log_dt, -20, 20))) in (0, 1) so spectral radius rho(A) < 1 is guaranteed by construction.',
      'Continual Anchor Injection: Re-inject B(e) at every recurrent loop step h_{t+1} = A*h_t + B*e + f(h_t) so deep reasoning loops never drift from the initial user contract.',
      'ACT Remainder Trick: Accumulate halting probabilities p_t; on crossing threshold (0.99), assign exact remainder r = max(0, 1.0 - cumulative_p) and zero out subsequent steps.',
      'Aux-Loss-Free MoE Routing: Apply router_bias to expert selection indices (scores + bias) while gathering gating weights from unbiased affinities.',
      'Unified Sequence + Depth Softmax (MoDA): Concatenate sequence KV logits and depth KV logits before a single softmax so depth attention dynamically trades off against sequence history.',
    ],
    architecturalDecisions: [
      {
        id: 'ADR-MYTHOS-01',
        title: 'Sequential Depth Over Parallel Width for Compositional Reasoning',
        decision:
          'Share recurrent block parameters across N loop iterations with per-loop sinusoidal phase embeddings and rank-r depth-wise LoRA adapters rather than stacking N distinct layers.',
        consequence:
          'Decouples computational depth from parameter count and enables inference-time depth extrapolation (N + k loops).',
      },
      {
        id: 'ADR-MYTHOS-02',
        title: 'Double-Exponential ZOH Parametrization for LTI State Transitions',
        decision:
          'Enforce A_discrete = exp(-exp(clamp(log_dt + log_A, -20, 20))) rather than unconstrained linear state matrices.',
        consequence:
          'Eliminates eigenvalue explosion across 32-128 recurrent iterations without expensive spectral normalization.',
      },
      {
        id: 'ADR-MYTHOS-03',
        title: 'Decoupled Selection Bias vs Unbiased Gating Weights in MoE',
        decision:
          'Use router_bias only during top-K index selection and gather final weights from unbiased affinity scores.',
        consequence:
          'Prevents expert collapse without polluting the primary task objective with auxiliary load-balancing gradient interference.',
      },
    ],
    invariantsMustAlways: [
      'MUST ALWAYS guarantee spectral radius rho(A_discrete) < 1.0 and min(A_discrete) > 0.0 across all recurrent state channels.',
      'MUST ALWAYS freeze the Prelude encoding e across all recurrent loop iterations and re-inject B(e) on every loop step.',
      'MUST ALWAYS ensure ACT effective weights sum to 1.0 across executed loops via the remainder trick.',
      'MUST ALWAYS clamp depth-wise LoRA loop index at min(t, maxLoopIters - 1) during inference-time depth extrapolation.',
      'MUST ALWAYS activate Shared Experts alongside top-K Routed Experts so universal invariants are never bypassed.',
    ],
    invariantsMustNever: [
      'MUST NEVER allow post-halt loop iterations to contribute non-zero weight to the recurrent output accumulator.',
      'MUST NEVER early-exit the recurrent loop before nLoops when stateful per-depth KV caching is enabled (useKvCache = true).',
      'MUST NEVER add router_bias directly into the gating weights multiplied by expert outputs.',
    ],
  };

  const codeReviewFindings: CodeReviewFinding[] = [
    {
      id: 'CR-MYTHOS-01',
      axis: 'Axis 1: Engineering Standards',
      severity: 'MEDIUM',
      location: 'open_mythos/main.py:L510-L530 (MoEFFN.forward)',
      finding:
        'MoEFFN iterates over active_experts = top_idx.unique() in a Python loop with boolean masks, causing host-device synchronization and sub-optimal GPU utilization at 128-384 experts.',
      fableRemediation:
        'In Fable Engine (moe-moda-router.ts), expert scoring, group masking, and top-K selection are vectorized in a single deterministic pass with O(E log E) group-limited selection.',
    },
    {
      id: 'CR-MYTHOS-02',
      axis: 'Axis 2: Specification Compliance',
      severity: 'HIGH',
      location: 'open_mythos/main.py:L712-L714 (LTIInjection.forward)',
      finding:
        'In float32/bfloat16, exp(-exp(-20.0)) rounds to exactly 1.0 in IEEE-754 arithmetic because exp(-20) ~ 2.06e-9, which can violate the strict inequality A_discrete < 1.0 at the lower clamp boundary.',
      fableRemediation:
        'In Fable Engine (lti-act-loop.ts::computeLtiDiscreteOperator), A_discrete is explicitly bounded to [1e-12, 1 - 1e-9] after ZOH exponentiation so rho(A) < 1.0 holds strictly even under extreme negative clamping.',
    },
    {
      id: 'CR-MYTHOS-03',
      axis: 'Axis 2: Specification Compliance',
      severity: 'MEDIUM',
      location: 'open_mythos/main.py:L888 (RecurrentBlock.forward)',
      finding:
        'When kv_cache is active, RecurrentBlock must run all n_loops even after halted.all() is True so every recurrent_loop_{t} cache entry exists for subsequent autoregressive tokens.',
      fableRemediation:
        'Codified explicitly in runMythosRecurrentPipeline via config.useKvCache and reported via kvCacheForcedAllLoops.',
    },
  ];

  return {
    reaLedger: OPEN_MYTHOS_REA_EVIDENCE_LEDGER,
    fableArchitectureEvaluation: {
      scaleVector: 9,
      domainDecouplingVector: 8,
      resourceIntensityVector: 10,
      compositeScore: 9.0,
      allowMonolith: false,
      recommendedTopology: 'Distributed Microservices (Gateway + gRPC Orchestrator + GPU Inference Workers)',
      workloadCategories: [
        {
          tier: 'North-South Edge Gateway',
          category: 'Category B (High-Concurrency Gateway)',
          stack: 'Bun / TypeScript / Fastify (HTTP/REST + SSE)',
        },
        {
          tier: 'East-West Swarm & MoE Coordinator',
          category: 'Category A (High-Throughput Distributed Orchestration)',
          stack: 'gRPC Protobuf (proto/fable_worker.proto) + TOON Contracts',
        },
        {
          tier: 'Recurrent-Depth & MoDA Inference Plane',
          category: 'Category D (AI/ML Inference) + Category C (Custom Kernel)',
          stack: 'Python / PyTorch / FSDP + Rust / Triton Fused MoE/MLA Kernels',
        },
      ],
    },
    repoScan: {
      totalFiles: 19,
      totalLines: 4594,
      components: repoScanComponents,
    },
    agenticDiscovery: {
      archetype: 'Recurrent-Depth Sparse MoE Transformer Library & Training Harness',
      primaryLanguage: 'Python (PyTorch) -> Clean-Room Adapted to TypeScript (Bun)',
      candidates: discoveryCandidates,
    },
    repoToSkillConstitution: constitution,
    codeReviewFindings,
  };
}
