import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalSkillIds, getCoreRepoRoot, loadSkillRegistry } from './skill-registry.js';
import { readFableState } from './state.js';
import type { DoctorCheck, DoctorReport } from './types.js';

function check(id: string, status: DoctorCheck['status'], message: string): DoctorCheck {
  return { id, status, message };
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

  const pluginManifest = path.join(repoRoot, '.codex-plugin', 'plugin.json');
  checks.push(
    fs.existsSync(pluginManifest)
      ? check('plugin-manifest', 'pass', '.codex-plugin/plugin.json is present')
      : check('plugin-manifest', 'error', '.codex-plugin/plugin.json is missing')
  );

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

    const missing = canonicalSkillIds().filter(
      (skill) => !fs.existsSync(path.join(targetDir, '.agents', 'skills', skill, 'SKILL.md'))
    );
    checks.push(
      missing.length === 0
        ? check('project-skills', 'pass', 'All canonical project skills are installed')
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
