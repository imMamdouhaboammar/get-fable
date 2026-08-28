import fs from 'node:fs';
import path from 'node:path';
import { canonicalSkillIds, getCoreRepoRoot } from './skill-registry.js';
import type {
  SkillPackageManifest,
  SkillPackageSummary,
  SkillPackageValidationResult,
  SkillResourceEntry,
  SkillResourceType,
} from './types.js';

export const FABLE_SKILL_PACKAGE_SCHEMA_VERSION = 2 as const;
export const SKILL_PACKAGE_LIMITS = {
  maxManifestBytes: 256 * 1024,
  maxResourceBytes: 1024 * 1024,
  maxTotalBytes: 8 * 1024 * 1024,
  maxResources: 128,
  maxDepth: 8,
} as const;

const MANIFEST_FIELDS = new Set([
  '$schema', 'schemaVersion', 'id', 'entry', 'agents', 'references',
  'templates', 'examples', 'evals', 'scripts', 'scriptPolicy',
]);
const REQUIRED_FIELDS = [
  'schemaVersion', 'id', 'entry', 'agents', 'references', 'templates',
  'examples', 'evals', 'scripts', 'scriptPolicy',
] as const;
const EXTENSIONS: Record<SkillResourceType, Set<string>> = {
  entry: new Set(['.md']),
  agent: new Set(['.yaml', '.yml', '.json']),
  reference: new Set(['.md', '.json', '.yaml', '.yml', '.txt']),
  template: new Set(['.md', '.json', '.yaml', '.yml', '.ts', '.js', '.txt']),
  example: new Set(['.md', '.json', '.yaml', '.yml', '.ts', '.js', '.txt']),
  eval: new Set(['.json', '.yaml', '.yml']),
  script: new Set(['.sh', '.bash', '.py', '.js', '.mjs', '.ts']),
};

export function getSkillPackageDir(id: string, repoRoot: string = getCoreRepoRoot()): string {
  return path.join(repoRoot, 'skills', id);
}

export function getSkillManifestPath(id: string, repoRoot: string = getCoreRepoRoot()): string {
  return path.join(getSkillPackageDir(id, repoRoot), 'skill.package.json');
}

export function isPathInside(targetPath: string, parentDir: string): boolean {
  const rel = path.relative(parentDir, targetPath);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

function pathPolicy(relativePath: string): { safe: boolean; segments: string[]; error?: string } {
  if (!relativePath || relativePath.includes('\0')) return { safe: false, segments: [], error: 'Resource path must be a non-empty path without NUL bytes' };
  if (path.posix.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)) {
    return { safe: false, segments: [], error: `Absolute resource paths are forbidden: "${relativePath}"` };
  }
  let decoded = relativePath;
  try { decoded = decodeURIComponent(relativePath); }
  catch { return { safe: false, segments: [], error: `Malformed percent encoding in resource path: "${relativePath}"` }; }

  for (const candidate of [relativePath, decoded]) {
    const normalized = candidate.replace(/\\/g, '/');
    if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
      return { safe: false, segments: [], error: `Absolute resource paths are forbidden: "${relativePath}"` };
    }
    const segments = normalized.split('/');
    if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
      return { safe: false, segments: [], error: `Unsafe path segment in skill package resource: "${relativePath}"` };
    }
    if (segments.length > SKILL_PACKAGE_LIMITS.maxDepth) {
      return { safe: false, segments: [], error: `Resource path exceeds maximum nesting depth ${SKILL_PACKAGE_LIMITS.maxDepth}: "${relativePath}"` };
    }
  }
  if (relativePath.includes('\\')) {
    return { safe: false, segments: [], error: `Backslash separators are forbidden in portable skill package paths: "${relativePath}"` };
  }
  return { safe: true, segments: relativePath.split('/') };
}

function symlinkSegment(baseDir: string, segments: string[]): string | null {
  let current = baseDir;
  for (const segment of segments) {
    current = path.join(current, segment);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) return current;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT' || code === 'ENOTDIR') return null;
      throw error;
    }
  }
  return null;
}

export function resolveSkillResourcePath(
  id: string,
  relativePath: string,
  repoRoot: string = getCoreRepoRoot()
): { safe: boolean; absolutePath: string; error?: string } {
  const policy = pathPolicy(relativePath);
  const skillDir = getSkillPackageDir(id, repoRoot);
  if (!policy.safe) return { safe: false, absolutePath: '', error: policy.error };
  const resolved = path.resolve(skillDir, ...policy.segments);
  if (!isPathInside(resolved, path.resolve(skillDir))) {
    return { safe: false, absolutePath: resolved, error: `Resource resolves outside skill package directory: "${relativePath}"` };
  }
  const link = symlinkSegment(skillDir, policy.segments);
  if (link) return { safe: false, absolutePath: resolved, error: `Symlink resources are forbidden: "${relativePath}"` };

  try {
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink()) return { safe: false, absolutePath: resolved, error: `Symlink resources are forbidden: "${relativePath}"` };
    const realSkill = fs.realpathSync(skillDir);
    const realResource = fs.realpathSync(resolved);
    if (!isPathInside(realResource, realSkill)) {
      return { safe: false, absolutePath: resolved, error: `Resource realpath escapes skill package: "${relativePath}"` };
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT' && code !== 'ENOTDIR') {
      return { safe: false, absolutePath: resolved, error: `Unable to verify resource path safely: "${relativePath}" (${code || 'unknown'})` };
    }
  }
  return { safe: true, absolutePath: resolved };
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must contain a JSON object`);
  return value as Record<string, unknown>;
}

function parseStringArray(obj: Record<string, unknown>, field: string): string[] {
  const value = obj[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error(`Field "${field}" must be an array of non-empty strings`);
  }
  if (new Set(value).size !== value.length) throw new Error(`Field "${field}" contains duplicate resource paths`);
  return value as string[];
}

function parseManifestObject(id: string, value: unknown): SkillPackageManifest {
  const obj = asObject(value, `skills/${id}/skill.package.json`);
  for (const field of Object.keys(obj)) {
    if (!MANIFEST_FIELDS.has(field)) throw new Error(`Unknown field "${field}" in skills/${id}/skill.package.json`);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj)) throw new Error(`Missing required field "${field}" in skills/${id}/skill.package.json`);
  }
  if (obj.schemaVersion !== FABLE_SKILL_PACKAGE_SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion in skills/${id}/skill.package.json: ${String(obj.schemaVersion)}; current is ${FABLE_SKILL_PACKAGE_SCHEMA_VERSION}`);
  }
  if (obj.id !== id || typeof obj.id !== 'string' || !/^[a-z0-9-]+$/.test(obj.id)) {
    throw new Error(`Manifest ID mismatch or invalid ID for skills/${id}/skill.package.json`);
  }
  if (obj.entry !== 'SKILL.md') throw new Error(`Manifest entry must be "SKILL.md" in skills/${id}/skill.package.json`);
  if (obj.scriptPolicy !== 'data-only') throw new Error(`scriptPolicy must be "data-only" in skills/${id}/skill.package.json`);
  const manifest: SkillPackageManifest = {
    schemaVersion: 2,
    id,
    entry: 'SKILL.md',
    agents: parseStringArray(obj, 'agents'),
    references: parseStringArray(obj, 'references'),
    templates: parseStringArray(obj, 'templates'),
    examples: parseStringArray(obj, 'examples'),
    evals: parseStringArray(obj, 'evals'),
    scripts: parseStringArray(obj, 'scripts'),
    scriptPolicy: 'data-only',
  };
  const all = [manifest.entry, ...manifest.agents, ...manifest.references, ...manifest.templates, ...manifest.examples, ...manifest.evals, ...manifest.scripts];
  if (all.length > SKILL_PACKAGE_LIMITS.maxResources) throw new Error(`Skill package resource count ${all.length} exceeds maximum ${SKILL_PACKAGE_LIMITS.maxResources}`);
  if (new Set(all).size !== all.length) throw new Error('Duplicate resource path across skill package categories');
  return manifest;
}

export function migrateSkillPackageManifestV1(value: unknown): SkillPackageManifest {
  const obj = asObject(value, 'Legacy skill package manifest');
  if (obj.schemaVersion !== 1) throw new Error('Only schemaVersion 1 can be migrated to Skill Package v2');
  const id = typeof obj.id === 'string' ? obj.id : '';
  return parseManifestObject(id, { ...obj, schemaVersion: 2, scriptPolicy: 'data-only' });
}

export function loadSkillPackage(id: string, repoRoot: string = getCoreRepoRoot()): SkillPackageManifest {
  const manifestPath = getSkillManifestPath(id, repoRoot);
  if (!fs.existsSync(manifestPath)) throw new Error(`Skill package manifest not found: skills/${id}/skill.package.json`);
  const stat = fs.statSync(manifestPath);
  if (!stat.isFile()) throw new Error(`Skill package manifest is not a file: skills/${id}/skill.package.json`);
  if (stat.size > SKILL_PACKAGE_LIMITS.maxManifestBytes) throw new Error(`Skill package manifest exceeds ${SKILL_PACKAGE_LIMITS.maxManifestBytes} bytes`);
  let parsed: unknown;
  try { parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); }
  catch (error) { throw new Error(`Malformed JSON in skills/${id}/skill.package.json: ${error instanceof Error ? error.message : String(error)}`); }
  return parseManifestObject(id, parsed);
}

function declaredResources(manifest: SkillPackageManifest): Array<[SkillResourceType, string, string]> {
  return [
    ['entry', manifest.entry, ''],
    ...manifest.agents.map((p) => ['agent', p, 'agents/'] as [SkillResourceType, string, string]),
    ...manifest.references.map((p) => ['reference', p, 'references/'] as [SkillResourceType, string, string]),
    ...manifest.templates.map((p) => ['template', p, 'templates/'] as [SkillResourceType, string, string]),
    ...manifest.examples.map((p) => ['example', p, 'examples/'] as [SkillResourceType, string, string]),
    ...manifest.evals.map((p) => ['eval', p, 'evals/'] as [SkillResourceType, string, string]),
    ...manifest.scripts.map((p) => ['script', p, 'scripts/'] as [SkillResourceType, string, string]),
  ];
}

function resourceEntry(id: string, type: SkillResourceType, relPath: string, repoRoot: string): SkillResourceEntry {
  const check = resolveSkillResourcePath(id, relPath, repoRoot);
  let exists = false;
  let byteSize = 0;
  if (check.safe) {
    try {
      const stat = fs.lstatSync(check.absolutePath);
      exists = stat.isFile() && !stat.isSymbolicLink();
      if (exists) byteSize = stat.size;
    } catch {}
  }
  return { type, path: relPath, relativePath: relPath, absolutePath: check.absolutePath, byteSize, sizeBytes: byteSize, exists };
}

export function listSkillResources(id: string, repoRoot: string = getCoreRepoRoot()): SkillResourceEntry[] {
  const manifest = loadSkillPackage(id, repoRoot);
  return declaredResources(manifest).map(([type, relPath]) => resourceEntry(id, type, relPath, repoRoot));
}

export function readSkillResource(id: string, relativePath: string, repoRoot: string = getCoreRepoRoot()): string {
  const manifest = loadSkillPackage(id, repoRoot);
  const declared = new Set(declaredResources(manifest).map(([, resource]) => resource));
  if (!declared.has(relativePath)) throw new Error(`Resource "${relativePath}" is not declared by skill package "${id}"`);
  const check = resolveSkillResourcePath(id, relativePath, repoRoot);
  if (!check.safe) throw new Error(`Security restriction: ${check.error}`);
  const stat = fs.lstatSync(check.absolutePath);
  if (stat.isSymbolicLink()) throw new Error(`Resource "${relativePath}" is a symlink`);
  if (!stat.isFile()) throw new Error(`Resource "${relativePath}" is not a file`);
  if (stat.size > SKILL_PACKAGE_LIMITS.maxResourceBytes) throw new Error(`Resource "${relativePath}" exceeds maximum size`);
  const noFollow = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
  const fd = fs.openSync(check.absolutePath, fs.constants.O_RDONLY | noFollow);
  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.size > SKILL_PACKAGE_LIMITS.maxResourceBytes) throw new Error(`Resource "${relativePath}" changed during secure open`);
    return fs.readFileSync(fd, 'utf-8');
  } finally { fs.closeSync(fd); }
}

function validateStructuredResource(type: SkillResourceType, relPath: string, absolutePath: string, errors: string[]) {
  if (type === 'agent' && /\.ya?ml$/i.test(relPath)) {
    try {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const lines = content.split('\n');
      const index = lines.findIndex((line) => /^\s*default_prompt:/.test(line));
      if (index >= 0) {
        const after = lines[index].replace(/^\s*default_prompt:\s*/, '').trim();
        if ((!after && lines[index + 1] && /^\s+/.test(lines[index + 1])) || after.startsWith('[') || after.startsWith('{')) {
          errors.push(`Agent ${relPath} default_prompt must be a string, not an object or array`);
        }
      }
      const hasDisplayName = lines.some((line) => /^\s*display_name:\s*\S+/.test(line));
      if (!hasDisplayName) {
        errors.push(`Agent ${relPath} interface.display_name is required and must not be empty`);
      }
      const hasShortDescription = lines.some((line) => /^\s*short_description:\s*\S+/.test(line));
      if (!hasShortDescription) {
        errors.push(`Agent ${relPath} interface.short_description is required and must not be empty`);
      }
    } catch (error) { errors.push(`Failed to read agent YAML ${relPath}: ${error}`); }
  }
  if (type === 'eval' && relPath.endsWith('.json')) {
    try {
      const parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
      const scenarios = Array.isArray(parsed) ? parsed : parsed?.scenarios;
      if (!Array.isArray(scenarios) || scenarios.length === 0) errors.push(`Eval file ${relPath} must contain a non-empty array of scenarios`);
      else scenarios.forEach((scenario: any, index: number) => {
        if (!scenario || typeof scenario !== 'object' || typeof scenario.id !== 'string') errors.push(`Scenario [${index}] in ${relPath} is missing string id`);
      });
    } catch (error) { errors.push(`Failed to parse eval JSON in ${relPath}: ${error}`); }
  }
}

export function validateSkillPackage(id: string, repoRoot: string = getCoreRepoRoot()): SkillPackageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const resources: SkillResourceEntry[] = [];
  const skillDir = getSkillPackageDir(id, repoRoot);
  if (!fs.existsSync(skillDir)) return { id, valid: false, errors: [`Skill directory missing: skills/${id}`], warnings, resources };
  let manifest: SkillPackageManifest;
  try { manifest = loadSkillPackage(id, repoRoot); }
  catch (error) { return { id, valid: false, errors: [error instanceof Error ? error.message : String(error)], warnings, resources }; }

  let totalBytes = 0;
  for (const [type, relPath, prefix] of declaredResources(manifest)) {
    if (prefix && !relPath.startsWith(prefix)) errors.push(`Resource "${relPath}" in group "${type}" must start with "${prefix}"`);
    if (!EXTENSIONS[type].has(path.extname(relPath).toLowerCase())) errors.push(`Resource "${relPath}" has an invalid extension for category "${type}"`);
    const check = resolveSkillResourcePath(id, relPath, repoRoot);
    if (!check.safe) { errors.push(`Unsafe resource path "${relPath}": ${check.error}`); continue; }
    let stat: fs.Stats;
    try { stat = fs.lstatSync(check.absolutePath); }
    catch { errors.push(`Referenced resource missing: skills/${id}/${relPath}`); continue; }
    if (stat.isSymbolicLink()) { errors.push(`Referenced resource is a symlink: skills/${id}/${relPath}`); continue; }
    if (!stat.isFile()) { errors.push(`Referenced resource is not a regular file: skills/${id}/${relPath}`); continue; }
    if (stat.size === 0) { errors.push(`Referenced resource is empty: skills/${id}/${relPath}`); continue; }
    if (stat.size > SKILL_PACKAGE_LIMITS.maxResourceBytes) { errors.push(`Resource ${relPath} exceeds maximum size ${SKILL_PACKAGE_LIMITS.maxResourceBytes} bytes`); continue; }
    totalBytes += stat.size;
    resources.push({ type, path: relPath, relativePath: relPath, absolutePath: check.absolutePath, byteSize: stat.size, sizeBytes: stat.size, exists: true });
    validateStructuredResource(type, relPath, check.absolutePath, errors);
  }
  if (totalBytes > SKILL_PACKAGE_LIMITS.maxTotalBytes) errors.push(`Skill package total resource size exceeds ${SKILL_PACKAGE_LIMITS.maxTotalBytes} bytes`);
  return { id, valid: errors.length === 0, errors, warnings, manifest, resources };
}

export function getSkillPackageSummary(id: string, repoRoot: string = getCoreRepoRoot()): SkillPackageSummary {
  const result = validateSkillPackage(id, repoRoot);
  const manifest = result.manifest;
  return {
    id,
    valid: result.valid,
    entryExists: result.resources.some((resource) => resource.type === 'entry' && resource.exists),
    agentCount: manifest?.agents.length || 0,
    referenceCount: manifest?.references.length || 0,
    templateCount: manifest?.templates.length || 0,
    exampleCount: manifest?.examples.length || 0,
    evalCount: manifest?.evals.length || 0,
    scriptCount: manifest?.scripts.length || 0,
    totalResources: result.resources.length,
    resources: result.resources,
    errors: result.errors,
  };
}

export function loadAllSkillPackages(repoRoot: string = getCoreRepoRoot()): Record<string, SkillPackageManifest> {
  return Object.fromEntries(canonicalSkillIds().filter((id) => fs.existsSync(getSkillManifestPath(id, repoRoot))).map((id) => [id, loadSkillPackage(id, repoRoot)]));
}

export function validateAllSkillPackages(repoRoot: string = getCoreRepoRoot()): Record<string, SkillPackageValidationResult> {
  return Object.fromEntries(canonicalSkillIds().map((id) => [id, validateSkillPackage(id, repoRoot)]));
}
