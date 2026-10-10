import fs from 'node:fs';
import path from 'node:path';
import {
  canonicalSkillIds,
  getCoreRepoRoot,
  getSkillEntry,
  loadSkillRegistry,
  readSkillBody,
} from '../skill-registry.js';
import { routeTask } from '../task-router.js';
import { decodeToon, encodeDelegationContract, encodeToon, validateToon } from '../toon.js';
import {
  FABLE_MYTHOS_EXPERT_CATALOG,
  routeMythosExperts,
} from '../mythos/moe-moda-router.js';
import {
  POLICY_OVERLAY_SKILLS,
  SKILL_BOUNDARY_CONTRASTS,
  buildSubagentSkillArmingPrompt,
} from '../reflex/question-builder.js';
import type { FableSkillId, SkillRegistry } from '../types.js';
import { FableWorkerServer, FableWorkerClient } from '../../rpc/index.js';
import type { FableRpcServerOptions, TaskExecutionRequest, TaskEvent } from '../../rpc/types.js';
import {
  tryNativeJevOrchestrate,
  type ArmedSubagentBundle,
  type CoArmedSkill,
  type DelegationWave,
  type DelegationWavePlan,
  type IndependenceProof,
  type JevCalibrationReceipt,
  type SkillMatchScore,
  type SubagentExecutionReceipt,
  type SubtaskSpec,
  type WaveExecutionReport,
} from './rust-jev-bridge.js';

export * from './rust-jev-bridge.js';

export interface AgentRegistryEntry {
  id: string;
  name: string;
  role: string;
  autonomy_level: string;
  primary_skills: string[];
  supporting_skills: string[];
}

export interface ToolCapabilityEntry {
  id: string;
  capability: string;
  description: string;
  adapters: string[];
}

export interface OrchestrateSubagentsOptions {
  repoRoot?: string;
  cwd?: string;
  preferNative?: boolean;
  maxOverlaySkills?: number;
  subtasks?: Array<Partial<SubtaskSpec> & { description: string }>;
}

function loadAgentsRegistry(repoRoot: string): AgentRegistryEntry[] {
  try {
    const filePath = path.join(repoRoot, 'registry', 'agents.json');
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
      agents?: AgentRegistryEntry[];
    };
    return Array.isArray(parsed.agents) ? parsed.agents : [];
  } catch {
    return [];
  }
}

function loadToolsRegistry(repoRoot: string): ToolCapabilityEntry[] {
  try {
    const filePath = path.join(repoRoot, 'registry', 'tools.json');
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
      capabilities?: ToolCapabilityEntry[];
    };
    return Array.isArray(parsed.capabilities) ? parsed.capabilities : [];
  } catch {
    return [];
  }
}

function loadFailureLessons(repoRoot: string): string[] {
  try {
    const jsonPath = path.join(repoRoot, 'Failure-lessons', 'index.json');
    if (fs.existsSync(jsonPath)) {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (Array.isArray(parsed)) {
        return parsed.map((item) =>
          typeof item === 'string' ? item : String(item.rule || item.title || JSON.stringify(item))
        );
      }
      if (Array.isArray(parsed?.lessons)) {
        return parsed.lessons.map((item: any) =>
          typeof item === 'string' ? item : String(item.rule || item.title || JSON.stringify(item))
        );
      }
    }
  } catch {
    // Fallback to lessons-index.md
  }

  try {
    const mdPath = path.join(repoRoot, 'Failure-lessons', 'lessons-index.md');
    if (fs.existsSync(mdPath)) {
      const raw = fs.readFileSync(mdPath, 'utf-8');
      const rules = raw
        .split(/\r?\n/)
        .filter((line) => /^\d+\.\s+\*\*/.test(line.trim()))
        .map((line) => line.replace(/^\d+\.\s+/, '').trim());
      if (rules.length > 0) return rules;
    }
  } catch {
    // Use default fallback rules
  }

  return [
    '**Single Source of Invariant Truth**: One domain invariant must have exactly one canonical validation source.',
    '**Reproduce Before Fixing**: A regression test must reproduce the original failure mode before a fix is accepted.',
    '**Completeness Implies Resource Readiness**: A public completed state must strictly imply that all underlying artifacts are verified.',
  ];
}

function extractFilePathsFromText(text: string): string[] {
  const matches = text.match(/(?:src|test|skills|hooks|docs|crates|bin|eval|proto)\/[A-Za-z0-9_./*-]+/g);
  if (!matches || matches.length === 0) return [];
  return Array.from(new Set(matches.map((m) => m.replace(/[.,;:)]+$/, ''))));
}

function extractContractNamesFromText(text: string): string[] {
  const matches = text.match(/\b(?:[A-Z][a-z0-9]+){2,}(?:Spec|Contract|Interface|State|Decision|Bundle|Schema|Router|Engine|Config)\b/g);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

function inferDefaultWriteScope(description: string, index: number): string[] {
  const extracted = extractFilePathsFromText(description);
  if (extracted.length > 0) return extracted;
  const lower = description.toLowerCase();
  if (lower.includes('test') || lower.includes('tdd') || lower.includes('spec')) {
    return [`test/subtask-${index + 1}.test.ts`];
  }
  if (lower.includes('doc') || lower.includes('diagram') || lower.includes('artifact')) {
    return [`docs/subtask-${index + 1}.md`];
  }
  return [`src/subtask-${index + 1}.ts`];
}

function inferVerificationCmd(description: string, writeScope: string[]): string {
  const testFile = writeScope.find((p) => p.startsWith('test/') && p.endsWith('.test.ts'));
  if (testFile) return `bun test ${testFile}`;
  const lower = description.toLowerCase();
  if (lower.includes('typecheck') || lower.includes('build')) return 'bun run typecheck';
  if (lower.includes('doctor')) return 'bun ./bin/get-fable.js doctor --json-v1';
  if (lower.includes('security') || lower.includes('redteam')) return 'bun test test/router-security.test.ts';
  return `bun test --filter subtask-${writeScope[0] || 'unit'}`;
}

function inferPhaseHint(description: string): string {
  const decision = routeTask(description);
  const entry = getSkillEntry(decision.selectedSkill);
  return entry.phase;
}

/**
 * Decomposes a task prompt or explicit subtask array into normalized `SubtaskSpec` items.
 */
export function decomposeTaskIntoSubtasks(
  task: string,
  explicitSubtasks?: Array<Partial<SubtaskSpec> & { description: string }>
): SubtaskSpec[] {
  if (explicitSubtasks && explicitSubtasks.length > 0) {
    return explicitSubtasks.map((item, idx) => {
      const writeScope =
        item.writeScope && item.writeScope.length > 0
          ? item.writeScope
          : inferDefaultWriteScope(item.description, idx);
      const readScope =
        item.readScope && item.readScope.length > 0 ? item.readScope : [...writeScope];
      const sharedContracts =
        item.sharedContracts ?? extractContractNamesFromText(item.description);
      const verificationCmd =
        item.verificationCmd || inferVerificationCmd(item.description, writeScope);
      const phaseHint = item.phaseHint || inferPhaseHint(item.description);
      return {
        id: item.id || `subtask-${idx + 1}`,
        title: item.title || item.description.slice(0, 72).trim(),
        description: item.description,
        readScope,
        writeScope,
        sharedContracts,
        verificationCmd,
        phaseHint,
        wave: item.wave ?? 0,
      };
    });
  }

  // Split multi-part tasks on numbered lists, bullet lists, semicolons, or " and simultaneously / in parallel "
  const segments = task
    .split(/(?:\r?\n\s*(?:[-*]|\d+[.)])\s+)|(?:\s*;\s*)|(?:\s+\band\s+(?=(?:implement|create|build|verify|audit|review|write|update|add|design|test|refactor|trace|check)\b))/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);

  const rawParts = segments.length > 0 ? segments : [task.trim()];

  return rawParts.map((part, idx) => {
    const writeScope = inferDefaultWriteScope(part, idx);
    const sharedContracts = extractContractNamesFromText(part);
    const verificationCmd = inferVerificationCmd(part, writeScope);
    const phaseHint = inferPhaseHint(part);
    return {
      id: `subtask-${idx + 1}`,
      title: part.slice(0, 72).trim(),
      description: part,
      readScope: [...writeScope],
      writeScope,
      sharedContracts,
      verificationCmd,
      phaseHint,
      wave: 0,
    };
  });
}

function pathsOverlap(pathA: string, pathB: string): boolean {
  const normA = pathA.replace(/\/\*\*?$/, '').replace(/\/+$/, '');
  const normB = pathB.replace(/\/\*\*?$/, '').replace(/\/+$/, '');
  if (normA === normB) return true;
  if (normA.startsWith(`${normB}/`) || normB.startsWith(`${normA}/`)) return true;
  return false;
}

/**
 * Evaluates the 3 Delegation Laws across a candidate group of subtasks:
 * 1. Write Independence: disjoint write_scope paths/globs
 * 2. Semantic Independence: disjoint shared_contracts and low semantic overlap
 * 3. Verification Independence: non-conflicting verification gates
 */
export function evaluateIndependenceProof(subtasks: readonly SubtaskSpec[]): IndependenceProof {
  if (subtasks.length <= 1) {
    return {
      writeIndependent: true,
      semanticIndependent: true,
      verificationIndependent: true,
      conflicts: [],
      jevSemanticOverlapScore: 0,
    };
  }

  const conflicts: string[] = [];
  let writeIndependent = true;
  let semanticIndependent = true;
  let verificationIndependent = true;
  let maxSemanticOverlap = 0;

  for (let i = 0; i < subtasks.length; i++) {
    for (let j = i + 1; j < subtasks.length; j++) {
      const a = subtasks[i]!;
      const b = subtasks[j]!;

      // Law 1: Write Independence
      for (const wa of a.writeScope) {
        for (const wb of b.writeScope) {
          if (pathsOverlap(wa, wb)) {
            writeIndependent = false;
            conflicts.push(
              `Write scope conflict between ${a.id} (${wa}) and ${b.id} (${wb})`
            );
          }
        }
      }

      // Law 2: Semantic Independence (shared contracts + lexical token overlap on mutating tasks)
      for (const ca of a.sharedContracts) {
        if (b.sharedContracts.includes(ca)) {
          semanticIndependent = false;
          maxSemanticOverlap = Math.max(maxSemanticOverlap, 0.85);
          conflicts.push(
            `Shared contract conflict between ${a.id} and ${b.id} on contract "${ca}"`
          );
        }
      }

      const wordsA = new Set(
        a.description
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 4)
      );
      const wordsB = new Set(
        b.description
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 4)
      );
      let sharedWords = 0;
      for (const w of wordsA) {
        if (wordsB.has(w)) sharedWords++;
      }
      const unionSize = Math.max(1, wordsA.size + wordsB.size - sharedWords);
      const jaccard = sharedWords / unionSize;
      if (jaccard > maxSemanticOverlap) {
        maxSemanticOverlap = Number(jaccard.toFixed(4));
      }

      // Law 3: Verification Independence (empty verificationCmd is invalid)
      if (!a.verificationCmd.trim() || !b.verificationCmd.trim()) {
        verificationIndependent = false;
        conflicts.push(`Missing independent verification command between ${a.id} and ${b.id}`);
      }
    }
  }

  if (maxSemanticOverlap >= 0.75) {
    semanticIndependent = false;
    conflicts.push(`High Jev semantic overlap (${maxSemanticOverlap.toFixed(2)}) detected`);
  }

  return {
    writeIndependent,
    semanticIndependent,
    verificationIndependent,
    conflicts,
    jevSemanticOverlapScore: Number(maxSemanticOverlap.toFixed(4)),
  };
}

/**
 * Partitions subtasks into sequential waves such that every wave with >1 subtask
 * strictly satisfies all 3 Delegation Laws (Write, Semantic, Verification Independence).
 */
export function scheduleDelegationWaves(subtasks: readonly SubtaskSpec[]): SubtaskSpec[][] {
  const waves: SubtaskSpec[][] = [];

  for (const sub of subtasks) {
    let placed = false;
    for (let wIdx = 0; wIdx < waves.length; wIdx++) {
      const candidateWave = [...waves[wIdx]!, { ...sub, wave: wIdx }];
      const proof = evaluateIndependenceProof(candidateWave);
      if (
        proof.writeIndependent &&
        proof.semanticIndependent &&
        proof.verificationIndependent
      ) {
        waves[wIdx]!.push({ ...sub, wave: wIdx });
        placed = true;
        break;
      }
    }
    if (!placed) {
      const nextWaveIdx = waves.length;
      waves.push([{ ...sub, wave: nextWaveIdx }]);
    }
  }

  return waves;
}

function computeCalibrationReceipt(
  probabilities: Record<string, number>,
  primitive: 'choice' | 'score' | 'noul' = 'choice'
): JevCalibrationReceipt {
  const entries = Object.values(probabilities).filter((p) => p > 0);
  const n = Math.max(2, entries.length);
  let entropy = 0;
  for (const p of entries) {
    entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(n);
  const normalizedEntropy = maxEntropy > 0 ? Math.min(1, entropy / maxEntropy) : 0;
  const calibratedConfidence = Number(Math.max(0.51, 1 - normalizedEntropy * 0.45).toFixed(4));

  return {
    model: 'jev-hybrid-mythos-v1',
    primitive,
    probabilities,
    shannonEntropy: Number(entropy.toFixed(4)),
    normalizedEntropy: Number(normalizedEntropy.toFixed(4)),
    calibratedConfidence,
    usedLiveApi: false,
    cacheHit: false,
  };
}

/**
 * Scores all 42 canonical Fable skills for a subtask using the 6-Factor Hybrid Scoring Formula:
 * 1. lexicalScore (from deterministic routeTask signal weights)
 * 2. jevChoiceProb (from Jev boundary contrast positive/negative match)
 * 3. jevRubricScore (from intent and keyword rubric alignment)
 * 4. mythosMoeScore (from OpenMythos MoE unbiased affinity + gate weights)
 * 5. agentAffinityScore (from registry/agents.json specialist coverage)
 * 6. phaseGateScore (from lifecycle phase & subtask phaseHint alignment)
 */
export function scoreAllSkillsForSubtask(
  subtask: SubtaskSpec,
  repoRoot: string = getCoreRepoRoot(),
  registry: SkillRegistry = loadSkillRegistry(repoRoot)
): SkillMatchScore[] {
  const det = routeTask(subtask.description, undefined, registry);
  const mythos = routeMythosExperts({
    task: subtask.description,
    topK: 8,
    nGroups: 4,
    topkGroups: 4,
  });
  const agents = loadAgentsRegistry(repoRoot);
  const lower = subtask.description.toLowerCase();

  const maxDetScore = Math.max(1, ...Object.values(det.scores));
  const mythosMap = new Map<string, number>();
  for (const exp of mythos.routedExperts) {
    mythosMap.set(exp.expertId, exp.unbiasedAffinity);
  }
  for (const sharedId of mythos.sharedExperts) {
    mythosMap.set(sharedId, 0.75);
  }

  const allSkills = canonicalSkillIds();
  const results: SkillMatchScore[] = allSkills.map((skillId) => {
    const entry = getSkillEntry(skillId, registry);
    const rawLexical = det.scores[skillId] ?? 0;
    const lexicalScore = Number(
      Math.min(1, skillId === det.selectedSkill ? Math.max(0.85, rawLexical / maxDetScore) : rawLexical / maxDetScore).toFixed(4)
    );

    const contrast = SKILL_BOUNDARY_CONTRASTS[skillId];
    let jevChoiceProb = skillId === det.selectedSkill ? 0.88 : 0.15;
    if (contrast) {
      const posWords = contrast.useWhen
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 4 && w !== 'select');
      const hits = posWords.filter((w) => lower.includes(w)).length;
      jevChoiceProb = Math.min(0.98, jevChoiceProb + hits * 0.08);
    }
    jevChoiceProb = Number(jevChoiceProb.toFixed(4));

    const kwHits = entry.keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
    const intentHits = entry.intents.filter((it) =>
      lower.includes(it.toLowerCase().replace(/-/g, ' '))
    ).length;
    const jevRubricScore = Number(
      Math.min(1, (skillId === det.selectedSkill ? 0.75 : 0.25) + kwHits * 0.12 + intentHits * 0.15).toFixed(4)
    );

    const catalogEntry = FABLE_MYTHOS_EXPERT_CATALOG.find((e) => e.skillId === skillId);
    const baseMythos = mythosMap.get(skillId) ?? (catalogEntry ? catalogEntry.attentionHeadWeight * 0.45 : 0.35);
    const mythosMoeScore = Number(Math.min(1, baseMythos).toFixed(4));

    const hasPrimaryAgent = agents.some((a) => a.primary_skills.includes(skillId));
    const hasSupportingAgent = agents.some((a) => a.supporting_skills.includes(skillId));
    const agentAffinityScore = Number(
      (hasPrimaryAgent ? 0.95 : hasSupportingAgent ? 0.8 : 0.7).toFixed(4)
    );

    const phaseGateScore = Number(
      (entry.phase === subtask.phaseHint ? 0.95 : 0.6).toFixed(4)
    );

    const totalScore = Number(
      (
        0.22 * lexicalScore +
        0.24 * jevChoiceProb +
        0.16 * jevRubricScore +
        0.18 * mythosMoeScore +
        0.10 * agentAffinityScore +
        0.10 * phaseGateScore
      ).toFixed(4)
    );

    const reasons: string[] = [];
    if (skillId === det.selectedSkill) {
      reasons.push(...det.reasons);
    }
    if (kwHits > 0) {
      reasons.push(`Matched ${kwHits} canonical skill keyword(s)`);
    }
    if (mythosMap.has(skillId)) {
      reasons.push(`Activated by OpenMythos MoE router (affinity=${mythosMoeScore})`);
    }
    if (reasons.length === 0) {
      reasons.push(`Evaluated via 6-factor Jev+Mythos hybrid scoring (${entry.pack} pack)`);
    }

    return {
      skillId,
      pack: entry.pack,
      totalScore,
      lexicalScore,
      jevChoiceProb,
      jevRubricScore,
      mythosMoeScore,
      agentAffinityScore,
      phaseGateScore,
      reasons,
    };
  });

  results.sort((a, b) => {
    // Primary deterministic skill takes precedence unless another skill exceeds it by a wide margin
    if (a.skillId === det.selectedSkill && b.totalScore - a.totalScore < 0.15) return -1;
    if (b.skillId === det.selectedSkill && a.totalScore - b.totalScore < 0.15) return 1;
    return b.totalScore - a.totalScore || a.skillId.localeCompare(b.skillId);
  });

  return results;
}

export function selectSubagentForSkill(
  skillId: string,
  repoRoot: string = getCoreRepoRoot()
): { subagentId: string; subagentRole: string } {
  const agents = loadAgentsRegistry(repoRoot);
  const primaryMatch = agents.find((a) => a.primary_skills.includes(skillId));
  if (primaryMatch) {
    return { subagentId: primaryMatch.id, subagentRole: primaryMatch.role };
  }
  const supportingMatch = agents.find((a) => a.supporting_skills.includes(skillId));
  if (supportingMatch) {
    return { subagentId: supportingMatch.id, subagentRole: supportingMatch.role };
  }

  const entry = getSkillEntry(skillId as FableSkillId);
  if (entry.pack === 'proof') {
    return { subagentId: 'verifier', subagentRole: 'Independent Test Runner & Causal Proof Validator' };
  }
  if (entry.phase === 'discovering') {
    return { subagentId: 'researcher', subagentRole: 'Primary Source Investigator & Facts Grounder' };
  }
  if (entry.phase === 'planned') {
    return { subagentId: 'architect', subagentRole: 'System Designer & Work Card Decomposer' };
  }
  return { subagentId: 'executor', subagentRole: 'Bounded TDD & Code Implementer' };
}

export function selectToolsForSkill(
  skillId: string,
  mutatesWorkspace: boolean,
  repoRoot: string = getCoreRepoRoot()
): string[] {
  const tools = loadToolsRegistry(repoRoot);
  const availableIds = new Set(tools.map((t) => t.id));
  const selected = new Set<string>();

  if (availableIds.has('file-operations')) selected.add('file-operations');
  if (availableIds.has('git-version-control')) selected.add('git-version-control');

  if (
    mutatesWorkspace ||
    skillId === 'fable-verify' ||
    skillId === 'fable-tdd' ||
    skillId === 'fable-run' ||
    skillId === 'fable-recover' ||
    skillId === 'fable-eval' ||
    skillId === 'fable-redteam' ||
    skillId === 'fable-heal' ||
    skillId === 'fable-tend'
  ) {
    if (availableIds.has('terminal-execution')) selected.add('terminal-execution');
  }

  if (skillId === 'fable-research' || skillId === 'fable-domain') {
    if (availableIds.has('current-source-search')) selected.add('current-source-search');
  }

  if (
    skillId === 'fable-simulator' ||
    skillId === 'fable-dataviz' ||
    skillId === 'fable-artifact' ||
    skillId === 'fable-run'
  ) {
    if (availableIds.has('headless-browser')) selected.add('headless-browser');
  }

  return Array.from(selected);
}

export function selectLifecycleEnginesForSkill(skillId: string): string[] {
  const engines = new Set<string>();

  if (skillId === 'fable-tdd' || skillId === 'fable-judge' || skillId === 'fable-verify') {
    engines.add('test-value');
  }
  if (skillId === 'fable-review' || skillId === 'fable-judge') {
    engines.add('review/jev');
  }
  if (
    skillId === 'fable-verify' ||
    skillId === 'fable-artifact' ||
    skillId === 'fable-dataviz' ||
    skillId === 'fable-simulator'
  ) {
    engines.add('ui-polish');
  }
  if (
    skillId === 'fable-recover' ||
    skillId === 'fable-security' ||
    skillId === 'fable-redteam' ||
    skillId === 'fable-heal' ||
    skillId === 'fable-discover' ||
    skillId === 'fable-learning'
  ) {
    engines.add('reflex/recipes-bridge');
  }
  if (
    skillId === 'fable-architecture' ||
    skillId === 'fable-plan' ||
    skillId === 'fable-delegate' ||
    skillId === 'get-fable'
  ) {
    engines.add('mythos/moe-moda');
  }

  if (engines.size === 0) {
    engines.add('reflex/jev-router');
  }

  return Array.from(engines);
}

export function armCoOverlaySkills(
  subtask: SubtaskSpec,
  primarySkillId: string,
  maxOverlays: number = 3,
  registry: SkillRegistry = loadSkillRegistry()
): CoArmedSkill[] {
  const promptSpec = buildSubagentSkillArmingPrompt(
    subtask,
    primarySkillId,
    POLICY_OVERLAY_SKILLS,
    registry
  );
  const primaryEntry = getSkillEntry(primarySkillId as FableSkillId, registry);
  const lower = subtask.description.toLowerCase();

  const candidates: CoArmedSkill[] = promptSpec.candidateOverlaySkills.map((overlayId) => {
    const contrast = SKILL_BOUNDARY_CONTRASTS[overlayId];
    let jevScore = 0.62;
    let role = 'execution-policy-overlay';

    if (overlayId === 'fable-scope-discipline' && primaryEntry.mutatesWorkspace) {
      jevScore = 0.94;
      role = 'anti-scope-creep-guard';
    } else if (overlayId === 'fable-native-code' && primaryEntry.mutatesWorkspace) {
      jevScore = 0.91;
      role = 'idiom-and-anti-bloat-guard';
    } else if (overlayId === 'fable-prove-it') {
      jevScore = primaryEntry.phase === 'verifying' ? 0.95 : 0.88;
      role = 'three-rung-evidence-guard';
    } else if (overlayId === 'fable-context-thrift' && primaryEntry.phase === 'discovering') {
      jevScore = 0.93;
      role = 'token-budget-guard';
    } else if (overlayId === 'fable-finish-your-turn' && primaryEntry.mutatesWorkspace) {
      jevScore = 0.86;
      role = 'autonomous-completion-guard';
    } else if (overlayId === 'fable-outcome-first' && primaryEntry.phase === 'verifying') {
      jevScore = 0.87;
      role = 'direct-answer-guard';
    } else if (
      overlayId === 'fable-wise' &&
      (primaryEntry.phase === 'planned' || lower.includes('refactor') || lower.includes('simplify'))
    ) {
      jevScore = 0.89;
      role = 'cognitive-reflex-purifier';
    } else if (overlayId === 'fable-method') {
      jevScore = 0.82;
      role = 'think-act-prove-loop';
    }

    return {
      skillId: overlayId,
      role,
      jevScore: Number(jevScore.toFixed(4)),
      directive: contrast
        ? `${contrast.useWhen} ${contrast.notWhen}`
        : `Enforce ${overlayId} policy constraints.`,
    };
  });

  candidates.sort((a, b) => b.jevScore - a.jevScore || a.skillId.localeCompare(b.skillId));
  return candidates.slice(0, Math.max(1, Math.min(3, maxOverlays)));
}

/**
 * Orchestrates a multi-part task across subagents using Jev Reflex, OpenMythos MoE,
 * and the 6-Factor Hybrid Scoring Engine while enforcing the 3 Delegation Laws.
 *
 * Returns a DelegationWavePlan that can be consumed either synchronously or via `await`.
 */
export function orchestrateSubagentsWithJev(
  task: string,
  options?: OrchestrateSubagentsOptions
): DelegationWavePlan & PromiseLike<DelegationWavePlan> {
  const repoRoot = options?.repoRoot || getCoreRepoRoot();
  const registry = loadSkillRegistry(repoRoot);

  if (options?.preferNative !== false && !options?.subtasks) {
    const nativePlan = tryNativeJevOrchestrate(task, {
      repoRoot,
      cwd: options?.cwd,
    });
    if (nativePlan) {
      return attachThenable(nativePlan);
    }
  }

  const rawSubtasks = decomposeTaskIntoSubtasks(task, options?.subtasks);
  const waveGroups = scheduleDelegationWaves(rawSubtasks);
  const allLessons = loadFailureLessons(repoRoot);

  const waves: DelegationWave[] = waveGroups.map((group, waveIdx) => {
    const independenceProof = evaluateIndependenceProof(group);
    const bundles: ArmedSubagentBundle[] = group.map((subtask) => {
      const scoredSkills = scoreAllSkillsForSubtask(subtask, repoRoot, registry);
      const primarySkill = scoredSkills[0]!;
      const primaryEntry = getSkillEntry(primarySkill.skillId as FableSkillId, registry);
      const { subagentId, subagentRole } = selectSubagentForSkill(
        primarySkill.skillId,
        repoRoot
      );
      const coArmedSkills = armCoOverlaySkills(
        subtask,
        primarySkill.skillId,
        options?.maxOverlaySkills ?? 3,
        registry
      );
      const armedTools = selectToolsForSkill(
        primarySkill.skillId,
        primaryEntry.mutatesWorkspace,
        repoRoot
      );
      const armedEngines = selectLifecycleEnginesForSkill(primarySkill.skillId);

      const rawSkillBody = readSkillBody(primarySkill.skillId as FableSkillId, repoRoot);
      const compiledSkillExcerpt = rawSkillBody.slice(0, 600).trim();

      const topProbs: Record<string, number> = {};
      const topSlice = scoredSkills.slice(0, 5);
      const sumTop = topSlice.reduce((acc, s) => acc + s.totalScore, 0) || 1;
      for (const s of topSlice) {
        topProbs[s.skillId] = Number((s.totalScore / sumTop).toFixed(4));
      }
      const calibration = computeCalibrationReceipt(topProbs, 'choice');

      const toonContract = encodeDelegationContract({
        workerId: `${subagentId}-${subtask.id}`,
        targetCard: subtask.title,
        objective: subtask.description,
        ownedPaths: subtask.writeScope,
        forbiddenPaths: [
          'registry/**',
          '.fable/**',
        ],
        acceptanceChecks: [
          subtask.verificationCmd,
          ...primaryEntry.gates.map((g) => `gate:${g}`),
        ],
        rules: [
          `Primary skill: ${primarySkill.skillId}`,
          `Co-armed overlays: ${coArmedSkills.map((c) => c.skillId).join(', ')}`,
          `Armed engines: ${armedEngines.join(', ')}`,
        ],
      });

      return {
        subtask,
        subagentId,
        subagentRole,
        primarySkill,
        coArmedSkills,
        armedTools,
        armedEngines,
        failureLessons: allLessons.slice(0, 3),
        requiredGates: [...primaryEntry.gates],
        compiledSkillExcerpt,
        toonContract,
        calibration,
      };
    });

    return {
      waveIndex: waveIdx,
      parallel: group.length > 1 && independenceProof.writeIndependent && independenceProof.semanticIndependent && independenceProof.verificationIndependent,
      independenceProof,
      bundles,
    };
  });

  const allBundles = waves.flatMap((w) => w.bundles);
  const overallAccuracyScore =
    allBundles.length > 0
      ? Number(
          (
            allBundles.reduce((acc, b) => acc + b.primarySkill.totalScore, 0) /
            allBundles.length
          ).toFixed(4)
        )
      : 1.0;

  const toonSummary = encodeToon({
    task,
    totalSubtasks: rawSubtasks.length,
    totalWaves: waves.length,
    overallAccuracyScore,
    waves: waves.map((w) => ({
      waveIndex: w.waveIndex,
      parallel: w.parallel,
      subtasks: w.bundles.map((b) => ({
        id: b.subtask.id,
        subagent: b.subagentId,
        primarySkill: b.primarySkill.skillId,
        overlays: b.coArmedSkills.map((c) => c.skillId).join('+'),
        engines: b.armedEngines.join('+'),
      })),
    })),
  });

  const plan: DelegationWavePlan = {
    task,
    totalSubtasks: rawSubtasks.length,
    totalWaves: waves.length,
    overallAccuracyScore,
    waves,
    toonSummary,
  };

  return attachThenable(plan);
}

function attachThenable(
  plan: DelegationWavePlan
): DelegationWavePlan & PromiseLike<DelegationWavePlan> {
  const clone: DelegationWavePlan = { ...plan };
  Object.defineProperty(plan, 'then', {
    value: <TResult1 = DelegationWavePlan, TResult2 = never>(
      onfulfilled?: ((value: DelegationWavePlan) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> => {
      return Promise.resolve(clone).then(onfulfilled, onrejected);
    },
    enumerable: false,
    configurable: true,
  });
  return plan as DelegationWavePlan & PromiseLike<DelegationWavePlan>;
}

/**
 * Executes a DelegationWavePlan live over the Fable gRPC Worker Service (`FableWorkerServer` + `FableWorkerClient`).
 *
 * - Parallel waves (`wave.parallel === true`) dispatch all bundles concurrently via `Promise.all`.
 * - Sequential waves (`wave.parallel === false`) dispatch bundles strictly in order.
 * - Spawns an in-process ephemeral `FableWorkerServer` on an OS-assigned port (`127.0.0.1:<boundPort>`)
 *   when `options?.workerAddress` is omitted (unless `options?.spawnEphemeralServer === false`).
 */
export async function executeDelegationWavePlanWithGrpc(
  plan: DelegationWavePlan,
  options?: {
    workerAddress?: string;
    spawnEphemeralServer?: boolean;
    /** The real task executor used by an ephemeral in-process worker. */
    taskHandler?: FableRpcServerOptions['taskHandler'];
  }
): Promise<WaveExecutionReport> {
  const shouldSpawnEphemeral =
    options?.spawnEphemeralServer === true ||
    (!options?.workerAddress && options?.spawnEphemeralServer !== false);

  let ephemeralServer: FableWorkerServer | null = null;
  let resolvedWorkerAddress = options?.workerAddress || '127.0.0.1:50051';

  if (shouldSpawnEphemeral) {
    const canonicalSet = new Set<string>(canonicalSkillIds());

    ephemeralServer = new FableWorkerServer({
      host: '127.0.0.1',
      port: 0,
      taskHandler: async (
        request: TaskExecutionRequest,
        emitEvent: (event: TaskEvent) => void,
        isCancelled: () => boolean
      ) => {
        const taskId = request.task_id || `task-${Date.now()}`;
        const runId = request.run_id || 'run-default';
        const params = request.parameters || {};
        const primarySkill =
          params.primarySkill || request.required_capabilities?.[0] || '';
        const coArmedSkills = (params.coArmedSkills || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const workerId =
          params.workerId || `${params.subagentId || 'executor'}-${taskId}`;
        const toonContract = params.toonContract || '';

        if (
          !Array.isArray(request.required_capabilities) ||
          request.required_capabilities.length === 0
        ) {
          throw new Error(`Missing required_capabilities for subtask ${taskId}`);
        }
        if (!primarySkill || !canonicalSet.has(primarySkill)) {
          throw new Error(
            `Invalid primary skill "${primarySkill}" for subtask ${taskId}`
          );
        }
        for (const overlayId of coArmedSkills) {
          if (!canonicalSet.has(overlayId)) {
            throw new Error(
              `Invalid co-armed overlay skill "${overlayId}" for subtask ${taskId}`
            );
          }
        }
        if (toonContract) {
          const contractValidation = validateToon(toonContract);
          if (!contractValidation.valid) {
            throw new Error(
              `Invalid TOON delegation contract for subtask ${taskId}: ${contractValidation.error}`
            );
          }
        }

        if (isCancelled()) {
          emitEvent({
            event_id: `evt-${Date.now()}-cancel`,
            task_id: taskId,
            run_id: runId,
            timestamp: Date.now(),
            event_type: 'cancelled',
            message: `Subtask ${taskId} cancelled before tool execution`,
            payload_json: JSON.stringify({ cancelled: true, taskId }),
            is_terminal: true,
          });
          return;
        }

        if (!options?.taskHandler) {
          throw new Error(
            `No taskHandler configured for ${taskId}: cannot claim execution or verification`
          );
        }
        // The injected handler owns tool execution and emits its own terminal result.
        await options.taskHandler(request, emitEvent, isCancelled);
      },
    });

    // Port 0 is supported directly by FableWorkerServer.
    const boundPort = await ephemeralServer.start();
    resolvedWorkerAddress = `127.0.0.1:${boundPort}`;
  }

  const client = new FableWorkerClient({
    serverAddress: resolvedWorkerAddress,
    // Never transmit worker task metadata in plaintext to a non-loopback endpoint.
    insecure: /^(?:127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(resolvedWorkerAddress),
  });

  const receipts: SubagentExecutionReceipt[] = [];
  const sortedWaves = [...plan.waves].sort((a, b) => a.waveIndex - b.waveIndex);
  let executedWaves = 0;

  const dispatchBundle = async (
    bundle: ArmedSubagentBundle,
    waveIndex: number
  ): Promise<SubagentExecutionReceipt> => {
    const startedMs = performance.now();
    const coArmedIds = bundle.coArmedSkills.map((c) => c.skillId);
    const workerId = `${bundle.subagentId}-${bundle.subtask.id}`;

    const request: TaskExecutionRequest = {
      task_id: bundle.subtask.id,
      run_id: `wave-${waveIndex}-${bundle.subagentId}`,
      title: bundle.subtask.title,
      objective: bundle.subtask.description,
      required_capabilities: [
        bundle.primarySkill.skillId,
        ...coArmedIds,
        ...bundle.armedTools,
        ...bundle.armedEngines,
      ],
      input_artifacts: bundle.subtask.readScope,
      parameters: {
        workerId,
        subagentId: bundle.subagentId,
        subagentRole: bundle.subagentRole,
        primarySkill: bundle.primarySkill.skillId,
        coArmedSkills: coArmedIds.join(','),
        toonContract: bundle.toonContract,
        verificationCmd: bundle.subtask.verificationCmd,
        waveIndex: String(waveIndex),
      },
      timeout_ms: 30000,
    };

    const events = await client.executeTask(request);
    const durationMs = Math.max(1, Math.round(performance.now() - startedMs));

    const hasFailed = events.some((event) => event.event_type === 'failed');
    const hasCancelled = events.some((event) => event.event_type === 'cancelled');
    // A completed event alone is not proof of a completed or verified task.
    const terminalEvent = [...events].reverse().find((event) => event.is_terminal);
    let verifiedCompletion = false;
    let returnPacketToon = '';

    if (
      !hasFailed &&
      !hasCancelled &&
      terminalEvent?.event_type === 'completed' &&
      terminalEvent.payload_json
    ) {
      try {
        const payload = JSON.parse(terminalEvent.payload_json) as {
          success?: boolean;
          returnPacketToon?: string;
        };
        if (
          payload.success === true &&
          typeof payload.returnPacketToon === 'string' &&
          validateToon(payload.returnPacketToon).valid
        ) {
          const packet = decodeToon<{
            returnPacket?: {
              subtaskId?: string;
              primarySkill?: string;
              status?: string;
              verified?: boolean;
            };
          }>(payload.returnPacketToon);
          verifiedCompletion =
            packet?.returnPacket?.subtaskId === bundle.subtask.id &&
            packet.returnPacket.primarySkill === bundle.primarySkill.skillId &&
            packet.returnPacket.status === 'completed' &&
            packet.returnPacket.verified === true;
          if (verifiedCompletion) {
            returnPacketToon = payload.returnPacketToon;
          }
        }
      } catch {
        // Invalid or unverified worker packets must never be counted as success.
      }
    }

    const status: 'completed' | 'failed' | 'cancelled' = hasCancelled
      ? 'cancelled'
      : verifiedCompletion
        ? 'completed'
        : 'failed';

    if (!returnPacketToon) {
      returnPacketToon = encodeToon({
        returnPacket: {
          workerId,
          subtaskId: bundle.subtask.id,
          primarySkill: bundle.primarySkill.skillId,
          coArmedSkills: coArmedIds,
          status,
          verified: false,
        },
      });
    }

    return {
      subtaskId: bundle.subtask.id,
      subagentId: bundle.subagentId,
      primarySkillId: bundle.primarySkill.skillId,
      coArmedSkills: coArmedIds,
      waveIndex,
      status,
      eventsCount: events.length,
      durationMs,
      returnPacketToon,
    };
  };

  try {
    for (const wave of sortedWaves) {
      executedWaves++;
      if (wave.parallel) {
        const waveReceipts = await Promise.all(
          wave.bundles.map((bundle) => dispatchBundle(bundle, wave.waveIndex))
        );
        receipts.push(...waveReceipts);
      } else {
        for (const bundle of wave.bundles) {
          const receipt = await dispatchBundle(bundle, wave.waveIndex);
          receipts.push(receipt);
        }
      }
      // Dependent waves must not execute after a failed or cancelled prerequisite.
      if (receipts.some((receipt) => receipt.waveIndex === wave.waveIndex && receipt.status !== 'completed')) {
        break;
      }
    }

    const allSucceeded =
      receipts.length > 0 &&
      receipts.length === plan.totalSubtasks &&
      receipts.every((receipt) => receipt.status === 'completed');
    const toonReport = encodeToon({
      executionReport: {
        task: plan.task,
        workerAddress: resolvedWorkerAddress,
        ephemeralServerSpawned: shouldSpawnEphemeral,
        totalWavesExecuted: executedWaves,
        totalSubtasksExecuted: receipts.length,
        allSucceeded,
      },
      receipts: receipts.map((r) => ({
        subtaskId: r.subtaskId,
        subagentId: r.subagentId,
        primarySkillId: r.primarySkillId,
        coArmedSkills: r.coArmedSkills.join('+'),
        waveIndex: r.waveIndex,
        status: r.status,
        eventsCount: r.eventsCount,
        durationMs: r.durationMs,
      })),
    });

    return {
      task: plan.task,
      workerAddress: resolvedWorkerAddress,
      ephemeralServerSpawned: shouldSpawnEphemeral,
      totalWavesExecuted: executedWaves,
      totalSubtasksExecuted: receipts.length,
      allSucceeded,
      receipts,
      toonReport,
    };
  } finally {
    client.close();
    if (ephemeralServer) {
      await ephemeralServer.stop();
    }
  }
}
