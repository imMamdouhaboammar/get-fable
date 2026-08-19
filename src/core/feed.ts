import fs from 'node:fs';
import path from 'node:path';
import { loadSkillRegistry, getCoreRepoRoot } from './skill-registry.js';
import {
  getSkillPackageSummary,
  getSkillManifestPath,
  listSkillResources,
  loadSkillPackage,
  readSkillResource,
} from './skill-package.js';
import { evaluateSkillMaturity, type EvidenceSlice, type SkillMaturity } from './maturity.js';
import { repositoryRevision } from './eval-runner.js';
import type { FableSkillId, SkillResourceEntry } from './types.js';

export interface SkillFeedItem {
  id: string;
  name: string;
  pack: string;
  description: string;
  intents: string[];
  requires: string[];
  produces: string[];
  gates: string[];
  mutatesWorkspace: boolean;
  parallelSafe: boolean;
  keywords: string[];
  sourceAvailable: boolean;
  installedInTarget: boolean;
  isInstalled: boolean;
  skillPath: string;
  manifestExists: boolean;
  packageValid: boolean;
  runtimeIntegrated: boolean;
  behaviorallyProven: boolean;
  enterpriseReady: boolean;
  maturity: SkillMaturity;
  resourceCounts: {
    agents: number;
    references: number;
    templates: number;
    examples: number;
    evals: number;
    scripts: number;
    total: number;
  };
  evalScenariosCount: number;
  knownCases: { executed: number; passed: number; passRate: number | null; status: EvidenceSlice['status'] };
  holdout: EvidenceSlice;
  lastEvalVerdict: EvidenceSlice['status'];
  lastEvaluatedRevision: string | null;
}

function countEvalScenarios(id: FableSkillId, repoRoot: string): number {
  try {
    const manifest = loadSkillPackage(id, repoRoot);
    let count = 0;
    for (const evalPath of manifest.evals) {
      if (!evalPath.endsWith('.json')) continue;
      const parsed = JSON.parse(readSkillResource(id, evalPath, repoRoot));
      count += Array.isArray(parsed) ? parsed.length : Array.isArray(parsed?.scenarios) ? parsed.scenarios.length : 0;
    }
    return count;
  } catch { return 0; }
}

export function loadSkillFeed(
  repoRoot: string = getCoreRepoRoot(),
  targetDir: string = process.cwd()
): SkillFeedItem[] {
  const registry = loadSkillRegistry(repoRoot);
  const revision = repositoryRevision(repoRoot);
  return registry.skills.map((skill) => {
    const id = skill.id as FableSkillId;
    const sourceSkillPath = path.join(repoRoot, 'skills', id, 'SKILL.md');
    const projectSkillPath = path.join(targetDir, '.agents', 'skills', id, 'SKILL.md');
    const sourceAvailable = fs.existsSync(sourceSkillPath);
    const installedInTarget = fs.existsSync(projectSkillPath);
    const manifestExists = fs.existsSync(getSkillManifestPath(id, repoRoot));
    let summary = {
      valid: false, entryExists: sourceAvailable, agentCount: 0, referenceCount: 0,
      templateCount: 0, exampleCount: 0, evalCount: 0, scriptCount: 0,
      totalResources: sourceAvailable ? 1 : 0,
    };
    if (manifestExists) {
      try { summary = getSkillPackageSummary(id, repoRoot); } catch {}
    }
    const evidence = evaluateSkillMaturity(id, repoRoot);
    const known = evidence.behavior.known;
    return {
      id,
      name: (skill as any).name || id,
      pack: skill.pack,
      description: skill.description,
      intents: skill.intents,
      requires: skill.requires,
      produces: skill.produces,
      gates: skill.gates,
      mutatesWorkspace: skill.mutatesWorkspace,
      parallelSafe: skill.parallelSafe,
      keywords: skill.keywords,
      sourceAvailable,
      installedInTarget,
      isInstalled: installedInTarget,
      skillPath: sourceAvailable ? sourceSkillPath : projectSkillPath,
      manifestExists,
      packageValid: summary.valid,
      runtimeIntegrated: evidence.runtimeIntegrated,
      behaviorallyProven: evidence.behaviorallyProven,
      enterpriseReady: evidence.enterpriseReady,
      maturity: evidence.maturity,
      resourceCounts: {
        agents: summary.agentCount,
        references: summary.referenceCount,
        templates: summary.templateCount,
        examples: summary.exampleCount,
        evals: summary.evalCount,
        scripts: summary.scriptCount,
        total: summary.totalResources,
      },
      evalScenariosCount: countEvalScenarios(id, repoRoot),
      knownCases: { executed: known.total, passed: known.passed, passRate: known.passRate, status: known.status },
      holdout: evidence.behavior.holdout,
      lastEvalVerdict: known.status,
      lastEvaluatedRevision: known.total > 0 ? revision : null,
    };
  });
}

export function searchSkillFeed(
  query: string,
  repoRoot: string = getCoreRepoRoot(),
  targetDir: string = process.cwd()
): SkillFeedItem[] {
  const feed = loadSkillFeed(repoRoot, targetDir);
  const q = query.toLowerCase().trim();
  if (!q) return feed;
  return feed.filter((item) =>
    item.id.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) ||
    item.pack.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) ||
    item.intents.some((value) => value.toLowerCase().includes(q)) ||
    item.keywords.some((value) => value.toLowerCase().includes(q)) ||
    item.gates.some((value) => value.toLowerCase().includes(q))
  );
}

export function inspectSkillDetail(
  skillId: string,
  repoRoot: string = getCoreRepoRoot(),
  targetDir: string = process.cwd()
): { item: SkillFeedItem | null; instructions: string | null; resources: SkillResourceEntry[] } {
  const item = loadSkillFeed(repoRoot, targetDir).find((s) => s.id.toLowerCase() === skillId.toLowerCase()) || null;
  if (!item) return { item: null, instructions: null, resources: [] };
  const instructions = fs.existsSync(item.skillPath) ? fs.readFileSync(item.skillPath, 'utf-8') : null;
  let resources: SkillResourceEntry[] = [];
  try { resources = listSkillResources(item.id, repoRoot); } catch {}
  return { item, instructions, resources };
}
