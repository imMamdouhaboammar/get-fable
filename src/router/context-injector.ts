import fs from 'node:fs';
import path from 'node:path';
import { getRepoRootDir } from '../installer.js';

export class ContextInjector {
  /**
   * Returns the consolidated Fable 5 Mythos System Prompt
   */
  static getFableSystemPrompt(): string {
    const repoRoot = getRepoRootDir();
    const promptPath = path.join(repoRoot, 'assets', 'prompts', 'claude-code-fable-5.md');
    const rulesPath = path.join(repoRoot, 'prompts', 'fable5-rules.md');

    let fablePrompt = '';
    if (fs.existsSync(rulesPath)) {
      fablePrompt += fs.readFileSync(rulesPath, 'utf-8') + '\n\n';
    }
    if (fs.existsSync(promptPath)) {
      fablePrompt += fs.readFileSync(promptPath, 'utf-8');
    }

    return fablePrompt;
  }

  /**
   * Loads a specific skill definition by name
   */
  static loadSkill(skillName: string): string | null {
    const repoRoot = getRepoRootDir();
    const claudeCodeSkill = path.join(repoRoot, 'assets', 'skills', 'claude-code', `${skillName}.md`);
    const claudeDesignSkill = path.join(repoRoot, 'assets', 'skills', 'claude-design', `${skillName}.md`);

    if (fs.existsSync(claudeCodeSkill)) {
      return fs.readFileSync(claudeCodeSkill, 'utf-8');
    }
    if (fs.existsSync(claudeDesignSkill)) {
      return fs.readFileSync(claudeDesignSkill, 'utf-8');
    }
    return null;
  }

  /**
   * Loads a specific agent definition by name
   */
  static loadAgent(agentName: string): string | null {
    const repoRoot = getRepoRootDir();
    const agentPath = path.join(repoRoot, 'assets', 'agents', `${agentName}.md`);
    if (fs.existsSync(agentPath)) {
      return fs.readFileSync(agentPath, 'utf-8');
    }
    return null;
  }
}
