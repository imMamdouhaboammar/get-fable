import fs from 'node:fs';
import path from 'node:path';
import { getRepoRootDir } from '../installer.js';

function isSafeAssetName(name: string): boolean {
  return name !== '.' && name !== '..' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name);
}

export class ContextInjector {
  static getFableSystemPrompt(): string {
    const repoRoot = getRepoRootDir();
    const rulesPath = path.join(repoRoot, 'prompts', 'fable5-rules.md');
    const entrySkillPath = path.join(repoRoot, 'skills', 'get-fable', 'SKILL.md');

    const sections: string[] = [];
    if (fs.existsSync(rulesPath)) sections.push(fs.readFileSync(rulesPath, 'utf-8').trim());
    if (fs.existsSync(entrySkillPath)) sections.push(fs.readFileSync(entrySkillPath, 'utf-8').trim());

    const prompt = sections.filter(Boolean).join('\n\n');
    if (!prompt) throw new Error('No canonical Fable prompt content was found in the repository');
    return prompt;
  }

  static loadSkill(skillName: string): string | null {
    if (!isSafeAssetName(skillName)) return null;

    const repoRoot = getRepoRootDir();
    const candidates = [
      path.join(repoRoot, 'skills', skillName, 'SKILL.md'),
      path.join(repoRoot, 'assets', 'skills', 'claude-code', `${skillName}.md`),
      path.join(repoRoot, 'assets', 'skills', 'claude-design', `${skillName}.md`),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf-8');
    }

    return null;
  }

  static loadAgent(agentName: string): string | null {
    if (!isSafeAssetName(agentName)) return null;

    const repoRoot = getRepoRootDir();
    const agentPath = path.join(repoRoot, 'assets', 'agents', `${agentName}.md`);
    return fs.existsSync(agentPath) ? fs.readFileSync(agentPath, 'utf-8') : null;
  }
}
