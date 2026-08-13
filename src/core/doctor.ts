import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalSkillIds, getCoreRepoRoot, loadSkillRegistry } from './skill-registry.js';
import { readFableState } from './state.js';
import type { DoctorCheck, DoctorReport } from './types.js';

function check(id: string, status: DoctorCheck['status'], message: string): DoctorCheck {
  return { id, status, message };
}

function isSquareSvg(filePath: string): boolean {
  const svg = fs.readFileSync(filePath, 'utf-8');
  const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const values = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (values.length === 4 && values.every(Number.isFinite)) {
      return values[2] > 0 && values[2] === values[3];
    }
  }

  const width = svg.match(/\bwidth=["']([0-9.]+)(?:px)?["']/i);
  const height = svg.match(/\bheight=["']([0-9.]+)(?:px)?["']/i);
  return Boolean(width && height && Number(width[1]) > 0 && Number(width[1]) === Number(height[1]));
}

function validatePluginPackage(repoRoot: string): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const pluginManifest = path.join(repoRoot, '.codex-plugin', 'plugin.json');

  if (!fs.existsSync(pluginManifest)) {
    return [check('plugin-manifest', 'error', '.codex-plugin/plugin.json is missing')];
  }

  checks.push(check('plugin-manifest', 'pass', '.codex-plugin/plugin.json is present'));

  try {
    const manifest = JSON.parse(fs.readFileSync(pluginManifest, 'utf-8')) as Record<string, any>;
    const requiredAssets = ['logo', 'composerIcon'] as const;
    const failures: string[] = [];

    for (const key of requiredAssets) {
      const assetRef = manifest.interface?.[key];
      if (typeof assetRef !== 'string' || !assetRef.startsWith('./')) {
        failures.push(`interface.${key} must reference a package-relative asset`);
        continue;
      }

      const relativePath = assetRef.slice(2);
      const assetPath = path.resolve(repoRoot, relativePath);
      if (!assetPath.startsWith(`${path.resolve(repoRoot)}${path.sep}`) || !fs.existsSync(assetPath)) {
        failures.push(`interface.${key} asset is missing`);
        continue;
      }

      const extension = path.extname(assetPath).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(extension)) {
        failures.push(`interface.${key} uses an unsupported image format`);
        continue;
      }

      if (extension === '.svg' && !isSquareSvg(assetPath)) {
        failures.push(`interface.${key} SVG must be square`);
      }
    }

    checks.push(
      failures.length === 0
        ? check('plugin-branding', 'pass', 'Required plugin logo and composer icon assets are present')
        : check('plugin-branding', 'error', failures.join('; '))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check('plugin-branding', 'error', `Invalid plugin manifest: ${message}`));
  }

  const skillsRoot = path.join(repoRoot, 'skills');
  if (!fs.existsSync(skillsRoot)) {
    checks.push(check('plugin-skills-root', 'error', 'skills/ is missing'));
    return checks;
  }

  const invalidEntries = fs.readdirSync(skillsRoot, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [entry.name];
    return fs.existsSync(path.join(skillsRoot, entry.name, 'SKILL.md')) ? [] : [`${entry.name}/`];
  });

  checks.push(
    invalidEntries.length === 0
      ? check('plugin-skills-root', 'pass', 'Every direct skills/ child is an importable skill directory')
      : check(
          'plugin-skills-root',
          'error',
          `Invalid direct skills/ entries: ${invalidEntries.join(', ')}`
        )
  );

  return checks;
}

export function runDoctor(
  targetDir: string = process.cwd(),
  repoRoot: string = getCoreRepoRoot()
): DoctorReport {
  const checks: DoctorCheck[] = [];

  try {
    const registry = loadSkillRegistry(repoRoot);
    checks.push(
      check('skill-registry', 'pass', `Validated ${registry.skills.length} canonical skills and transition targets`)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check('skill-registry', 'error', message));
  }

  checks.push(...validatePluginPackage(repoRoot));

  const activeProject = fs.existsSync(path.join(targetDir, '.fable'));
  if (!activeProject) {
    checks.push(check('project-state', 'warn', 'No active .fable directory in the current project'));
    checks.push(check('project-skills', 'warn', 'Project-local canonical skills are not required until get-fable is initialized'));
  } else {
    try {
      const state = readFableState(targetDir);
      if (!state) throw new Error('.fable/state.json is missing');
      checks.push(check('project-state', 'pass', `State schema ${state.schemaVersion}, phase ${state.phase}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push(check('project-state', 'error', message));
    }

    const isSourceRepo = path.resolve(targetDir) === path.resolve(repoRoot);
    const skillRoot = isSourceRepo
      ? path.join(repoRoot, 'skills')
      : path.join(targetDir, '.agents', 'skills');
    const missing = canonicalSkillIds().filter(
      (skill) => !fs.existsSync(path.join(skillRoot, skill, 'SKILL.md'))
    );
    checks.push(
      missing.length === 0
        ? check(
            'project-skills',
            'pass',
            isSourceRepo
              ? 'Source repository canonical skills are present'
              : 'All canonical project skills are installed'
          )
        : check('project-skills', 'error', `Missing project skills: ${missing.join(', ')}`)
    );
  }

  const python = spawnSync('python3', ['--version'], { encoding: 'utf-8' });
  checks.push(
    python.status === 0
      ? check('python-runtime', 'pass', (python.stdout || python.stderr || 'python3 available').trim())
      : check('python-runtime', 'warn', 'python3 was not found; lifecycle hooks cannot run on hosts that require them')
  );

  return {
    schemaVersion: 1,
    ok: checks.every((item) => item.status !== 'error'),
    checks,
  };
}
