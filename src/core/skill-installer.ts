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
import { validateSkillPackageDir } from './skill-package.js';
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


function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function safeRenameSync(source: string, target: string): void {
  const retryDelays = [20, 40, 80, 160, 200];
  let lastError: unknown;
  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    try {
      fs.renameSync(source, target);
      return;
    } catch (error) {
      lastError = error;
      const code = (error as NodeJS.ErrnoException)?.code;
      const isLockError = code === 'EEXIST' || code === 'EPERM' || code === 'EACCES' || code === 'EBUSY';
      if (!isLockError || attempt === retryDelays.length) {
        throw error;
      }
      sleepSync(retryDelays[attempt]);
    }
  }
  if (lastError) throw lastError;
}

function checkSymlinksRecursive(dirPath: string, label: string): void {
  if (!fs.existsSync(dirPath)) return;
  const stat = fs.lstatSync(dirPath);
  if (stat.isSymbolicLink()) {
    throw new Error(`Refusing ${label}: symlink detected at ${dirPath}`);
  }
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Refusing ${label}: symlink detected at ${fullPath}`);
      }
      if (entry.isDirectory()) {
        checkSymlinksRecursive(fullPath, label);
      }
    }
  }
}

function pruneUndeclaredFiles(dir: string, declaredRelativePaths: Set<string>, rootDir: string = dir): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relFromRoot = path.relative(rootDir, fullPath).split(path.sep).join('/');
    if (entry.isDirectory()) {
      pruneUndeclaredFiles(fullPath, declaredRelativePaths, rootDir);
      try {
        if (fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath);
        }
      } catch {}
    } else {
      if (!declaredRelativePaths.has(relFromRoot)) {
        try {
          fs.unlinkSync(fullPath);
        } catch {}
      }
    }
  }
}

/**
 * Universal safe recursive copy primitive for Skill Packages.
 * Validates the skill package before copying and copies only declared resources.
 */
export function copySkillDirectory(
  skillId: string,
  sourceSkillDir: string,
  destSkillDir: string,
  overwrite: boolean = true
): boolean {
  if (!fs.existsSync(sourceSkillDir)) return false;
  checkSymlinksRecursive(sourceSkillDir, `source symlink from skill package ${skillId}`);
  if (fs.existsSync(destSkillDir)) {
    checkSymlinksRecursive(destSkillDir, `destination symlink for skill package ${skillId}`);
  }

  const validation = validateSkillPackageDir(skillId, sourceSkillDir);
  if (!validation.valid || !validation.manifest) {
    const reason = (validation.errors || []).join('; ');
    throw new Error(`Refusing to install invalid skill package "${skillId}": ${reason}`);
  }

  const manifest = validation.manifest;
  const declaredRelativePaths = new Set<string>([
    'skill.package.json',
    manifest.entry,
    ...manifest.agents,
    ...manifest.references,
    ...manifest.templates,
    ...manifest.examples,
    ...manifest.evals,
    ...manifest.scripts,
  ]);

  if (skillId === 'get-fable' && fs.existsSync(path.join(sourceSkillDir, 'registry.json'))) {
    declaredRelativePaths.add('registry.json');
  }

  const destResolved = path.resolve(destSkillDir);

  if (fs.existsSync(destSkillDir) && overwrite) {
    pruneUndeclaredFiles(destSkillDir, declaredRelativePaths);
  }

  for (const relPath of declaredRelativePaths) {
    const srcPath = path.join(sourceSkillDir, ...relPath.split('/'));
    const destPath = path.join(destSkillDir, ...relPath.split('/'));

    const destPathResolved = path.resolve(destPath);
    if (!destPathResolved.startsWith(destResolved + path.sep) && destPathResolved !== destResolved) {
      throw new Error(`Destination path "${relPath}" resolves outside destination directory`);
    }

    if (!overwrite && fs.existsSync(destPath)) {
      continue;
    }

    if (!fs.existsSync(srcPath)) {
      throw new Error(`Declared resource file "${relPath}" does not exist in source: ${srcPath}`);
    }

    const srcStat = fs.lstatSync(srcPath);
    if (srcStat.isSymbolicLink() || !srcStat.isFile()) {
      throw new Error(`Declared resource "${relPath}" must be a regular file, not a symlink or directory`);
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    const mode = srcStat.mode & 0o777;
    fs.chmodSync(destPath, mode & ~0o022);
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
  checkSymlinksRecursive(sourceSkillDir, `source symlink from skill package ${skillId}`);
  if (fs.existsSync(destSkillDir)) {
    checkSymlinksRecursive(destSkillDir, `destination symlink for skill package ${skillId}`);
  }
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
      safeRenameSync(destSkillDir, backup);
      movedExisting = true;
    }
    safeRenameSync(staging, destSkillDir);
    if (movedExisting) fs.rmSync(backup, { recursive: true, force: true });
    return true;
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    if (movedExisting) {
      try {
        if (fs.existsSync(destSkillDir)) fs.rmSync(destSkillDir, { recursive: true, force: true });
        safeRenameSync(backup, destSkillDir);
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
