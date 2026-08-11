import fs from 'node:fs';
import path from 'node:path';
import { getRepoRootDir } from './installer.js';

export interface AssetSummary {
  promptsCount: number;
  agentsCount: number;
  claudeCodeSkillsCount: number;
  claudeDesignSkillsCount: number;
  slashCommandsCount: number;
  remindersCount: number;
  starterComponentsCount: number;
}

export class AssetsManager {
  static getAssetsDir(): string {
    return path.join(getRepoRootDir(), 'assets');
  }

  static getSummary(): AssetSummary {
    const base = this.getAssetsDir();
    const countItems = (dir: string) => (fs.existsSync(dir) ? fs.readdirSync(dir).length : 0);

    return {
      promptsCount: countItems(path.join(base, 'prompts')),
      agentsCount: countItems(path.join(base, 'agents')),
      claudeCodeSkillsCount: countItems(path.join(base, 'skills', 'claude-code')),
      claudeDesignSkillsCount: countItems(path.join(base, 'skills', 'claude-design')),
      slashCommandsCount: countItems(path.join(base, 'slash-commands')),
      remindersCount: countItems(path.join(base, 'injected-reminders')),
      starterComponentsCount: countItems(path.join(base, 'starter-components')),
    };
  }

  static getPrompt(name: string): string | null {
    const base = this.getAssetsDir();
    const promptPath = path.join(base, 'prompts', `${name}.md`);
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf-8');
    }
    return null;
  }

  static listSkills(): { category: string; name: string }[] {
    const base = this.getAssetsDir();
    const results: { category: string; name: string }[] = [];

    for (const cat of ['claude-code', 'claude-design']) {
      const catDir = path.join(base, 'skills', cat);
      if (fs.existsSync(catDir)) {
        const skills = fs.readdirSync(catDir);
        for (const s of skills) {
          results.push({ category: cat, name: s });
        }
      }
    }
    return results;
  }

  static listAgents(): string[] {
    const base = this.getAssetsDir();
    const agentsDir = path.join(base, 'agents');
    if (fs.existsSync(agentsDir)) {
      return fs.readdirSync(agentsDir).map((f) => f.replace('.md', ''));
    }
    return [];
  }
}
