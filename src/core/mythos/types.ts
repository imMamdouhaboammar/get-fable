/**
 * Fable Mythos Recurrent-Depth Engine — Types & Cryptographic REA Provenance Ledger
 *
 * Clean-room TypeScript architecture inspired by the Reverse Engineering & Decompilation
 * (REA) study of kyegomez/OpenMythos (commit 155430a88d2a98322fc4c79b2a067792c3c9579a).
 *
 * Implements:
 * 1. Three-Stage Recurrent-Depth Pipeline (Prelude -> Looped Recurrent Block -> Coda)
 * 2. LTI-Stable Input Injection (Zero-Order Hold discretization guaranteeing spectral radius rho(A) < 1)
 * 3. Adaptive Computation Time (ACT) Halting with Remainder Trick & Overthinking Guard
 * 4. Sinusoidal Loop-Index Phase Encoding & Clamped Depth-Wise LoRA Adaptation
 * 5. Fine-Grained DeepSeekMoE Router (Shared + Aux-Loss-Free Bias-Balanced Routed Experts)
 * 6. Multi-Latent Attention (MLA) KV-Cache Compression Calculator & Context Compressor
 * 7. Mixture-of-Depths Attention (MoDA) Unified Sequence + Depth Softmax Aggregator
 * 8. Multi-Skill Repository Intelligence (/rea, /fable-architecture, /repo-scan,
 *    /agentic-repo-discovery, /repo-to-skill, /code-review)
 */

export interface MythosReaArtifactProvenance {
  path: string;
  gitBlobSha1: string;
  sha256: string;
  bytes: number;
  lines: number;
  role: string;
  verifiedSymbols: string[];
  lineRanges: Record<string, string>;
}

export interface MythosReaEvidenceLedger {
  sourceRepo: string;
  commitSha: string;
  gitTreeSha: string;
  studiedAt: string;
  cleanRoomAdaptation: boolean;
  verifiedArtifacts: MythosReaArtifactProvenance[];
  limitations: string[];
  unknowns: string[];
}

export type MythosVariantId =
  | 'mythos_1b'
  | 'mythos_3b'
  | 'mythos_10b'
  | 'mythos_50b'
  | 'mythos_100b'
  | 'mythos_500b'
  | 'mythos_1t';

export interface MythosVariantSpec {
  id: MythosVariantId;
  targetTotalParams: string;
  estimatedActiveParamsPerLoop: string;
  dim: number;
  nHeads: number;
  headDim: number;
  kvLoraRank: number;
  qLoraRank: number;
  qkRopeHeadDim: number;
  nPrelude: number;
  nRecurrent: number;
  nCoda: number;
  nLoops: number;
  maxLoopIters: number;
  loraRank: number;
  actThreshold: number;
  nRoutedExperts: number;
  nSharedExperts: number;
  numExpertsPerTok: number;
  moeIntermediateSize: number;
  sharedIntermediateSize: number;
  maxSeqLen: number;
  vocabSize: number;
  attentionType: 'mla' | 'moda';
}

export interface MythosRecurrentConfig {
  dim: number;
  nLoops: number;
  maxLoopIters: number;
  actThreshold: number;
  loraRank: number;
  ltiLogAInit: number;
  ltiLogDtInit: number;
  useKvCache: boolean;
  preludeLayers: number;
  codaLayers: number;
}

export interface LtiDiscreteOperator {
  logAClamped: number[];
  logDtClamped: number[];
  aDiscrete: number[];
  spectralRadius: number;
  strictlyStable: boolean;
  minEigenvalue: number;
  maxEigenvalue: number;
}

export interface LtiStepResult {
  nextState: number[];
  ltiOperator: LtiDiscreteOperator;
  anchorContributionNorm: number;
  recurrentContributionNorm: number;
  anchorDriftCosine: number;
}

export interface ActHaltingStep {
  loopIndex: number;
  rawHaltingProb: number;
  effectiveWeight: number;
  cumulativeProbBefore: number;
  cumulativeProbAfter: number;
  crossedThresholdThisStep: boolean;
  haltedAfterStep: boolean;
  loopIndexEmbedding: number[];
  loraDepthScale: number[];
  clampedLoraLoopIndex: number;
  stateNorm: number;
  anchorCosineSimilarity: number;
  convergenceDelta: number;
}

export interface MythosRecurrentPipelineResult {
  task: string;
  config: MythosRecurrentConfig;
  preludeEncoding: number[];
  recurrentOutput: number[];
  codaOutput: number[];
  loopsExecuted: number;
  earlyStoppedByAct: boolean;
  kvCacheForcedAllLoops: boolean;
  totalEffectiveWeight: number;
  ponderCost: number;
  overthinkingDetected: boolean;
  overthinkingReason: string | null;
  ltiSummary: {
    spectralRadius: number;
    strictlyStable: boolean;
    finalAnchorCosineSimilarity: number;
  };
  steps: ActHaltingStep[];
}

export interface MoeExpertSpec {
  id: string;
  pack: string;
  phase: string;
  shared: boolean;
  groupIndex: number;
  keywords: string[];
  domainVector: number[];
}

export interface MoeRoutedExpertSelection {
  expertId: string;
  pack: string;
  groupIndex: number;
  unbiasedAffinity: number;
  biasedSelectionScore: number;
  routerBias: number;
  normalizedGateWeight: number;
}

export interface MoeRouteDecision {
  task: string;
  scoringFunc: 'softmax' | 'sigmoid';
  sharedExperts: string[];
  routedExperts: MoeRoutedExpertSelection[];
  selectedGroups: number[];
  balanceLoss: number;
  loadDistribution: Record<string, number>;
  updatedRouterBias: Record<string, number>;
  auxLossFreeBalanced: boolean;
}

export interface MlaCompressionReport {
  variantId: MythosVariantId;
  seqLen: number;
  batchSize: number;
  bytesPerElement: number;
  effectiveDepthLayers: number;
  standardMhaKvElementsPerTokenPerLayer: number;
  gqa8HeadsKvElementsPerTokenPerLayer: number;
  mlaLatentElementsPerTokenPerLayer: number;
  standardMhaBytesTotal: number;
  gqa8HeadsBytesTotal: number;
  mlaBytesTotal: number;
  compressionRatioVsMha: number;
  compressionRatioVsGqa8: number;
  memorySavedPercentVsMha: number;
  memorySavedPercentVsGqa8: number;
}

export interface LatentContextSummary {
  originalDimensions: number;
  kvLoraRank: number;
  ropeDecoupledDim: number;
  compressedLatentCkV: number[];
  decoupledRopeKey: number[];
  reconstructedKeyNorm: number;
  reconstructedValueNorm: number;
  compressionRatio: number;
}

export interface ModaDepthLayerEntry {
  depthIndex: number;
  stage: 'prelude' | 'recurrent_loop' | 'coda';
  loopIteration: number | null;
  keyVector: number[];
  valueVector: number[];
  summary: string;
}

export interface ModaAttentionResult {
  querySummary: string;
  sequenceKeysCount: number;
  depthKeysCount: number;
  unifiedSoftmaxWeights: {
    sequenceWeights: number[];
    depthWeights: Array<{
      depthIndex: number;
      stage: 'prelude' | 'recurrent_loop' | 'coda';
      loopIteration: number | null;
      weight: number;
      summary: string;
    }>;
  };
  sequenceAttentionMass: number;
  depthAttentionMass: number;
  combinedOutputVector: number[];
  depthSignalPreserved: boolean;
}

export type RepoScanVerdict = 'Core Asset' | 'Extract & Merge' | 'Rebuild' | 'Deprecate';

export interface RepoScanComponentAssessment {
  component: string;
  path: string;
  classification: 'Project Code' | 'Third-Party / Vendored' | 'Generated / Docs';
  completenessScore: number;
  qualityScore: number;
  architectureFitScore: number;
  CompositeScore: number;
  verdict: RepoScanVerdict;
  rationale: string;
}

export type AgenticDisposition =
  | 'preserve_skill'
  | 'compile_skill'
  | 'reference_only'
  | 'runtime_dependency';

export interface AgenticDiscoveryCandidate {
  sourcePath: string;
  concept: string;
  disposition: AgenticDisposition;
  targetFableSurface: string;
  rationale: string;
}

export interface CodebaseConstitution {
  repository: string;
  commitSha: string;
  domainPatterns: string[];
  architecturalDecisions: Array<{
    id: string;
    title: string;
    decision: string;
    consequence: string;
  }>;
  invariantsMustAlways: string[];
  invariantsMustNever: string[];
}

export interface CodeReviewFinding {
  id: string;
  axis: 'Axis 1: Engineering Standards' | 'Axis 2: Specification Compliance';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  location: string;
  finding: string;
  fableRemediation: string;
}

export interface MythosStudyReport {
  reaLedger: MythosReaEvidenceLedger;
  fableArchitectureEvaluation: {
    scaleVector: number;
    domainDecouplingVector: number;
    resourceIntensityVector: number;
    compositeScore: number;
    allowMonolith: boolean;
    recommendedTopology: string;
    workloadCategories: Array<{
      tier: string;
      category: string;
      stack: string;
    }>;
  };
  repoScan: {
    totalFiles: number;
    totalLines: number;
    components: RepoScanComponentAssessment[];
  };
  agenticDiscovery: {
    archetype: string;
    primaryLanguage: string;
    candidates: AgenticDiscoveryCandidate[];
  };
  repoToSkillConstitution: CodebaseConstitution;
  codeReviewFindings: CodeReviewFinding[];
}

/**
 * Cryptographic REA Evidence Ledger for kyegomez/OpenMythos
 * Verified against local clone at commit 155430a88d2a98322fc4c79b2a067792c3c9579a.
 */
export const OPEN_MYTHOS_REA_EVIDENCE_LEDGER: MythosReaEvidenceLedger = {
  sourceRepo: 'https://github.com/kyegomez/OpenMythos',
  commitSha: '155430a88d2a98322fc4c79b2a067792c3c9579a',
  gitTreeSha: 'e360623b4d887000dc11230efe6fd4e9b26ff8b6',
  studiedAt: '2026-10-10T13:22:00Z',
  cleanRoomAdaptation: true,
  verifiedArtifacts: [
    {
      path: 'open_mythos/main.py',
      gitBlobSha1: '65b0fa829f5371d633d2c397bde5175aa73851b4',
      sha256: '5c03daebcc0bafaf8cdb10d74ec1e31d999392affbc8ca067fc76e99a5d012c9',
      bytes: 43881,
      lines: 1085,
      role: 'Core Recurrent-Depth Transformer (Prelude -> RecurrentBlock -> Coda, MLA, MoEFFN, LTIInjection, ACTHalting, LoRAAdapter, KVCache)',
      verifiedSymbols: [
        'RMSNorm',
        'KVCache',
        'MLAttention',
        'SwiGLUFFN',
        'MoEFFN',
        'loop_index_embedding',
        'LoRAAdapter',
        'TransformerLayer',
        'LTIInjection',
        'ACTHalting',
        'RecurrentBlock',
        'OpenMythos',
      ],
      lineRanges: {
        KVCache: 'L151-L214',
        MLAttention: 'L284-L419',
        SwiGLUFFN: 'L426-L449',
        MoEFFN: 'L456-L534',
        loop_index_embedding: 'L541-L570',
        LoRAAdapter: 'L578-L620',
        TransformerLayer: 'L627-L677',
        LTIInjection: 'L684-L743',
        ACTHalting: 'L750-L780',
        RecurrentBlock: 'L787-L891',
        OpenMythos: 'L898-L1085',
      },
    },
    {
      path: 'open_mythos/moda.py',
      gitBlobSha1: '94f6af593f86410dd20c81510428f5055bd97931',
      sha256: '335c76d353550cbd3bc409ecfae92141b1ab70265429e0f8e33ccdcb5cd06492',
      bytes: 42070,
      lines: 1063,
      role: 'Mixture-of-Depths Attention (MoDA) + DeepSeek-V3 Aux-Loss-Free Gate & Shared+Routed MoE',
      verifiedSymbols: [
        'DeepSeekExpert',
        'DeepSeekGate',
        'DeepSeekMoE',
        'MoDAAttention',
        'MoDATransformerLayer',
        'MoDARecurrentBlock',
        'OpenMythosMoDA',
      ],
      lineRanges: {
        DeepSeekExpert: 'L271-L299',
        DeepSeekGate: 'L306-L526',
        DeepSeekMoE: 'L533-L664',
        MoDAAttention: 'L671-L815',
        MoDATransformerLayer: 'L822-L876',
        MoDARecurrentBlock: 'L883-L995',
        OpenMythosMoDA: 'L1002-L1063',
      },
    },
    {
      path: 'open_mythos/variants.py',
      gitBlobSha1: '83f7dd4f9156b3703233076b09380122bb4d63f1',
      sha256: '2fbd61a142bf8dfe8e93fed8b65d3ac027fc0e243a0bf0e70b99fe565553fc49',
      bytes: 5393,
      lines: 198,
      role: 'Pre-configured scale presets from 1B to 1T parameters',
      verifiedSymbols: [
        'mythos_1b',
        'mythos_3b',
        'mythos_10b',
        'mythos_50b',
        'mythos_100b',
        'mythos_500b',
        'mythos_1t',
      ],
      lineRanges: {
        mythos_1b: 'L18-L41',
        mythos_3b: 'L44-L66',
        mythos_10b: 'L69-L91',
        mythos_50b: 'L94-L116',
        mythos_100b: 'L119-L141',
        mythos_500b: 'L144-L166',
        mythos_1t: 'L169-L198',
      },
    },
    {
      path: 'open_mythos/tokenizer.py',
      gitBlobSha1: 'fadb3a5fe9b2f3b18d3eddcbaf5fa85114f1581c',
      sha256: 'd00ec3a07bf4862f949960d6360bcf11983799e083daa916bb7f8a20b310c86a',
      bytes: 1808,
      lines: 64,
      role: 'HuggingFace Qwen/Qwen2.5-7B-Instruct AutoTokenizer wrapper',
      verifiedSymbols: ['MythosTokenizer'],
      lineRanges: {
        MythosTokenizer: 'L6-L64',
      },
    },
    {
      path: 'docs/open_mythos.md',
      gitBlobSha1: '01c75c05879c91586598dff3037172b63e25f455',
      sha256: 'a6c3e7b9be8117ad21f704671dfd1adf5b066b354e4fcc92ab36ceca23c109df',
      bytes: 20418,
      lines: 471,
      role: 'Architectural Reconstruction Thesis: Recurrent-Depth, LTI Injection, ACT Halting, MLA, MoDA, DeepSeekMoE',
      verifiedSymbols: ['OpenMythos Architecture Specification'],
      lineRanges: {
        CorePremise: 'L1-L78',
        RecurrentDepthArchitecture: 'L80-L185',
        LTIInjectionAndACT: 'L187-L315',
        MoEAndMLAAndMoDA: 'L317-L471',
      },
    },
    {
      path: 'training/3b_fine_web_edu.py',
      gitBlobSha1: 'e980302c2079ef779d81459f2551ee79156f1294',
      sha256: '88bfe4c3c71812dd8f73edc87c157be734529b93e8da240d42cada84ee9a0e70',
      bytes: 21006,
      lines: 551,
      role: 'Distributed PyTorch DDP/FSDP training script on HuggingFaceFW/fineweb-edu',
      verifiedSymbols: ['TrainConfig', 'FineWebEduStream', 'train'],
      lineRanges: {
        TrainConfig: 'L52-L108',
        FineWebEduStream: 'L128-L185',
        train: 'L255-L551',
      },
    },
    {
      path: 'tests/test_main.py',
      gitBlobSha1: 'c54c46267651a4e03e9cbc99c6dc75712c0f88a3',
      sha256: '62a122ddcb596326d20aafe3abe8a8df3021cb17a063fbd9664390cee06348b6',
      bytes: 24650,
      lines: 678,
      role: 'Unit & gradient flow verification suite for OpenMythos components',
      verifiedSymbols: [
        'TestRMSNorm',
        'TestRotaryEmbedding',
        'TestMLAttention',
        'TestSwiGLUFFN',
        'TestMoEFFN',
        'TestLoRAAdapter',
        'TestLTIInjection',
        'TestACTHalting',
        'TestRecurrentBlock',
        'TestOpenMythos',
      ],
      lineRanges: {
        TestLTIInjection: 'L278-L326',
        TestACTHalting: 'L333-L372',
        TestRecurrentBlock: 'L379-L448',
        TestOpenMythos: 'L455-L678',
      },
    },
  ],
  limitations: [
    'OpenMythos is an open-source speculative mechanistic reconstruction of Claude Mythos based on published academic literature (Huginn, Parcae, DeepSeek-V2/V3, MoDA, Graves ACT); it is not leaked proprietary source code.',
    'In open_mythos/main.py, MoEFFN uses a Python loop over active expert IDs (unique(top_idx)) rather than a fused Triton grouped-GEMM kernel, making Python-level MoE dispatch memory-bandwidth bound at high expert counts.',
    'In open_mythos/main.py, RecurrentBlock disables early ACT exit when kv_cache is active so that every recurrent_loop_{t} cache slot is populated for future tokens.',
  ],
  unknowns: [
    'Exact proprietary hyperparameter schedule (prelude/recurrent/coda ratios and ponder regularization coefficient tau) used in commercial frontier checkpoints.',
    'Exact hardware-level custom kernel fusion for simultaneous MLA latent decompression and MoDA depth-KV softmax.',
  ],
};

/**
 * Canonical OpenMythos Scale Variants (verified from open_mythos/variants.py L18-L198).
 */
export const MYTHOS_ARCHITECTURE_VARIANTS: Record<MythosVariantId, MythosVariantSpec> = {
  mythos_1b: {
    id: 'mythos_1b',
    targetTotalParams: '~1B',
    estimatedActiveParamsPerLoop: '~250M',
    dim: 1536,
    nHeads: 16,
    headDim: 96,
    kvLoraRank: 384,
    qLoraRank: 768,
    qkRopeHeadDim: 48,
    nPrelude: 2,
    nRecurrent: 3,
    nCoda: 2,
    nLoops: 8,
    maxLoopIters: 32,
    loraRank: 16,
    actThreshold: 0.99,
    nRoutedExperts: 16,
    nSharedExperts: 1,
    numExpertsPerTok: 2,
    moeIntermediateSize: 768,
    sharedIntermediateSize: 3072,
    maxSeqLen: 4096,
    vocabSize: 151936,
    attentionType: 'mla',
  },
  mythos_3b: {
    id: 'mythos_3b',
    targetTotalParams: '~3B',
    estimatedActiveParamsPerLoop: '~700M',
    dim: 2048,
    nHeads: 32,
    headDim: 64,
    kvLoraRank: 512,
    qLoraRank: 1536,
    qkRopeHeadDim: 32,
    nPrelude: 2,
    nRecurrent: 4,
    nCoda: 2,
    nLoops: 8,
    maxLoopIters: 32,
    loraRank: 16,
    actThreshold: 0.99,
    nRoutedExperts: 32,
    nSharedExperts: 2,
    numExpertsPerTok: 4,
    moeIntermediateSize: 1024,
    sharedIntermediateSize: 4096,
    maxSeqLen: 8192,
    vocabSize: 151936,
    attentionType: 'mla',
  },
  mythos_10b: {
    id: 'mythos_10b',
    targetTotalParams: '~10B',
    estimatedActiveParamsPerLoop: '~2B',
    dim: 3072,
    nHeads: 32,
    headDim: 96,
    kvLoraRank: 512,
    qLoraRank: 1536,
    qkRopeHeadDim: 48,
    nPrelude: 3,
    nRecurrent: 6,
    nCoda: 3,
    nLoops: 12,
    maxLoopIters: 48,
    loraRank: 32,
    actThreshold: 0.99,
    nRoutedExperts: 64,
    nSharedExperts: 2,
    numExpertsPerTok: 6,
    moeIntermediateSize: 1536,
    sharedIntermediateSize: 6144,
    maxSeqLen: 16384,
    vocabSize: 151936,
    attentionType: 'mla',
  },
  mythos_50b: {
    id: 'mythos_50b',
    targetTotalParams: '~50B',
    estimatedActiveParamsPerLoop: '~8B',
    dim: 4096,
    nHeads: 64,
    headDim: 64,
    kvLoraRank: 512,
    qLoraRank: 2048,
    qkRopeHeadDim: 32,
    nPrelude: 4,
    nRecurrent: 8,
    nCoda: 4,
    nLoops: 16,
    maxLoopIters: 64,
    loraRank: 32,
    actThreshold: 0.99,
    nRoutedExperts: 128,
    nSharedExperts: 2,
    numExpertsPerTok: 8,
    moeIntermediateSize: 2048,
    sharedIntermediateSize: 8192,
    maxSeqLen: 32768,
    vocabSize: 151936,
    attentionType: 'mla',
  },
  mythos_100b: {
    id: 'mythos_100b',
    targetTotalParams: '~100B',
    estimatedActiveParamsPerLoop: '~14B',
    dim: 5120,
    nHeads: 64,
    headDim: 80,
    kvLoraRank: 512,
    qLoraRank: 2560,
    qkRopeHeadDim: 40,
    nPrelude: 4,
    nRecurrent: 10,
    nCoda: 4,
    nLoops: 16,
    maxLoopIters: 64,
    loraRank: 64,
    actThreshold: 0.99,
    nRoutedExperts: 160,
    nSharedExperts: 2,
    numExpertsPerTok: 8,
    moeIntermediateSize: 2560,
    sharedIntermediateSize: 10240,
    maxSeqLen: 65536,
    vocabSize: 151936,
    attentionType: 'mla',
  },
  mythos_500b: {
    id: 'mythos_500b',
    targetTotalParams: '~500B',
    estimatedActiveParamsPerLoop: '~37B',
    dim: 7168,
    nHeads: 128,
    headDim: 56,
    kvLoraRank: 512,
    qLoraRank: 3584,
    qkRopeHeadDim: 28,
    nPrelude: 6,
    nRecurrent: 12,
    nCoda: 6,
    nLoops: 24,
    maxLoopIters: 96,
    loraRank: 64,
    actThreshold: 0.99,
    nRoutedExperts: 256,
    nSharedExperts: 2,
    numExpertsPerTok: 8,
    moeIntermediateSize: 3584,
    sharedIntermediateSize: 14336,
    maxSeqLen: 131072,
    vocabSize: 151936,
    attentionType: 'mla',
  },
  mythos_1t: {
    id: 'mythos_1t',
    targetTotalParams: '~1T',
    estimatedActiveParamsPerLoop: '~65B',
    dim: 8192,
    nHeads: 128,
    headDim: 64,
    kvLoraRank: 1024,
    qLoraRank: 4096,
    qkRopeHeadDim: 32,
    nPrelude: 6,
    nRecurrent: 16,
    nCoda: 6,
    nLoops: 32,
    maxLoopIters: 128,
    loraRank: 128,
    actThreshold: 0.99,
    nRoutedExperts: 384,
    nSharedExperts: 4,
    numExpertsPerTok: 8,
    moeIntermediateSize: 4096,
    sharedIntermediateSize: 16384,
    maxSeqLen: 131072,
    vocabSize: 151936,
    attentionType: 'mla',
  },
};
