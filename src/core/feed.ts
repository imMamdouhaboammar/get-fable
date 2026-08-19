import fs from 'node:fs';
import path from 'node:path';
import { loadSkillRegistry, getCoreRepoRoot } from './skill-registry.js';

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
}

export function loadSkillFeed(repoRoot: string = getCoreRepoRoot(), targetDir: string = process.cwd()): SkillFeedItem[] {
  const registry = loadSkillRegistry(repoRoot);
  const items: SkillFeedItem[] = [];

  for (const skill of registry.skills) {
    const localSkillPath = path.join(repoRoot, 'skills', skill.id, 'SKILL.md');
    const projectSkillPath = path.join(targetDir, '.agents', 'skills', skill.id, 'SKILL.md');
    const isInstalled = fs.existsSync(localSkillPath) || fs.existsSync(projectSkillPath);

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
): { item: SkillFeedItem | null; instructions: string | null } {
  const feed = loadSkillFeed(repoRoot, targetDir);
  const item = feed.find((s) => s.id.toLowerCase() === skillId.toLowerCase()) || null;
  if (!item) return { item: null, instructions: null };

  let instructions: string | null = null;
  if (fs.existsSync(item.skillPath)) {
    instructions = fs.readFileSync(item.skillPath, 'utf-8');
  }

  return { item, instructions };
}
