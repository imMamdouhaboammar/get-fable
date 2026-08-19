import fs from 'node:fs';
import path from 'node:path';
import { loadSkillRegistry, getCoreRepoRoot } from './skill-registry.js';
import { getSkillPackageSummary, listSkillResources, getSkillManifestPath } from './skill-package.js';
import type { SkillResourceEntry } from './types.js';

export type SkillMaturity = 'M0' | 'M1' | 'M2' | 'M3' | 'M4';

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
  isInstalled: boolean;
  skillPath: string;
  manifestExists: boolean;
  packageValid: boolean;
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
}

export function computeSkillMaturity(summary: {
  valid: boolean;
  entryExists: boolean;
  agentCount: number;
  referenceCount: number;
  templateCount: number;
  exampleCount: number;
  evalCount: number;
  totalResources: number;
}): SkillMaturity {
  if (!summary.entryExists) return 'M0';
  if (!summary.valid) return 'M1';
  if (summary.totalResources <= 1) return 'M1';
  if (summary.evalCount === 0) return 'M2';
  if (summary.agentCount > 0 && summary.evalCount > 0 && summary.valid) {
    return summary.referenceCount > 0 || summary.exampleCount > 0 ? 'M4' : 'M3';
  }
  return 'M3';
}

export function loadSkillFeed(
  repoRoot: string = getCoreRepoRoot(),
  targetDir: string = process.cwd()
): SkillFeedItem[] {
  const registry = loadSkillRegistry(repoRoot);
  const items: SkillFeedItem[] = [];

  for (const skill of registry.skills) {
    const localSkillPath = path.join(repoRoot, 'skills', skill.id, 'SKILL.md');
    const projectSkillPath = path.join(targetDir, '.agents', 'skills', skill.id, 'SKILL.md');
    const isInstalled = fs.existsSync(localSkillPath) || fs.existsSync(projectSkillPath);
    const manifestPath = getSkillManifestPath(skill.id, repoRoot);
    const manifestExists = fs.existsSync(manifestPath);

    let summary = {
      valid: false,
      entryExists: fs.existsSync(localSkillPath),
      agentCount: 0,
      referenceCount: 0,
      templateCount: 0,
      exampleCount: 0,
      evalCount: 0,
      scriptCount: 0,
      totalResources: fs.existsSync(localSkillPath) ? 1 : 0,
    };

    let evalScenariosCount = 0;

    if (manifestExists) {
      try {
        const s = getSkillPackageSummary(skill.id, repoRoot);
        summary = s;
        const evalPath = path.join(repoRoot, 'skills', skill.id, 'evals', 'scenarios.json');
        if (fs.existsSync(evalPath)) {
          const parsed = JSON.parse(fs.readFileSync(evalPath, 'utf-8'));
          evalScenariosCount = Array.isArray(parsed) ? parsed.length : 0;
        }
      } catch {}
    }

    const maturity = computeSkillMaturity(summary);

    items.push({
      id: skill.id,
      name: (skill as any).name || skill.id,
      pack: skill.pack,
      description: skill.description,
      intents: skill.intents,
      requires: skill.requires,
      produces: skill.produces,
      gates: skill.gates,
      mutatesWorkspace: skill.mutatesWorkspace,
      parallelSafe: skill.parallelSafe,
      keywords: skill.keywords,
      isInstalled,
      skillPath: fs.existsSync(localSkillPath) ? localSkillPath : projectSkillPath,
      manifestExists,
      packageValid: summary.valid,
      maturity,
      resourceCounts: {
        agents: summary.agentCount,
        references: summary.referenceCount,
        templates: summary.templateCount,
        examples: summary.exampleCount,
        evals: summary.evalCount,
        scripts: summary.scriptCount,
        total: summary.totalResources,
      },
      evalScenariosCount,
    });
  }

  return items;
}

export function searchSkillFeed(
  query: string,
  repoRoot: string = getCoreRepoRoot(),
  targetDir: string = process.cwd()
): SkillFeedItem[] {
  const feed = loadSkillFeed(repoRoot, targetDir);
  const q = query.toLowerCase().trim();
  if (!q) return feed;

  return feed.filter((item) => {
    return (
      item.id.toLowerCase().includes(q) ||
      (item.name ? item.name.toLowerCase().includes(q) : false) ||
      item.pack.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.intents.some((i) => i.toLowerCase().includes(q)) ||
      item.keywords.some((k) => k.toLowerCase().includes(q)) ||
      item.gates.some((g) => g.toLowerCase().includes(q))
    );
  });
}

export function inspectSkillDetail(
  skillId: string,
  repoRoot: string = getCoreRepoRoot(),
  targetDir: string = process.cwd()
): {
  item: SkillFeedItem | null;
  instructions: string | null;
  resources: SkillResourceEntry[];
} {
  const feed = loadSkillFeed(repoRoot, targetDir);
  const item = feed.find((s) => s.id.toLowerCase() === skillId.toLowerCase()) || null;
  if (!item) return { item: null, instructions: null, resources: [] };

  let instructions: string | null = null;
  if (fs.existsSync(item.skillPath)) {
    instructions = fs.readFileSync(item.skillPath, 'utf-8');
  }

  let resources: SkillResourceEntry[] = [];
  try {
    resources = listSkillResources(item.id, repoRoot);
  } catch {}

  return { item, instructions, resources };
}
