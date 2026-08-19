import fs from 'node:fs';
import path from 'node:path';
import { getCoreRepoRoot, canonicalSkillIds } from './skill-registry.js';
import type {
  SkillPackageManifest,
  SkillResourceEntry,
  SkillResourceType,
  SkillPackageSummary,
  SkillPackageValidationResult,
} from './types.js';

export const FABLE_SKILL_PACKAGE_SCHEMA_VERSION = 1;

export function getSkillPackageDir(id: string, repoRoot: string = getCoreRepoRoot()): string {
  return path.join(repoRoot, 'skills', id);
}

export function getSkillManifestPath(id: string, repoRoot: string = getCoreRepoRoot()): string {
  return path.join(getSkillPackageDir(id, repoRoot), 'skill.package.json');
}

export function isPathInside(targetPath: string, parentDir: string): boolean {
  const rel = path.relative(parentDir, targetPath);
  return !rel.startsWith('..') && !path.isAbsolute(rel) && rel !== '';
}

export function resolveSkillResourcePath(
  id: string,
  relativePath: string,
  repoRoot: string = getCoreRepoRoot()
): { safe: boolean; absolutePath: string; error?: string } {
  if (path.isAbsolute(relativePath)) {
    return {
      safe: false,
      absolutePath: relativePath,
      error: `Absolute resource paths are forbidden in skill packages: "${relativePath}"`,
    };
  }

  if (relativePath.includes('..')) {
    return {
      safe: false,
      absolutePath: '',
      error: `Path traversal ("..") is forbidden in skill package resources: "${relativePath}"`,
    };
  }

  const skillDir = getSkillPackageDir(id, repoRoot);
  const resolved = path.resolve(skillDir, relativePath);

  // Check prefix containment
  if (!resolved.startsWith(`${path.resolve(skillDir)}${path.sep}`) && resolved !== path.resolve(skillDir)) {
    return {
      safe: false,
      absolutePath: resolved,
      error: `Resource "${relativePath}" resolves outside skill package directory "${skillDir}"`,
    };
  }

  // Realpath symlink check if file exists
  if (fs.existsSync(resolved)) {
    try {
      const realResolved = fs.realpathSync(resolved);
      const realSkillDir = fs.realpathSync(skillDir);
      if (!realResolved.startsWith(`${realSkillDir}${path.sep}`) && realResolved !== realSkillDir) {
        return {
          safe: false,
          absolutePath: resolved,
          error: `Symlink escape detected for resource "${relativePath}" pointing to "${realResolved}"`,
        };
      }
    } catch {
      // Ignored if realpath cannot resolve
    }
  }

  return { safe: true, absolutePath: resolved };
}

export function loadSkillPackage(id: string, repoRoot: string = getCoreRepoRoot()): SkillPackageManifest {
  const manifestPath = getSkillManifestPath(id, repoRoot);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Skill package manifest not found: skills/${id}/skill.package.json`);
  }

  const raw = fs.readFileSync(manifestPath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Malformed JSON in skills/${id}/skill.package.json: ${msg}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`skills/${id}/skill.package.json must contain a JSON object`);
  }

  const obj = parsed as Record<string, unknown>;
  const rawVersion = obj.schemaVersion;
  if (rawVersion !== 1 && rawVersion !== '1' && rawVersion !== '1.0.0') {
    throw new Error(`Unsupported schemaVersion in skills/${id}/skill.package.json: ${String(rawVersion)}`);
  }
  if (obj.id !== id) {
    throw new Error(`Manifest ID mismatch: expected "${id}", found "${String(obj.id)}" in skills/${id}/skill.package.json`);
  }
  if (obj.entry !== 'SKILL.md') {
    throw new Error(`Manifest entry must be "SKILL.md", found "${String(obj.entry)}" in skills/${id}/skill.package.json`);
  }

  const parseStringArray = (field: string): string[] => {
    const val = obj[field];
    if (!Array.isArray(val)) {
      throw new Error(`Field "${field}" in skills/${id}/skill.package.json must be an array`);
    }
    for (const item of val) {
      if (typeof item !== 'string' || !item.trim()) {
        throw new Error(`Field "${field}" in skills/${id}/skill.package.json contains non-string or empty item`);
      }
    }
    return val as string[];
  };

  return {
    schemaVersion: 1,
    id,
    entry: 'SKILL.md',
    agents: parseStringArray('agents'),
    references: parseStringArray('references'),
    templates: parseStringArray('templates'),
    examples: parseStringArray('examples'),
    evals: parseStringArray('evals'),
    scripts: parseStringArray('scripts'),
  };
}

export function listSkillResources(id: string, repoRoot: string = getCoreRepoRoot()): SkillResourceEntry[] {
  const manifest = loadSkillPackage(id, repoRoot);
  const skillDir = getSkillPackageDir(id, repoRoot);
  const entries: SkillResourceEntry[] = [];

  const addResource = (type: SkillResourceType, relPath: string) => {
    const check = resolveSkillResourcePath(id, relPath, repoRoot);
    const absPath = check.safe ? check.absolutePath : path.resolve(skillDir, relPath);
    let exists = false;
    let byteSize = 0;
    if (check.safe && fs.existsSync(absPath)) {
      try {
        const st = fs.statSync(absPath);
        if (st.isFile()) {
          exists = true;
          byteSize = st.size;
        }
      } catch {}
    }

    entries.push({
      type,
      path: relPath,
      relativePath: relPath,
      absolutePath: absPath,
      byteSize,
      sizeBytes: byteSize,
      exists,
    });
  };

  addResource('entry', manifest.entry);
  for (const p of manifest.agents) addResource('agent', p);
  for (const p of manifest.references) addResource('reference', p);
  for (const p of manifest.templates) addResource('template', p);
  for (const p of manifest.examples) addResource('example', p);
  for (const p of manifest.evals) addResource('eval', p);
  for (const p of manifest.scripts) addResource('script', p);

  return entries;
}

export function readSkillResource(
  id: string,
  relativePath: string,
  repoRoot: string = getCoreRepoRoot()
): string {
  const check = resolveSkillResourcePath(id, relativePath, repoRoot);
  if (!check.safe) {
    throw new Error(`Security restriction: ${check.error}`);
  }

  if (!fs.existsSync(check.absolutePath)) {
    throw new Error(`Resource "${relativePath}" not found in skill package "${id}"`);
  }

  const st = fs.statSync(check.absolutePath);
  if (!st.isFile()) {
    throw new Error(`Resource "${relativePath}" in skill package "${id}" is not a file`);
  }

  return fs.readFileSync(check.absolutePath, 'utf-8');
}

export function validateSkillPackage(
  id: string,
  repoRoot: string = getCoreRepoRoot()
): SkillPackageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const resources: SkillResourceEntry[] = [];
  const skillDir = getSkillPackageDir(id, repoRoot);

  if (!fs.existsSync(skillDir)) {
    errors.push(`Skill directory missing: skills/${id}`);
    return { id, valid: false, errors, warnings, resources };
  }

  const manifestPath = getSkillManifestPath(id, repoRoot);
  if (!fs.existsSync(manifestPath)) {
    errors.push(`Skill package manifest missing: skills/${id}/skill.package.json`);
    return { id, valid: false, errors, warnings, resources };
  }

  let manifest: SkillPackageManifest;
  try {
    manifest = loadSkillPackage(id, repoRoot);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    return { id, valid: false, errors, warnings, resources };
  }

  // Validate Entry
  const entryCheck = resolveSkillResourcePath(id, manifest.entry, repoRoot);
  if (!entryCheck.safe) {
    errors.push(`Unsafe entry path: ${entryCheck.error}`);
  } else if (!fs.existsSync(entryCheck.absolutePath)) {
    errors.push(`Skill entry file missing: skills/${id}/${manifest.entry}`);
  } else {
    const st = fs.statSync(entryCheck.absolutePath);
    if (!st.isFile()) {
      errors.push(`Skill entry is not a file: skills/${id}/${manifest.entry}`);
    } else if (st.size === 0) {
      errors.push(`Skill entry file is empty (0 bytes): skills/${id}/${manifest.entry}`);
    } else {
      resources.push({
        type: 'entry',
        path: manifest.entry,
        relativePath: manifest.entry,
        absolutePath: entryCheck.absolutePath,
        byteSize: st.size,
        sizeBytes: st.size,
        exists: true,
      });
    }
  }

  const seenPaths = new Set<string>();
  seenPaths.add(manifest.entry);

  const validateGroup = (type: SkillResourceType, list: string[], prefix: string) => {
    for (const relPath of list) {
      if (seenPaths.has(relPath)) {
        errors.push(`Duplicate resource path in skills/${id}/skill.package.json: ${relPath}`);
        continue;
      }
      seenPaths.add(relPath);

      if (!relPath.startsWith(prefix)) {
        errors.push(`Resource "${relPath}" in group "${type}" does not start with expected prefix "${prefix}"`);
      }

      const check = resolveSkillResourcePath(id, relPath, repoRoot);
      if (!check.safe) {
        errors.push(`Unsafe resource path "${relPath}": ${check.error}`);
        continue;
      }

      if (!fs.existsSync(check.absolutePath)) {
        errors.push(`Referenced resource missing: skills/${id}/${relPath}`);
        continue;
      }

      const st = fs.statSync(check.absolutePath);
      if (!st.isFile()) {
        errors.push(`Referenced resource is not a file: skills/${id}/${relPath}`);
        continue;
      }

      if (st.size === 0) {
        errors.push(`Referenced resource is empty (0 bytes): skills/${id}/${relPath}`);
        continue;
      }

      resources.push({
        type,
        path: relPath,
        relativePath: relPath,
        absolutePath: check.absolutePath,
        byteSize: st.size,
        sizeBytes: st.size,
        exists: true,
      });

      // YAML / Agent check
      if (type === 'agent' && (relPath.endsWith('.yaml') || relPath.endsWith('.yml'))) {
        try {
          const content = fs.readFileSync(check.absolutePath, 'utf-8');
          const rawPromptLines = content.split('\n');
          const promptIdx = rawPromptLines.findIndex((l) => /^\s*default_prompt:/.test(l));
          if (promptIdx !== -1) {
            const line = rawPromptLines[promptIdx];
            const afterColon = line.replace(/^\s*default_prompt:\s*/, '').trim();
            if (!afterColon) {
              const nextLine = rawPromptLines[promptIdx + 1];
              if (nextLine && /^\s+/.test(nextLine)) {
                errors.push(`Agent ${relPath} default_prompt must be a string, not an object or array`);
              }
            } else if (afterColon.startsWith('[') || afterColon.startsWith('{')) {
              errors.push(`Agent ${relPath} default_prompt must be a string, not an object or array`);
            }
          }
        } catch (e) {
          errors.push(`Failed to read agent YAML ${relPath}: ${e}`);
        }
      }

      // Eval scenarios check
      if (type === 'eval' && relPath.endsWith('.json')) {
        try {
          const content = fs.readFileSync(check.absolutePath, 'utf-8');
          const parsed = JSON.parse(content);
          const scenarios = Array.isArray(parsed) ? parsed : (parsed as any).scenarios;
          if (!Array.isArray(scenarios) || scenarios.length === 0) {
            errors.push(`Eval file ${relPath} must contain a non-empty array of scenarios`);
          } else {
            for (let i = 0; i < scenarios.length; i++) {
              const sc = scenarios[i];
              if (!sc || typeof sc !== 'object' || typeof sc.id !== 'string') {
                errors.push(`Scenario [${i}] in ${relPath} is missing string id`);
              }
            }
          }
        } catch (e) {
          errors.push(`Failed to parse eval JSON in ${relPath}: ${e}`);
        }
      }
    }
  };

  validateGroup('agent', manifest.agents, 'agents/');
  validateGroup('reference', manifest.references, 'references/');
  validateGroup('template', manifest.templates, 'templates/');
  validateGroup('example', manifest.examples, 'examples/');
  validateGroup('eval', manifest.evals, 'evals/');
  validateGroup('script', manifest.scripts, 'scripts/');

  return {
    id,
    valid: errors.length === 0,
    errors,
    warnings,
    manifest,
    resources,
  };
}

export function getSkillPackageSummary(
  id: string,
  repoRoot: string = getCoreRepoRoot()
): SkillPackageSummary {
  const result = validateSkillPackage(id, repoRoot);
  const manifest = result.manifest;

  return {
    id,
    valid: result.valid,
    entryExists: result.resources.some((r) => r.type === 'entry' && r.exists),
    agentCount: manifest ? manifest.agents.length : 0,
    referenceCount: manifest ? manifest.references.length : 0,
    templateCount: manifest ? manifest.templates.length : 0,
    exampleCount: manifest ? manifest.examples.length : 0,
    evalCount: manifest ? manifest.evals.length : 0,
    scriptCount: manifest ? manifest.scripts.length : 0,
    totalResources: result.resources.length,
    resources: result.resources,
    errors: result.errors,
  };
}

export function loadAllSkillPackages(
  repoRoot: string = getCoreRepoRoot()
): Record<string, SkillPackageManifest> {
  const record: Record<string, SkillPackageManifest> = {};
  for (const id of canonicalSkillIds()) {
    const manifestPath = getSkillManifestPath(id, repoRoot);
    if (fs.existsSync(manifestPath)) {
      record[id] = loadSkillPackage(id, repoRoot);
    }
  }
  return record;
}

export function validateAllSkillPackages(
  repoRoot: string = getCoreRepoRoot()
): Record<string, SkillPackageValidationResult> {
  const results: Record<string, SkillPackageValidationResult> = {};
  for (const id of canonicalSkillIds()) {
    results[id] = validateSkillPackage(id, repoRoot);
  }
  return results;
}
