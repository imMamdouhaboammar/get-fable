import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  atomicWriteFileSync,
  getClaudeDir,
  getGeminiConfigDir,
  getAgentKernelDir,
  getCodexDir,
  getCursorDir,
  getOpenCodeDir,
  getKimiDir,
  getDeepSeekDir,
  getKiroDir,
  getPiDir,
  logInfo,
  logSuccess,
  logWarn,
  colors,
} from '../utils.js';
import { loadSkillRegistry, getCoreRepoRoot, canonicalSkillIds } from './skill-registry.js';
import type { FablePack, FableSkillId } from './types.js';

export interface AutoSkillInstallOptions {
  packOrSkill?: string; // 'all', 'core', 'intelligence', 'build', 'proof', 'delivery', 'evolution', or specific skill ID
  platforms?: string[]; // ['claude', 'codex', 'antigravity', 'cursor', 'opencode', 'kimi', 'deepseek', 'kiro', 'pi', 'agent-kernel', 'project']
  global?: boolean;
  repoRoot?: string;
  projectDir?: string;
  overwrite?: boolean;
}

export interface SkillInstallResult {
  installedSkills: string[];
  targetPaths: string[];
  totalInstalled: number;
  success: boolean;
}

export function getPlatformSkillsDirs(
  platforms: string[] = ['all'],
  global: boolean = true,
  projectDir: string = process.cwd()
): Record<string, string> {
  const dirs: Record<string, string> = {};
  const want = (name: string) => platforms.includes('all') || platforms.includes(name);

  if (global) {
    if (want('claude')) dirs.claude = path.join(getClaudeDir(), 'skills');
    if (want('codex')) dirs.codex = path.join(getCodexDir(), 'skills');
    if (want('antigravity') || want('gemini')) dirs.antigravity = path.join(getGeminiConfigDir(), 'skills');
    if (want('cursor')) dirs.cursor = path.join(getCursorDir(), 'skills');
    if (want('opencode')) dirs.opencode = path.join(getOpenCodeDir(), 'skills');
    if (want('kimi')) dirs.kimi = path.join(getKimiDir(), 'skills');
    if (want('deepseek')) dirs.deepseek = path.join(getDeepSeekDir(), 'skills');
    if (want('kiro')) dirs.kiro = path.join(getKiroDir(), 'skills');
    if (want('pi')) dirs.pi = path.join(getPiDir(), 'skills');
    if (want('agent-kernel')) {
      dirs.agentKernel = path.join(getAgentKernelDir(), 'skills');
      dirs.globalAgents = path.join(os.homedir(), '.agents', 'skills');
    }
  }

  if (want('project')) {
    dirs.project = path.join(projectDir, '.agents', 'skills');
  }

  return dirs;
}

export function resolveSkillsToInstall(
  packOrSkill: string = 'all',
  repoRoot: string = getCoreRepoRoot()
): string[] {
  const registry = loadSkillRegistry(repoRoot);
  const target = packOrSkill.toLowerCase().trim();

  if (target === 'all' || target === '') {
    return canonicalSkillIds();
  }

  // Check if it matches a pack name
  const validPacks: FablePack[] = [
    'core',
    'intelligence',
    'build',
    'proof',
    'delivery',
    'evolution',
    'system',
  ];
  if (validPacks.includes(target as FablePack)) {
    const packSkills = registry.skills.filter((s) => s.pack === target).map((s) => s.id);
    return packSkills.length > 0 ? packSkills : canonicalSkillIds();
  }

  // Check if it is a specific skill ID
  const directMatch = registry.skills.find((s) => s.id.toLowerCase() === target);
  if (directMatch) {
    return [directMatch.id];
  }

  // Fallback: match by prefix or keyword
  const matches = registry.skills
    .filter((s) => s.id.includes(target) || s.keywords.some((k) => k.includes(target)))
    .map((s) => s.id);

  return matches.length > 0 ? matches : canonicalSkillIds();
}

export function copySkillDirectory(
  skillId: string,
  sourceSkillDir: string,
  destSkillDir: string,
  overwrite: boolean = true
): boolean {
  if (!fs.existsSync(sourceSkillDir)) return false;
  if (!fs.existsSync(destSkillDir)) {
    fs.mkdirSync(destSkillDir, { recursive: true });
  }

  const entries = fs.readdirSync(sourceSkillDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(sourceSkillDir, entry.name);
    const destPath = path.join(destSkillDir, entry.name);

    if (entry.isDirectory()) {
      copySkillDirectory(skillId, srcPath, destPath, overwrite);
    } else if (entry.isFile()) {
      if (!overwrite && fs.existsSync(destPath)) continue;
      atomicWriteFileSync(destPath, fs.readFileSync(srcPath, 'utf-8'));
    }
  }
  return true;
}

export function autoInstallSkills(options: AutoSkillInstallOptions = {}): SkillInstallResult {
  const repoRoot = options.repoRoot || getCoreRepoRoot();
  const packOrSkill = options.packOrSkill || 'all';
  const platforms = options.platforms || ['all'];
  const global = options.global !== undefined ? options.global : true;
  const overwrite = options.overwrite !== undefined ? options.overwrite : true;
  const projectDir = options.projectDir || process.cwd();

  const skills = resolveSkillsToInstall(packOrSkill, repoRoot);
  const targetDirs = getPlatformSkillsDirs(platforms, global, projectDir);

  const installedSkills: string[] = [];
  const targetPaths: string[] = [];

  for (const [platformName, destDir] of Object.entries(targetDirs)) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    for (const skillId of skills) {
      const srcSkillDir = path.join(repoRoot, 'skills', skillId);
      const destSkillDir = path.join(destDir, skillId);

      const success = copySkillDirectory(skillId, srcSkillDir, destSkillDir, overwrite);
      if (success) {
        if (!installedSkills.includes(skillId)) installedSkills.push(skillId);
        targetPaths.push(destSkillDir);
      }
    }
  }

  return {
    installedSkills,
    targetPaths,
    totalInstalled: installedSkills.length,
    success: installedSkills.length > 0,
  };
}
