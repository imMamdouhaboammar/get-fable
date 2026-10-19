/**
 * Types and Contracts for Harness² Recursive Agent Harnessing Engine in get-fable.
 *
 * Clean-Room TypeScript Architecture inspired by Google Research Harness²:
 *   https://github.com/google-research/harness2 (commit: 1cfe254e8d25b15f37048c3730134686abe60335)
 */

export type HarnessSubstrateKind = 'opencode' | 'codex' | 'fable';

export type HarnessComponentKind =
  | 'c1_systemprompt'
  | 'c2_guardrails'
  | 'c3_memory'
  | 'c4_tool_guidance'
  | 'c5_skills'
  | 'c6_subagents'
  | 'c7_scripts'
  | 'c8_plugins';

export interface SurfaceSpec {
  name: HarnessSubstrateKind;
  alwaysOn: string[];
  alwaysOnMax: number;
  alwaysOnCapReason: string;
  skillDir: string;
  skillNameRule: 'must_match' | 'overrides_dir';
  triggerHint: string;
  autotriggerFile: string;
  triggerLine: string;
  subagentRequiresMode: boolean;
  pluginDir: string | null;
  hooksFile: string | null;
  hookEvents: string[];
}

export type HarnessTree = Record<string, string>;

export interface HarnessEditProposal {
  id: string;
  kind: 'invariant' | 'domain_specific';
  description: string;
  targetComponent: HarnessComponentKind;
  edits: Record<string, string>;
  deletedPaths?: string[];
  confidence: number;
}

export interface CandidateProbe {
  probeId: string;
  proposalId: string;
  harnessTree: HarnessTree;
  status: 'pending' | 'success' | 'failure';
  executionTrace?: string;
  performanceScore?: number;
  contrasts: string[];
  executionTimeMs?: number;
}

export interface CompositionResult {
  composedTree: HarnessTree;
  adoptedComponents: string[];
  rejectedProposals: string[];
  rationale: string;
  contrastScore: number;
  diffSummary: Record<string, 'added' | 'modified' | 'deleted' | 'retained'>;
}

export type RecursionMode = 'parallel' | 'sequential';

export interface TaskLevelRecursionConfig {
  k: number;
  mode: RecursionMode;
  substrate: HarnessSubstrateKind;
  dryRun?: boolean;
  domain?: string;
}

export interface TaskLevelRecursionResult {
  config: TaskLevelRecursionConfig;
  initialHarness: HarnessTree;
  refinedHarness: HarnessTree;
  proposals: HarnessEditProposal[];
  probes: CandidateProbe[];
  composition: CompositionResult;
  stepCount: number;
  gainEstimate: number;
}

export interface HarnessingLevelReflection {
  taskId: string;
  timestamp: string;
  domain: string;
  adoptedModifications: string[];
  reflectionNotes: string[];
  persistentImprovementDelta: Record<string, string>;
}

export interface HarnessReaArtifact {
  path: string;
  gitBlobSha1: string;
  sha256: string;
  bytes: number;
  lines: number;
  role: string;
  verifiedSymbols: string[];
}

export interface HarnessReaEvidenceLedger {
  sourceRepo: string;
  commitSha: string;
  gitTreeSha: string;
  studiedAt: string;
  cleanRoomAdaptation: boolean;
  upstreamPaper: {
    title: string;
    authors: string[];
    arxiv: string;
    year: number;
  };
  verifiedArtifacts: HarnessReaArtifact[];
}

/**
 * Authoritative REA Cryptographic Evidence Ledger for google-research/harness2
 */
export const HARNESS2_REA_EVIDENCE_LEDGER: HarnessReaEvidenceLedger = {
  sourceRepo: 'https://github.com/google-research/harness2',
  commitSha: '1cfe254e8d25b15f37048c3730134686abe60335',
  gitTreeSha: 'edc756a4d03a2826a248115482084a176e60e751',
  studiedAt: '2026-10-18T22:06:00Z',
  cleanRoomAdaptation: true,
  upstreamPaper: {
    title: 'Harness²: Recursive Agent Harnessing for an Open World',
    authors: [
      'Ruiyao Xu',
      'Yanfei Chen',
      'Zhongying CuiZhu',
      'Bhavana Dalvi Mishra',
      'Yifei Ming',
      'Han Yu',
      'Rujun Han',
      'Chen-Yu Lee',
      'Tomas Pfister',
    ],
    arxiv: 'arXiv:2610.14224',
    year: 2026,
  },
  verifiedArtifacts: [
    {
      path: 'harness2/core/recursion.py',
      gitBlobSha1: 'dda6b98cd5af100b8941f33cbb079462299c5280',
      sha256: 'b299813b5334f2c0f89024a7f14162f0fdd5418ebd4413be93920b5334a204c1',
      bytes: 20436,
      lines: 578,
      role: 'Two-Level Recursion Coordinator (Task-Level Propose-Probe-Compose and Harnessing-Level Experience Reflector)',
      verifiedSymbols: [
        'ProposeProbeCompose',
        'run_parallel_step',
        'run_sequential_step',
        'ExperienceReflector',
        'update_improvement_harness',
      ],
    },
    {
      path: 'harness2/core/proposer.py',
      gitBlobSha1: '4a235075cae72059fa701001f31bf4505cbbc3ba',
      sha256: '475ef49d72228e249d7172d793f8362913774412402dfd259ae6e01c6586e175',
      bytes: 18942,
      lines: 534,
      role: 'Harness Editor & Contrastive Proposer (General Invariant Edits & Domain-Specific Probes)',
      verifiedSymbols: [
        'Proposer',
        'propose_edits',
        'compose_candidates',
        'validate_proposal',
        'render_contrast_prompt',
      ],
    },
    {
      path: 'harness2/core/tree.py',
      gitBlobSha1: 'c9bf1341226aac448f6ec82038cb6d3896799412',
      sha256: 'c2a15690b1b6b02156e922c5e0b1a215c5065d7bea5a3bae2e56b47309197552',
      bytes: 16265,
      lines: 427,
      role: 'Component Tree Manager (c1..c8 SurfaceSpec: read, validate, write, diff, cap-check)',
      verifiedSymbols: [
        'SurfaceSpec',
        'Tree',
        'read_tree',
        'write_tree',
        'diff_trees',
        'is_allowed',
        'normalize_rel',
      ],
    },
    {
      path: 'harness2/core/spec.py',
      gitBlobSha1: 'e58d14852490b2d4ae3aa6da1c1c796e3e961b48',
      sha256: 'f245ec9e314778e2a1a51594b906584255b9eed8340c073b864a8a6f2c8dc400',
      bytes: 9720,
      lines: 277,
      role: 'Benchmark and Channel Seam (ChannelSpec, BenchSpec, TaskSpec separation)',
      verifiedSymbols: [
        'ChannelSpec',
        'BenchSpec',
        'TaskSpec',
        'resolve_channel_model',
      ],
    },
    {
      path: 'harness2/core/judge.py',
      gitBlobSha1: 'cf4e7b9fe2b603421fce6519808deb81bc3ec9c0',
      sha256: '0f8cd6f4ec659f5d5976bdad4ccdc432651f51486c3fbbee36be53a6d619fbba',
      bytes: 5410,
      lines: 155,
      role: 'Adversarial & Contrastive Judge Evaluation Seam',
      verifiedSymbols: [
        'JudgeAdapter',
        'evaluate_deliverable',
        'score_contrast',
      ],
    },
    {
      path: 'harness2/core/ledger.py',
      gitBlobSha1: '319a6697758d05294dab9f42e8f8700759d7e6f6',
      sha256: '7059de5d90fc9fb8d4b3b799ff075f09d34f182ba0fdb56eb9d8b8383d0bbf55',
      bytes: 4620,
      lines: 132,
      role: 'Execution and Trial Ledger Tracking Rollout Evidence and Runmarks',
      verifiedSymbols: [
        'TrialLedger',
        'record_trial',
        'read_trials',
      ],
    },
    {
      path: 'harness2/substrate/opencode.py',
      gitBlobSha1: 'ad0a2ea4d59bda362838c76912e43b6f7c333254',
      sha256: 'dabc79953d164a0d38802125756379ffa6acdc7b553d2f9036475f8220166ff0',
      bytes: 15411,
      lines: 395,
      role: 'OpenCode Agent Substrate Adapter and Trajectory Renderer',
      verifiedSymbols: [
        'OpencodeSubstrate',
        'OPENCODE_SURFACE',
      ],
    },
    {
      path: 'harness2/substrate/codex.py',
      gitBlobSha1: 'fd34eacdf4a7b6991ba75e6ed34df5dd87f4e5e0',
      sha256: '281a07271ebed72a617a671ced1b9137901aa8f5d1deffb56c706f44c295e416',
      bytes: 18082,
      lines: 480,
      role: 'Codex Agent Substrate Adapter, Surface Spec and Execution Runner',
      verifiedSymbols: [
        'CodexSubstrate',
        'CODEX_SURFACE',
      ],
    },
  ],
};
