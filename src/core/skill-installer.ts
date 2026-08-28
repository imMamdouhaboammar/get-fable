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
  getGrokDir,
  getDevinDir,
  getRooDir,
  getClineDir,
  getOpenHandsDir,
  getKiloDir,
  getHermesDir,
  logInfo,
  logSuccess,
  logWarn,
} from '../utils.js';
import { loadSkillRegistry, getCoreRepoRoot, canonicalSkillIds } from './skill-registry.js';
import { FABLE_PACKS } from '../generated/skill-catalog.js';
import type { FablePack, FableSkillId, SkillRegistryEntry } from './types.js';

export interface AutoSkillInstallOptions {
  packOrSkill?: string;
  platforms?: string[];
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
    if (want('devin')) dirs.devin = path.join(getDevinDir(), 'skills');
    if (want('grok') || want('xai')) dirs.grok = path.join(getGrokDir(), 'skills');
    if (want('roocode') || want('roo')) dirs.roocode = path.join(getRooDir(), 'skills');
    if (want('cline')) dirs.cline = path.join(getClineDir(), 'skills');
    if (want('openhands')) dirs.openhands = path.join(getOpenHandsDir(), 'skills');
    if (want('opencode')) dirs.opencode = path.join(getOpenCodeDir(), 'skills');
    if (want('kilo')) dirs.kilo = path.join(getKiloDir(), 'skills');
    if (want('hermes')) dirs.hermes = path.join(getHermesDir(), 'skills');
    if (want('cursor')) dirs.cursor = path.join(getCursorDir(), 'skills');
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

  const validPacks: readonly FablePack[] = FABLE_PACKS;
  if (validPacks.includes(target as FablePack)) {
    const packSkills = registry.skills.filter((s: SkillRegistryEntry) => s.pack === target).map((s: SkillRegistryEntry) => s.id);
    return packSkills.length > 0 ? packSkills : canonicalSkillIds();
  }

  const directMatch = registry.skills.find((s: SkillRegistryEntry) => s.id.toLowerCase() === target);
  if (directMatch) {
    return [directMatch.id];
  }

  const matches = registry.skills
    .filter((s: SkillRegistryEntry) => s.id.includes(target) || s.keywords.some((k: string) => k.includes(target)))
    .map((s: SkillRegistryEntry) => s.id);

  if (matches.length > 0) return matches;
  throw new Error(`Unknown skill or pack: ${packOrSkill}`);
}


function rejectSymlinkPath(filePath: string, label: string) {
  try {
    if (fs.lstatSync(filePath).isSymbolicLink()) {
      throw new Error(`Refusing ${label}: ${filePath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return;
    throw error;
  }
}

/**
 * Universal safe recursive copy primitive for Skill Packages.
 */
export function copySkillDirectory(
  skillId: string,
  sourceSkillDir: string,
  destSkillDir: string,
  overwrite: boolean = true
): boolean {
  if (!fs.existsSync(sourceSkillDir)) return false;
  rejectSymlinkPath(sourceSkillDir, `source symlink from skill package ${skillId}`);
  rejectSymlinkPath(destSkillDir, `destination symlink for skill package ${skillId}`);
  if (!fs.existsSync(destSkillDir)) {
    fs.mkdirSync(destSkillDir, { recursive: true });
  }

  const entries = fs.readdirSync(sourceSkillDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(sourceSkillDir, entry.name);
    const destPath = path.join(destSkillDir, entry.name);
    rejectSymlinkPath(destPath, `destination symlink for skill package ${skillId}`);

    if (entry.isSymbolicLink()) {
      throw new Error(`Refusing to install symlink from skill package ${skillId}: ${srcPath}`);
    }
    if (entry.isDirectory()) {
      copySkillDirectory(skillId, srcPath, destPath, overwrite);
    } else if (entry.isFile()) {
      if (!overwrite && fs.existsSync(destPath)) continue;
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      const mode = fs.statSync(srcPath).mode & 0o777;
      fs.chmodSync(destPath, mode & ~0o022);
    } else {
      throw new Error(`Refusing to install special file from skill package ${skillId}: ${srcPath}`);
    }
  }
  return true;
}

export function installSkillDirectoryAtomic(
  skillId: string,
  sourceSkillDir: string,
  destSkillDir: string,
  overwrite: boolean = true
): boolean {
  if (!fs.existsSync(sourceSkillDir)) return false;
  rejectSymlinkPath(sourceSkillDir, `source symlink from skill package ${skillId}`);
  rejectSymlinkPath(destSkillDir, `destination symlink for skill package ${skillId}`);
  const parent = path.dirname(destSkillDir);
  fs.mkdirSync(parent, { recursive: true });
  if (!overwrite && fs.existsSync(destSkillDir)) return false;

  const nonce = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const staging = path.join(parent, `.${path.basename(destSkillDir)}.staging-${nonce}`);
  const backup = path.join(parent, `.${path.basename(destSkillDir)}.backup-${nonce}`);
  let movedExisting = false;
  try {
    copySkillDirectory(skillId, sourceSkillDir, staging, true);
    if (fs.existsSync(destSkillDir)) {
      fs.renameSync(destSkillDir, backup);
      movedExisting = true;
    }
    fs.renameSync(staging, destSkillDir);
    if (movedExisting) fs.rmSync(backup, { recursive: true, force: true });
    return true;
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    if (movedExisting) {
      try {
        if (fs.existsSync(destSkillDir)) fs.rmSync(destSkillDir, { recursive: true, force: true });
        fs.renameSync(backup, destSkillDir);
      } catch (rollbackError) {
        throw new Error(`Skill install failed and rollback also failed for ${skillId}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`, { cause: error });
      }
    }
    fs.rmSync(backup, { recursive: true, force: true });
    throw error;
  }
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

      const success = installSkillDirectoryAtomic(skillId, srcSkillDir, destSkillDir, overwrite);
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
