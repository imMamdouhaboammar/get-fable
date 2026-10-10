import {
  MYTHOS_ARCHITECTURE_VARIANTS,
  type LatentContextSummary,
  type MlaCompressionReport,
  type ModaAttentionResult,
  type ModaDepthLayerEntry,
  type MoeExpertSpec,
  type MoeRouteDecision,
  type MoeRoutedExpertSelection,
  type MythosVariantId,
} from './types.js';
import { cosineSimilarity, encodeTaskToLatent, rmsNorm, vectorNorm } from './lti-act-loop.js';

export type MythosCognitiveParadigm = 'Depth' | 'Breadth' | 'Coil' | 'Mesh';

export interface FableMythosExpertEntry extends MoeExpertSpec {
  skillId: string;
  paradigms: MythosCognitiveParadigm[];
  domainKeywords: string[];
  attentionHeadWeight: number;
  capacityFactor: number;
}

function defineExpert(spec: {
  skillId: string;
  pack: string;
  phase: string;
  shared: boolean;
  groupIndex: number;
  paradigms: MythosCognitiveParadigm[];
  domainKeywords: string[];
  attentionHeadWeight: number;
  capacityFactor: number;
  latentSeed: string;
}): FableMythosExpertEntry {
  return {
    id: spec.skillId,
    skillId: spec.skillId,
    pack: spec.pack,
    phase: spec.phase,
    shared: spec.shared,
    groupIndex: spec.groupIndex,
    paradigms: spec.paradigms,
    keywords: spec.domainKeywords,
    domainKeywords: spec.domainKeywords,
    attentionHeadWeight: spec.attentionHeadWeight,
    capacityFactor: spec.capacityFactor,
    domainVector: encodeTaskToLatent(spec.latentSeed, 16),
  };
}

export const FABLE_MYTHOS_EXPERT_CATALOG: readonly FableMythosExpertEntry[] = [
  // Shared Experts (Always fire for every task — universal invariants)
  defineExpert({
    skillId: 'get-fable',
    pack: 'core',
    phase: 'idle',
    shared: true,
    groupIndex: 0,
    paradigms: ['Depth', 'Breadth', 'Coil', 'Mesh'],
    domainKeywords: ['orchestrate', 'route', 'lifecycle', 'harness', 'state'],
    attentionHeadWeight: 1.0,
    capacityFactor: 1.5,
    latentSeed: 'get-fable lifecycle orchestration harness state',
  }),
  defineExpert({
    skillId: 'fable-scope-discipline',
    pack: 'build',
    phase: 'executing',
    shared: true,
    groupIndex: 0,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['scope', 'atomic', 'bounded', 'drift'],
    attentionHeadWeight: 0.95,
    capacityFactor: 1.25,
    latentSeed: 'fable-scope-discipline atomic bounded diff',
  }),
  defineExpert({
    skillId: 'fable-prove-it',
    pack: 'proof',
    phase: 'verifying',
    shared: true,
    groupIndex: 0,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['prove', 'evidence', 'verification', 'fresh'],
    attentionHeadWeight: 0.98,
    capacityFactor: 1.3,
    latentSeed: 'fable-prove-it machine checked fresh evidence',
  }),

  // Routed Experts — Group 0: Discovery, Architecture, Context & Planning
  defineExpert({
    skillId: 'fable-discover',
    pack: 'core',
    phase: 'discovering',
    shared: false,
    groupIndex: 0,
    paradigms: ['Breadth', 'Depth'],
    domainKeywords: ['discover', 'trace', 'explore', 'repo', 'scan', 'unknown', 'codebase'],
    attentionHeadWeight: 0.92,
    capacityFactor: 1.2,
    latentSeed: 'discover trace explore repository scan codebase unknowns',
  }),
  defineExpert({
    skillId: 'fable-architecture',
    pack: 'system',
    phase: 'planned',
    shared: false,
    groupIndex: 0,
    paradigms: ['Depth', 'Breadth', 'Mesh'],
    domainKeywords: ['architecture', 'microservice', 'scale', 'grpc', 'topology', 'mythos', 'design'],
    attentionHeadWeight: 0.96,
    capacityFactor: 1.35,
    latentSeed: 'architecture microservice scale grpc topology mythos design',
  }),
  defineExpert({
    skillId: 'fable-research',
    pack: 'intelligence',
    phase: 'discovering',
    shared: false,
    groupIndex: 0,
    paradigms: ['Breadth', 'Depth'],
    domainKeywords: ['research', 'paper', 'arxiv', 'primary', 'external', 'study', 'rea'],
    attentionHeadWeight: 0.9,
    capacityFactor: 1.2,
    latentSeed: 'research paper external facts study rea reverse engineer',
  }),
  defineExpert({
    skillId: 'fable-plan',
    pack: 'core',
    phase: 'planned',
    shared: false,
    groupIndex: 0,
    paradigms: ['Depth', 'Breadth'],
    domainKeywords: ['plan', 'card', 'roadmap', 'decompose', 'specification', 'milestone'],
    attentionHeadWeight: 0.94,
    capacityFactor: 1.25,
    latentSeed: 'plan work cards decomposition specification milestone',
  }),
  defineExpert({
    skillId: 'fable-memory',
    pack: 'system',
    phase: 'discovering',
    shared: false,
    groupIndex: 0,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['memory.md', 'remember', 'user preference', 'recall fact', 'persistent memory'],
    attentionHeadWeight: 0.84,
    capacityFactor: 1.0,
    latentSeed: 'fable-memory persistent memory.md user preference recall index',
  }),
  defineExpert({
    skillId: 'fable-context-thrift',
    pack: 'system',
    phase: 'discovering',
    shared: false,
    groupIndex: 0,
    paradigms: ['Depth', 'Breadth'],
    domainKeywords: ['context thrift', 'token budget', 'conserve context', 'batch lookups', 'targeted read'],
    attentionHeadWeight: 0.88,
    capacityFactor: 1.15,
    latentSeed: 'fable-context-thrift conserve token budget batch lookups targeted read',
  }),
  defineExpert({
    skillId: 'fable-domain',
    pack: 'creator',
    phase: 'discovering',
    shared: false,
    groupIndex: 0,
    paradigms: ['Breadth', 'Mesh'],
    domainKeywords: ['fable-domain', 'domain adapter', 'sector workflow', 'trap fixture', 'domain nouns'],
    attentionHeadWeight: 0.86,
    capacityFactor: 1.1,
    latentSeed: 'fable-domain sector workflow domain adapter trap fixture',
  }),
  defineExpert({
    skillId: 'fable-config',
    pack: 'system',
    phase: 'planned',
    shared: false,
    groupIndex: 0,
    paradigms: ['Depth'],
    domainKeywords: ['settings.json', 'keybindings', 'allowlist', 'configure hooks', 'hooks.json'],
    attentionHeadWeight: 0.85,
    capacityFactor: 1.0,
    latentSeed: 'fable-config settings.json permissions allowlist keybindings hooks',
  }),
  defineExpert({
    skillId: 'fable-eco',
    pack: 'system',
    phase: 'planned',
    shared: false,
    groupIndex: 0,
    paradigms: ['Breadth', 'Mesh'],
    domainKeywords: ['fable-eco', 'curated capabilities', 'provision capabilities', 'reproducible locks', 'install-plan'],
    attentionHeadWeight: 0.89,
    capacityFactor: 1.2,
    latentSeed: 'fable-eco capability provisioning reproducible locks execution contract',
  }),
  defineExpert({
    skillId: 'fable-council',
    pack: 'system',
    phase: 'planned',
    shared: false,
    groupIndex: 0,
    paradigms: ['Breadth', 'Mesh'],
    domainKeywords: ['fable-council', 'convene council', 'deliberate with agents', 'second opinion', 'peer feedback'],
    attentionHeadWeight: 0.91,
    capacityFactor: 1.25,
    latentSeed: 'fable-council multi-agent deliberation council second opinion',
  }),
  defineExpert({
    skillId: 'fable-wise',
    pack: 'system',
    phase: 'planned',
    shared: false,
    groupIndex: 0,
    paradigms: ['Depth', 'Breadth', 'Coil', 'Mesh'],
    domainKeywords: ['fable-wise', 'paperthin', 're0', 'ssotize', 'autobahn', 'feynman check', 'strip slop'],
    attentionHeadWeight: 0.95,
    capacityFactor: 1.3,
    latentSeed: 'fable-wise paperthin re0 ssotize autobahn feynman check strip slop',
  }),
  defineExpert({
    skillId: 'fable-spark',
    pack: 'system',
    phase: 'idle',
    shared: false,
    groupIndex: 0,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['fable-spark', 'predict next move', 'situational awareness', 'smallest action', 'minimal action'],
    attentionHeadWeight: 0.87,
    capacityFactor: 1.05,
    latentSeed: 'fable-spark predict smallest atomic next move situational awareness',
  }),

  // Routed Experts — Group 1: Build & Implementation
  defineExpert({
    skillId: 'fable-execute',
    pack: 'core',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['implement', 'build', 'upgrade', 'feature', 'engine', 'code', 'write'],
    attentionHeadWeight: 0.95,
    capacityFactor: 1.35,
    latentSeed: 'implement build upgrade feature engine code write',
  }),
  defineExpert({
    skillId: 'fable-tdd',
    pack: 'build',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['test', 'tdd', 'regression', 'bug', 'fix', 'falsify', 'unit'],
    attentionHeadWeight: 0.96,
    capacityFactor: 1.35,
    latentSeed: 'test tdd regression bug fix falsify unit assertion',
  }),
  defineExpert({
    skillId: 'fable-delegate',
    pack: 'build',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Breadth', 'Mesh'],
    domainKeywords: ['delegate', 'parallel', 'subagent', 'worker', 'disjoint', 'swarm'],
    attentionHeadWeight: 0.94,
    capacityFactor: 1.4,
    latentSeed: 'delegate parallel subagent worker disjoint swarm',
  }),
  defineExpert({
    skillId: 'fable-skill-creator',
    pack: 'creator',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Depth', 'Breadth'],
    domainKeywords: ['skill', 'playbook', 'repo-to-skill', 'synthesize', 'constitution', 'author'],
    attentionHeadWeight: 0.9,
    capacityFactor: 1.2,
    latentSeed: 'skill playbook repo-to-skill synthesize constitution author',
  }),
  defineExpert({
    skillId: 'fable-heal',
    pack: 'proof',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['fable-heal', 'auto-heal', 'remediate vulnerability', 'security-fix', 'vulnerability-fix', 'auto-patch'],
    attentionHeadWeight: 0.93,
    capacityFactor: 1.25,
    latentSeed: 'fable-heal remediate vulnerability security patch attestation',
  }),
  defineExpert({
    skillId: 'fable-dataviz',
    pack: 'system',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Breadth', 'Depth'],
    domainKeywords: ['dataviz', 'svg chart', 'metric tile', 'heatmap', 'visualize data', 'kpi row'],
    attentionHeadWeight: 0.85,
    capacityFactor: 1.1,
    latentSeed: 'fable-dataviz accessible svg chart metric tile dashboard heatmap',
  }),
  defineExpert({
    skillId: 'fable-artifact',
    pack: 'system',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Breadth', 'Depth'],
    domainKeywords: ['fable-artifact', 'mermaid', 'architecture diagram', 'interactive component', 'technical proposal'],
    attentionHeadWeight: 0.86,
    capacityFactor: 1.1,
    latentSeed: 'fable-artifact mermaid architecture diagram interactive component proposal',
  }),
  defineExpert({
    skillId: 'fable-simplify',
    pack: 'system',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['simplify', 'clean up', 'dead code', 'deduplicate', 'flatten nesting'],
    attentionHeadWeight: 0.89,
    capacityFactor: 1.15,
    latentSeed: 'fable-simplify dead code deduplicate flatten nesting preserve behavior',
  }),
  defineExpert({
    skillId: 'fable-loop',
    pack: 'system',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Coil'],
    domainKeywords: ['fable-loop', 'recurring loop', 'babysit ci', 'poll status', 'interval monitor'],
    attentionHeadWeight: 0.87,
    capacityFactor: 1.15,
    latentSeed: 'fable-loop bounded polling loop babysit ci interval backoff',
  }),
  defineExpert({
    skillId: 'fable-cowork',
    pack: 'system',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Coil', 'Mesh'],
    domainKeywords: ['cowork', 'autonomous execution', 'background mode', 'clean tools', 'silent tool chain'],
    attentionHeadWeight: 0.9,
    capacityFactor: 1.25,
    latentSeed: 'fable-cowork autonomous multi-step cowork session clean tool chain',
  }),
  defineExpert({
    skillId: 'fable-finish-your-turn',
    pack: 'delivery',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Coil', 'Depth'],
    domainKeywords: ['finish your turn', 'complete turn', 'do not stop', 'finish what you started', 'upward delegation'],
    attentionHeadWeight: 0.92,
    capacityFactor: 1.2,
    latentSeed: 'fable-finish-your-turn complete turn prevent premature stop upward delegation',
  }),
  defineExpert({
    skillId: 'fable-native-code',
    pack: 'build',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Depth'],
    domainKeywords: ['native code', 'match idiom', 'strip comments', 'no defensive bloat', 'clean diff'],
    attentionHeadWeight: 0.93,
    capacityFactor: 1.25,
    latentSeed: 'fable-native-code match codebase idiom strip defensive bloat',
  }),
  defineExpert({
    skillId: 'fable-method',
    pack: 'core',
    phase: 'executing',
    shared: false,
    groupIndex: 1,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['fable-method', 'fable method', 'think act prove', 'define done', 'classify the ask'],
    attentionHeadWeight: 0.94,
    capacityFactor: 1.25,
    latentSeed: 'fable-method think act prove classify ask define done',
  }),

  // Routed Experts — Group 2: Security, Proof & Review
  defineExpert({
    skillId: 'fable-review',
    pack: 'proof',
    phase: 'verifying',
    shared: false,
    groupIndex: 2,
    paradigms: ['Depth', 'Breadth'],
    domainKeywords: ['review', 'code-review', 'diff', 'audit', 'quality', 'inspect'],
    attentionHeadWeight: 0.94,
    capacityFactor: 1.25,
    latentSeed: 'review code-review diff audit quality inspect standards',
  }),
  defineExpert({
    skillId: 'fable-security',
    pack: 'proof',
    phase: 'verifying',
    shared: false,
    groupIndex: 2,
    paradigms: ['Depth', 'Mesh'],
    domainKeywords: ['security', 'trust', 'auth', 'injection', 'cve', 'crypto', 'boundary'],
    attentionHeadWeight: 0.97,
    capacityFactor: 1.35,
    latentSeed: 'security trust boundary auth injection crypto vulnerability',
  }),
  defineExpert({
    skillId: 'fable-redteam',
    pack: 'proof',
    phase: 'verifying',
    shared: false,
    groupIndex: 2,
    paradigms: ['Breadth', 'Depth', 'Mesh'],
    domainKeywords: ['redteam', 'pentest', 'cvss', 'sarif', 'exploit', 'probe'],
    attentionHeadWeight: 0.96,
    capacityFactor: 1.35,
    latentSeed: 'redteam pentest cvss sarif exploit probe',
  }),
  defineExpert({
    skillId: 'fable-verify',
    pack: 'core',
    phase: 'verifying',
    shared: false,
    groupIndex: 2,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['verify', 'typecheck', 'doctor', 'lint', 'gate', 'validate'],
    attentionHeadWeight: 0.95,
    capacityFactor: 1.3,
    latentSeed: 'verify typecheck doctor lint gate validate',
  }),
  defineExpert({
    skillId: 'fable-run',
    pack: 'system',
    phase: 'verifying',
    shared: false,
    groupIndex: 2,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['fable-run', 'start app', 'launch app', 'live smoke test', 'start server', 'readiness probe'],
    attentionHeadWeight: 0.89,
    capacityFactor: 1.15,
    latentSeed: 'fable-run launch live server readiness probe clean teardown',
  }),
  defineExpert({
    skillId: 'fable-simulator',
    pack: 'system',
    phase: 'verifying',
    shared: false,
    groupIndex: 2,
    paradigms: ['Depth', 'Breadth'],
    domainKeywords: ['fable-simulator', 'simulator', 'independent oracle', 'derive contract', 'headless browser', 'causal evidence'],
    attentionHeadWeight: 0.91,
    capacityFactor: 1.2,
    latentSeed: 'fable-simulator independent oracle causal verification headless browser',
  }),
  defineExpert({
    skillId: 'fable-judge',
    pack: 'proof',
    phase: 'verifying',
    shared: false,
    groupIndex: 2,
    paradigms: ['Depth', 'Mesh'],
    domainKeywords: ['fable-judge', 'judge work', 'adversarial verification', 'detect weakened tests', 'hunt frauds'],
    attentionHeadWeight: 0.95,
    capacityFactor: 1.3,
    latentSeed: 'fable-judge adversarial verification detect weakened tests hunt false claims',
  }),

  // Routed Experts — Group 3: Recovery, Evolution & Delivery
  defineExpert({
    skillId: 'fable-recover',
    pack: 'core',
    phase: 'recovering',
    shared: false,
    groupIndex: 3,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['recover', 'failure', 'streak', 'broken', 'crash', 'diagnose'],
    attentionHeadWeight: 0.97,
    capacityFactor: 1.4,
    latentSeed: 'recover failure streak broken crash diagnose',
  }),
  defineExpert({
    skillId: 'fable-learning',
    pack: 'evolution',
    phase: 'verifying',
    shared: false,
    groupIndex: 3,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['learn', 'lesson', 'compound', 'solution', 'knowledge', 'codify'],
    attentionHeadWeight: 0.9,
    capacityFactor: 1.2,
    latentSeed: 'learn lesson compound solution knowledge codify',
  }),
  defineExpert({
    skillId: 'fable-eval',
    pack: 'evolution',
    phase: 'verifying',
    shared: false,
    groupIndex: 3,
    paradigms: ['Depth', 'Breadth'],
    domainKeywords: ['eval', 'benchmark', 'score', 'baseline', 'metric', 'comparison'],
    attentionHeadWeight: 0.91,
    capacityFactor: 1.2,
    latentSeed: 'eval benchmark score baseline metric comparison',
  }),
  defineExpert({
    skillId: 'fable-release',
    pack: 'delivery',
    phase: 'verifying',
    shared: false,
    groupIndex: 3,
    paradigms: ['Depth', 'Coil'],
    domainKeywords: ['release', 'publish', 'ship', 'package', 'version', 'dist'],
    attentionHeadWeight: 0.93,
    capacityFactor: 1.2,
    latentSeed: 'release publish ship package version dist',
  }),
  defineExpert({
    skillId: 'fable-handoff',
    pack: 'delivery',
    phase: 'verifying',
    shared: false,
    groupIndex: 3,
    paradigms: ['Coil', 'Mesh'],
    domainKeywords: ['fable-handoff', 'handoff', 'continue later', 'next session', 'context transfer'],
    attentionHeadWeight: 0.89,
    capacityFactor: 1.15,
    latentSeed: 'fable-handoff cross-session continuation state next action',
  }),
  defineExpert({
    skillId: 'fable-outcome-first',
    pack: 'delivery',
    phase: 'verifying',
    shared: false,
    groupIndex: 3,
    paradigms: ['Depth'],
    domainKeywords: ['outcome-first', 'outcome first', 'direct answer', 'no sycophancy', 'first sentence answer'],
    attentionHeadWeight: 0.88,
    capacityFactor: 1.1,
    latentSeed: 'fable-outcome-first direct first sentence answer strip sycophancy',
  }),
  defineExpert({
    skillId: 'fable-tend',
    pack: 'delivery',
    phase: 'executing',
    shared: false,
    groupIndex: 3,
    paradigms: ['Coil', 'Breadth'],
    domainKeywords: ['fable-tend', 'triage ci', 'resolve conflicts', 'repository maintainer', 'nightly sweep'],
    attentionHeadWeight: 0.9,
    capacityFactor: 1.2,
    latentSeed: 'fable-tend repository maintainer ci repair conflict resolution',
  }),
];

function softmax(logits: readonly number[]): number[] {
  if (logits.length === 0) return [];
  const maxLogit = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - maxLogit));
  const sum = exps.reduce((a, b) => a + b, 0);
  if (sum <= 0) return logits.map(() => 1 / logits.length);
  return exps.map((e) => e / sum);
}

function sigmoid(x: number): number {
  return x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
}

/**
 * Computes the auxiliary expert balance loss L_ExpBal = N_r * sum_i (f_i * P_i)
 * as verified in open_mythos/main.py L500-L505 (MoEFFN).
 */
export function computeMoeBalanceLoss(
  selectionFractions: readonly number[],
  meanProbabilities: readonly number[]
): number {
  const n = Math.min(selectionFractions.length, meanProbabilities.length);
  if (n === 0) return 0;
  let dot = 0;
  for (let i = 0; i < n; i++) {
    dot += selectionFractions[i]! * meanProbabilities[i]!;
  }
  return Number((n * dot).toFixed(6));
}

/**
 * Routes a task through the OpenMythos / DeepSeek-V3 Fine-Grained MoE Router:
 * - Always activates Shared Experts (`get-fable`, `fable-scope-discipline`, `fable-prove-it`)
 * - Computes unbiased affinity scores (softmax or sigmoid) across Routed Experts
 * - Applies Aux-Loss-Free load-balancing `routerBias` to selection scores (`scores_for_choice = scores + router_bias`)
 * - Performs Group-Limited Top-K routing (`nGroups`, `topkGroups`)
 * - Gathers gating weights from the UNBIASED scores so load-balancing bias never distorts expert weights
 * - Updates `routerBias` via `bias += biasUpdateSpeed * (targetLoad - actualLoad)`
 */
export function routeMythosExperts(params: {
  task: string;
  topK?: number;
  scoringFunc?: 'softmax' | 'sigmoid';
  nGroups?: number;
  topkGroups?: number;
  routerBias?: Record<string, number>;
  historicalSelections?: Record<string, number>;
  biasUpdateSpeed?: number;
  normTopkProb?: boolean;
}): MoeRouteDecision {
  const {
    task,
    topK = 4,
    scoringFunc = 'sigmoid',
    nGroups = 4,
    topkGroups = 2,
    routerBias = {},
    historicalSelections = {},
    biasUpdateSpeed = 0.01,
    normTopkProb = true,
  } = params;

  const sharedExperts = FABLE_MYTHOS_EXPERT_CATALOG.filter((e) => e.shared).map((e) => e.id);
  const routedCatalog = FABLE_MYTHOS_EXPERT_CATALOG.filter((e) => !e.shared);
  const nRouted = routedCatalog.length;
  const safeTopK = Math.max(1, Math.min(nRouted, Math.floor(topK)));

  const taskVec = encodeTaskToLatent(task, 16);
  const lowerTask = task.toLowerCase();

  // 1. Compute raw logits for each routed expert
  const rawLogits = routedCatalog.map((expert) => {
    const cos = cosineSimilarity(taskVec, expert.domainVector);
    let keywordBoost = 0;
    for (const kw of expert.keywords) {
      if (lowerTask.includes(kw)) {
        keywordBoost += 0.65;
      }
    }
    return cos * 1.5 + keywordBoost;
  });

  // 2. Compute unbiased affinity scores (open_mythos/moda.py L403-L408)
  const unbiasedScores =
    scoringFunc === 'softmax'
      ? softmax(rawLogits)
      : rawLogits.map((logit) => sigmoid(logit));

  // 3. Add router_bias for expert selection ONLY (aux-loss-free load balancing, moda.py L414)
  const scoresForChoice = routedCatalog.map((expert, idx) => {
    const bias = routerBias[expert.id] ?? 0;
    return unbiasedScores[idx]! + bias;
  });

  // 4. Group-limited routing (open_mythos/moda.py L416-L433)
  const safeGroups = Math.max(1, Math.min(nGroups, 4));
  const safeTopkGroups = Math.max(1, Math.min(safeGroups, topkGroups));

  const groupScores = new Array<number>(safeGroups).fill(0);
  for (let g = 0; g < safeGroups; g++) {
    const members = routedCatalog
      .map((e, i) => ({ group: e.groupIndex % safeGroups, score: scoresForChoice[i]! }))
      .filter((m) => m.group === g)
      .map((m) => m.score)
      .sort((a, b) => b - a);
    // Sum of top-2 scores per group (DeepSeek-V3 group score rule)
    groupScores[g] = (members[0] ?? 0) + (members[1] ?? 0);
  }

  const selectedGroups = groupScores
    .map((score, groupIdx) => ({ groupIdx, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, safeTopkGroups)
    .map((g) => g.groupIdx);

  const selectedGroupSet = new Set(selectedGroups);

  // 5. Select top-K routed experts from allowed groups using biased scoresForChoice
  const candidates = routedCatalog.map((expert, idx) => {
    const inAllowedGroup = selectedGroupSet.has(expert.groupIndex % safeGroups);
    return {
      expert,
      idx,
      unbiasedAffinity: unbiasedScores[idx]!,
      biasedSelectionScore: inAllowedGroup ? scoresForChoice[idx]! : -1e9,
      routerBias: routerBias[expert.id] ?? 0,
    };
  });

  candidates.sort((a, b) => b.biasedSelectionScore - a.biasedSelectionScore);
  const topSelected = candidates.slice(0, safeTopK);

  // 6. Gather gating weights from UNBIASED affinity scores (moda.py L441: scores.gather)
  const rawGatingWeights = topSelected.map((c) => c.unbiasedAffinity);
  const weightSum = rawGatingWeights.reduce((acc, w) => acc + w, 0) + 1e-20;
  const normalizedWeights = normTopkProb
    ? rawGatingWeights.map((w) => w / weightSum)
    : rawGatingWeights;

  const routedExperts: MoeRoutedExpertSelection[] = topSelected.map((c, i) => ({
    expertId: c.expert.id,
    pack: c.expert.pack,
    groupIndex: c.expert.groupIndex,
    unbiasedAffinity: Number(c.unbiasedAffinity.toFixed(6)),
    biasedSelectionScore: Number(c.biasedSelectionScore.toFixed(6)),
    routerBias: Number(c.routerBias.toFixed(6)),
    normalizedGateWeight: Number(normalizedWeights[i]!.toFixed(6)),
  }));

  // 7. Compute load distribution, balance loss L_ExpBal, and updated routerBias
  const selectedIds = new Set(routedExperts.map((r) => r.expertId));
  const rawCounts = routedCatalog.map((e) => {
    const prev = historicalSelections[e.id] ?? 0;
    return prev + (selectedIds.has(e.id) ? 1 : 0);
  });
  const totalSelections = Math.max(
    1,
    rawCounts.reduce((a, b) => a + b, 0)
  );
  const selectionFractions = rawCounts.map((c) => c / totalSelections);

  const totalUnbiased = Math.max(
    1e-12,
    unbiasedScores.reduce((a, b) => a + b, 0)
  );
  const normalizedProbs = unbiasedScores.map((s) => s / totalUnbiased);

  const balanceLoss = computeMoeBalanceLoss(selectionFractions, normalizedProbs);

  const targetLoad = 1 / nRouted;
  const loadDistribution: Record<string, number> = {};
  const updatedRouterBias: Record<string, number> = {};

  routedCatalog.forEach((expert, idx) => {
    const f = selectionFractions[idx]!;
    loadDistribution[expert.id] = Number(f.toFixed(6));
    const currentBias = routerBias[expert.id] ?? 0;
    // Aux-loss-free bias update rule: increase bias for under-utilized experts, decrease for overloaded
    const nextBias = currentBias + biasUpdateSpeed * (targetLoad - f);
    updatedRouterBias[expert.id] = Number(nextBias.toFixed(6));
  });

  return {
    task,
    scoringFunc,
    sharedExperts,
    routedExperts,
    selectedGroups,
    balanceLoss,
    loadDistribution,
    updatedRouterBias,
    auxLossFreeBalanced: true,
  };
}

/**
 * Evaluates Multi-Latent Attention (MLA) KV-Cache Compression savings vs Standard MHA and GQA-8.
 *
 * Verified from open_mythos/main.py L284-L386 (MLAttention) and docs/open_mythos.md L140-L176:
 * - Standard MHA per token per layer: 2 * n_heads * head_dim
 * - GQA (8 KV heads) per token per layer: 2 * 8 * head_dim
 * - MLA compressed latent cache: kv_lora_rank + qk_rope_head_dim (shared decoupled RoPE key + c_KV)
 */
export function evaluateMlaCompression(params: {
  variantId?: MythosVariantId;
  seqLen?: number;
  batchSize?: number;
  bytesPerElement?: number;
}): MlaCompressionReport {
  const variantId = params.variantId ?? 'mythos_3b';
  const spec = MYTHOS_ARCHITECTURE_VARIANTS[variantId];
  if (!spec) {
    throw new Error(`Unknown Mythos variant: ${variantId}`);
  }

  const seqLen = Math.max(1, Math.floor(params.seqLen ?? spec.maxSeqLen));
  const batchSize = Math.max(1, Math.floor(params.batchSize ?? 1));
  const bytesPerElement = params.bytesPerElement ?? 2; // bf16 = 2 bytes

  // Effective depth layers caching KV: prelude + (recurrent * nLoops) + coda
  const effectiveDepthLayers = spec.nPrelude + spec.nRecurrent * spec.nLoops + spec.nCoda;

  const standardMhaKvElementsPerTokenPerLayer = 2 * spec.nHeads * spec.headDim;
  const gqaKvHeads = Math.max(4, Math.floor(spec.nHeads / 4));
  const gqa8HeadsKvElementsPerTokenPerLayer = 2 * gqaKvHeads * spec.headDim;
  // MLA stores c_KV (kv_lora_rank) + decoupled RoPE key (qk_rope_head_dim)
  const mlaLatentElementsPerTokenPerLayer = spec.kvLoraRank + spec.qkRopeHeadDim;

  const tokensTotal = batchSize * seqLen * effectiveDepthLayers;
  const standardMhaBytesTotal =
    tokensTotal * standardMhaKvElementsPerTokenPerLayer * bytesPerElement;
  const gqa8HeadsBytesTotal =
    tokensTotal * gqa8HeadsKvElementsPerTokenPerLayer * bytesPerElement;
  const mlaBytesTotal = tokensTotal * mlaLatentElementsPerTokenPerLayer * bytesPerElement;

  const compressionRatioVsMha = Number(
    (standardMhaBytesTotal / Math.max(1, mlaBytesTotal)).toFixed(2)
  );
  const compressionRatioVsGqa8 = Number(
    (gqa8HeadsBytesTotal / Math.max(1, mlaBytesTotal)).toFixed(2)
  );

  const memorySavedPercentVsMha = Number(
    ((1 - mlaBytesTotal / Math.max(1, standardMhaBytesTotal)) * 100).toFixed(2)
  );
  const memorySavedPercentVsGqa8 = Number(
    ((1 - mlaBytesTotal / Math.max(1, gqa8HeadsBytesTotal)) * 100).toFixed(2)
  );

  return {
    variantId,
    seqLen,
    batchSize,
    bytesPerElement,
    effectiveDepthLayers,
    standardMhaKvElementsPerTokenPerLayer,
    gqa8HeadsKvElementsPerTokenPerLayer,
    mlaLatentElementsPerTokenPerLayer,
    standardMhaBytesTotal,
    gqa8HeadsBytesTotal,
    mlaBytesTotal,
    compressionRatioVsMha,
    compressionRatioVsGqa8,
    memorySavedPercentVsMha,
    memorySavedPercentVsGqa8,
  };
}

/**
 * Projects a context vector into an MLA low-rank latent summary c_KV + decoupled RoPE key k_rope,
 * and reconstructs K_nope and V via up-projection.
 */
export function compressLatentContext(
  contextVector: readonly number[],
  kvLoraRank: number = 8,
  ropeDecoupledDim: number = 4
): LatentContextSummary {
  const origDim = contextVector.length;
  if (origDim === 0) {
    throw new Error('Context vector cannot be empty');
  }
  const safeRank = Math.max(2, Math.min(origDim, Math.floor(kvLoraRank)));
  const safeRope = Math.max(2, Math.min(origDim, Math.floor(ropeDecoupledDim)));

  // Down-projection W_DKV: R^d -> R^{kv_lora_rank}
  const compressedLatentCkV = rmsNorm(
    Array.from({ length: safeRank }, (_, r) => {
      let sum = 0;
      for (let i = 0; i < origDim; i++) {
        sum += contextVector[i]! * Math.cos(((r + 1) * (i + 1) * Math.PI) / origDim);
      }
      return sum / Math.sqrt(origDim);
    })
  );

  // Decoupled RoPE projection W_KR: R^d -> R^{d_rope}
  const decoupledRopeKey = Array.from({ length: safeRope }, (_, k) => {
    const angle = (k + 1) * 0.41;
    const base = contextVector[k % origDim]!;
    return Number((base * Math.cos(angle) - base * Math.sin(angle) * 0.25).toFixed(6));
  });

  // Up-projection W_UK, W_UV: R^{kv_lora_rank} -> R^d
  const reconstructedK = Array.from({ length: origDim }, (_, i) => {
    let val = 0;
    for (let r = 0; r < safeRank; r++) {
      val += compressedLatentCkV[r]! * Math.cos(((r + 1) * (i + 1) * Math.PI) / origDim);
    }
    return val;
  });

  const reconstructedV = Array.from({ length: origDim }, (_, i) => {
    let val = 0;
    for (let r = 0; r < safeRank; r++) {
      val += compressedLatentCkV[r]! * Math.sin(((r + 1) * (i + 1) * Math.PI) / origDim);
    }
    return val;
  });

  const fullKvSize = 2 * origDim;
  const mlaCacheSize = safeRank + safeRope;

  return {
    originalDimensions: origDim,
    kvLoraRank: safeRank,
    ropeDecoupledDim: safeRope,
    compressedLatentCkV: compressedLatentCkV.map((v) => Number(v.toFixed(6))),
    decoupledRopeKey,
    reconstructedKeyNorm: Number(vectorNorm(reconstructedK).toFixed(6)),
    reconstructedValueNorm: Number(vectorNorm(reconstructedV).toFixed(6)),
    compressionRatio: Number((fullKvSize / Math.max(1, mlaCacheSize)).toFixed(2)),
  };
}

/**
 * Mixture-of-Depths Attention (MoDA) Unified Sequence + Depth Softmax Aggregator.
 *
 * Verified from open_mythos/moda.py L671-L815 (MoDAAttention.forward):
 * Combines causal sequence attention logits and cross-depth KV logits
 * (from Prelude, each Recurrent Loop iteration, and Coda) under a single
 * unified softmax so early-depth structural representations are never lost.
 */
export function computeModaAttention(params: {
  querySummary: string;
  sequenceKeys: ReadonlyArray<{ label: string; vector: readonly number[] }>;
  depthEntries: readonly ModaDepthLayerEntry[];
}): ModaAttentionResult {
  const { querySummary, sequenceKeys, depthEntries } = params;
  const dim =
    depthEntries[0]?.keyVector.length ??
    sequenceKeys[0]?.vector.length ??
    16;

  const queryVec = encodeTaskToLatent(querySummary, dim);
  const scale = 1 / Math.sqrt(dim);

  // 1. Sequence logits: Q @ K_seq^T / sqrt(d)
  const seqLogits = sequenceKeys.map((sk) => {
    let dot = 0;
    for (let i = 0; i < dim; i++) {
      dot += queryVec[i]! * (sk.vector[i] ?? 0);
    }
    return dot * scale;
  });

  // 2. Depth logits: Q @ K_depth^T / sqrt(d)
  const depthLogits = depthEntries.map((de) => {
    let dot = 0;
    for (let i = 0; i < dim; i++) {
      dot += queryVec[i]! * (de.keyVector[i] ?? 0);
    }
    return dot * scale;
  });

  // 3. Unified softmax over [seq_logits, depth_logits] (open_mythos/moda.py L776-L777)
  const combinedLogits = [...seqLogits, ...depthLogits];
  const combinedWeights = softmax(combinedLogits);

  const sequenceWeights = combinedWeights
    .slice(0, seqLogits.length)
    .map((w) => Number(w.toFixed(6)));
  const rawDepthWeights = combinedWeights.slice(seqLogits.length);

  const depthWeights = depthEntries.map((de, idx) => ({
    depthIndex: de.depthIndex,
    stage: de.stage,
    loopIteration: de.loopIteration,
    weight: Number(rawDepthWeights[idx]!.toFixed(6)),
    summary: de.summary,
  }));

  const sequenceAttentionMass = Number(
    sequenceWeights.reduce((a, b) => a + b, 0).toFixed(6)
  );
  const depthAttentionMass = Number(
    rawDepthWeights.reduce((a, b) => a + b, 0).toFixed(6)
  );

  // 4. Weighted sum of sequence values and depth values
  const combinedOutputVector = new Array<number>(dim).fill(0);
  sequenceKeys.forEach((sk, sIdx) => {
    const w = combinedWeights[sIdx]!;
    for (let i = 0; i < dim; i++) {
      combinedOutputVector[i] = combinedOutputVector[i]! + w * (sk.vector[i] ?? 0);
    }
  });
  depthEntries.forEach((de, dIdx) => {
    const w = rawDepthWeights[dIdx]!;
    for (let i = 0; i < dim; i++) {
      combinedOutputVector[i] = combinedOutputVector[i]! + w * (de.valueVector[i] ?? 0);
    }
  });

  return {
    querySummary,
    sequenceKeysCount: sequenceKeys.length,
    depthKeysCount: depthEntries.length,
    unifiedSoftmaxWeights: {
      sequenceWeights,
      depthWeights,
    },
    sequenceAttentionMass,
    depthAttentionMass,
    combinedOutputVector: combinedOutputVector.map((v) => Number(v.toFixed(6))),
    depthSignalPreserved: depthEntries.length > 0 && depthAttentionMass > 0,
  };
}
