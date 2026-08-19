import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalSkillIds, getCoreRepoRoot, loadSkillRegistry } from './skill-registry.js';
import { readFableState, createInitialState, writeFableState } from './state.js';
import { evaluateFableSpark } from './spark.js';
import { loadTelemetryConfig } from './telemetry.js';
import { loadSkillFeed } from './feed.js';
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
  const claudeMarketplaceManifest = path.join(repoRoot, '.claude-plugin', 'marketplace.json');
  const claudePluginManifest = path.join(repoRoot, '.claude-plugin', 'plugin.json');

  if (!fs.existsSync(pluginManifest)) {
    checks.push(check('plugin-manifest', 'error', '.codex-plugin/plugin.json is missing'));
  } else {
    checks.push(check('plugin-manifest', 'pass', '.codex-plugin/plugin.json is present'));
  }

  if (!fs.existsSync(claudeMarketplaceManifest)) {
    checks.push(check('claude-marketplace-manifest', 'error', '.claude-plugin/marketplace.json is missing'));
  } else {
    try {
      const marketplace = JSON.parse(fs.readFileSync(claudeMarketplaceManifest, 'utf-8'));
      if (!marketplace.name || !Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
        checks.push(check('claude-marketplace-manifest', 'error', '.claude-plugin/marketplace.json is missing name or plugins'));
      } else {
        checks.push(check('claude-marketplace-manifest', 'pass', '.claude-plugin/marketplace.json is present and valid'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push(check('claude-marketplace-manifest', 'error', `Invalid marketplace manifest: ${message}`));
    }
  }

  if (!fs.existsSync(claudePluginManifest)) {
    checks.push(check('claude-plugin-manifest', 'error', '.claude-plugin/plugin.json is missing'));
  } else {
    checks.push(check('claude-plugin-manifest', 'pass', '.claude-plugin/plugin.json is present'));
  }

  const platforms = [
    { id: 'chatgpt', dir: '.chatgpt-plugin' },
    { id: 'gemini', dir: '.gemini-plugin' },
    { id: 'cursor', dir: '.cursor-plugin' },
    { id: 'kimi', dir: '.kimi-plugin' },
    { id: 'opencode', dir: '.opencode-plugin' },
    { id: 'deepseek', dir: '.deepseek-plugin' },
    { id: 'kiro', dir: '.kiro-plugin' },
    { id: 'pi', dir: '.pi-plugin' },
  ];

  for (const platform of platforms) {
    const marketPath = path.join(repoRoot, platform.dir, 'marketplace.json');
    if (fs.existsSync(marketPath)) {
      checks.push(check(`${platform.id}-marketplace`, 'pass', `${platform.dir}/marketplace.json is present`));
    }
  }

  const skillsShPath = path.join(repoRoot, 'skills.sh.json');
  if (fs.existsSync(skillsShPath)) {
    checks.push(check('skills-sh-catalog', 'pass', 'skills.sh.json catalog is present'));
  }

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

export function runDoctorFix(
  targetDir: string = process.cwd(),
  repoRoot: string = getCoreRepoRoot()
): { repaired: string[]; errors: string[] } {
  const repaired: string[] = [];
  const errors: string[] = [];

  const fableDir = path.join(targetDir, '.fable');
  if (!fs.existsSync(fableDir)) {
    fs.mkdirSync(fableDir, { recursive: true });
    repaired.push('Created .fable/ directory');
  }

  const statePath = path.join(fableDir, 'state.json');
  if (!fs.existsSync(statePath)) {
    try {
      const state = createInitialState(new Date().toISOString(), targetDir);
      writeFableState(targetDir, state);
      repaired.push('Repaired initial .fable/state.json');
    } catch (e) {
      errors.push(`Failed to repair state.json: ${e}`);
    }
  }

  const ledgerPath = path.join(fableDir, 'LEDGER.md');
  if (!fs.existsSync(ledgerPath)) {
    fs.writeFileSync(
      ledgerPath,
      `# Project Ledger\n\n## Active Cards\n\n## Acceptance Criteria\n- [measured] Primary verification passes\n`,
      'utf-8'
    );
    repaired.push('Created .fable/LEDGER.md');
  }

  const progressPath = path.join(fableDir, 'PROGRESS.md');
  if (!fs.existsSync(progressPath)) {
    fs.writeFileSync(progressPath, `# Project Progress\n\n- Project initialized.\n`, 'utf-8');
    repaired.push('Created .fable/PROGRESS.md');
  }

  const gitDir = path.join(targetDir, '.git');
  if (fs.existsSync(gitDir)) {
    const hooksSourceDir = path.join(repoRoot, 'hooks', 'git');
    const hooksDestDir = path.join(gitDir, 'hooks');
    if (fs.existsSync(hooksSourceDir)) {
      if (!fs.existsSync(hooksDestDir)) fs.mkdirSync(hooksDestDir, { recursive: true });
      for (const hookFile of fs.readdirSync(hooksSourceDir)) {
        const destFile = path.join(hooksDestDir, hookFile);
        if (!fs.existsSync(destFile)) {
          fs.copyFileSync(path.join(hooksSourceDir, hookFile), destFile);
          try {
            fs.chmodSync(destFile, 0o755);
          } catch {
            // ignore chmod on non-posix
          }
          repaired.push(`Installed missing git hook: ${hookFile}`);
        }
      }
    }
  }

  return { repaired, errors };
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

  try {
    const feed = loadSkillFeed(repoRoot, targetDir);
    checks.push(check('feed-engine', 'pass', `Feed engine loaded with ${feed.length} skills`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check('feed-engine', 'error', `Feed engine error: ${message}`));
  }

  try {
    const telemetry = loadTelemetryConfig();
    checks.push(
      check(
        'telemetry-health',
        'pass',
        `Telemetry local storage ready (${telemetry.enabled ? 'enabled' : 'disabled'})`
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check('telemetry-health', 'error', `Telemetry error: ${message}`));
  }

  const activeProject = fs.existsSync(path.join(targetDir, '.fable'));
  if (!activeProject) {
    checks.push(check('project-state', 'warn', 'No active .fable directory in the current project'));
    checks.push(check('project-skills', 'warn', 'Project-local canonical skills are not required until get-fable is initialized'));
  } else {
    try {
      const state = readFableState(targetDir);
      if (!state) throw new Error('.fable/state.json is missing');
      checks.push(check('project-state', 'pass', `State schema ${state.schemaVersion}, phase ${state.phase}`));
      const spark = evaluateFableSpark({ state });
      checks.push(
        check(
          'fable-spark',
          'pass',
          spark.silent ? 'Spark micro-policy standing by (silent)' : `Next move: ${spark.suggestion}`
        )
      );
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

  const gitDir = path.join(targetDir, '.git');
  if (fs.existsSync(gitDir)) {
    const preCommitHook = path.join(gitDir, 'hooks', 'pre-commit');
    checks.push(
      fs.existsSync(preCommitHook)
        ? check('git-hooks', 'pass', 'Git pre-commit and lifecycle hooks are installed')
        : check('git-hooks', 'warn', 'Git hooks not installed in .git/hooks (run get-fable install git-hooks or get-fable doctor --fix)')
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
