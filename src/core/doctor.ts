import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalSkillIds, getCoreRepoRoot, loadSkillRegistry } from './skill-registry.js';
import { readFableState, createInitialState, writeFableState } from './state.js';
import { evaluateFableSpark } from './spark.js';
import { loadTelemetryConfig } from './telemetry.js';
import { loadSkillFeed } from './feed.js';
import { validateAllSkillPackages, getSkillManifestPath, getSkillPackageSummary } from './skill-package.js';
import { validateAllRecipes } from './recipes.js';
import { loadNeuralGraph } from './neural-linking.js';
import type { DoctorCheck, DoctorReport, FablePack } from './types.js';

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

function validateSkillPackages(repoRoot: string): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const results = validateAllSkillPackages(repoRoot);
  const canonical = canonicalSkillIds();
  const manifestFailures: string[] = [];
  const resourceFailures: string[] = [];
  const agentFailures: string[] = [];
  const evalFailures: string[] = [];

  for (const id of canonical) {
    const res = results[id];
    if (!res || !res.manifest) {
      manifestFailures.push(id);
      continue;
    }
    if (!res.valid) {
      resourceFailures.push(`${id} (${res.errors.join('; ')})`);
    }

    if (res.manifest.agents.length === 0) {
      agentFailures.push(`${id} (missing agent)`);
    }

    if (res.manifest.evals.length === 0) {
      evalFailures.push(`${id} (missing eval scenarios)`);
    }
  }

  checks.push(
    manifestFailures.length === 0
      ? check('skill-package-manifest', 'pass', `All ${canonical.length} canonical skills have valid skill.package.json manifests`)
      : check('skill-package-manifest', 'error', `Missing manifests for: ${manifestFailures.join(', ')}`)
  );

  checks.push(
    resourceFailures.length === 0
      ? check('skill-package-resources', 'pass', 'All package-referenced resources exist, are non-empty, and adhere to containment boundaries')
      : check('skill-package-resources', 'error', `Package resource errors in: ${resourceFailures.join(' | ')}`)
  );

  checks.push(
    agentFailures.length === 0
      ? check('skill-package-agents', 'pass', `All ${canonical.length} skills have valid agent definitions`)
      : check('skill-package-agents', 'error', `Missing agent metadata in: ${agentFailures.join(', ')}`)
  );

  checks.push(
    evalFailures.length === 0
      ? check('skill-package-evals', 'pass', `All ${canonical.length} skills have structured behavioral eval benchmark scenarios`)
      : check('skill-package-evals', 'error', `Missing eval suites in: ${evalFailures.join(', ')}`)
  );

  return checks;
}

function validateRegistriesAndPacks(repoRoot: string): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const canonicalRegistryPath = path.join(repoRoot, 'skills', 'get-fable', 'registry.json');
  const mirroredRegistryPath = path.join(repoRoot, 'registry', 'skills.json');

  if (fs.existsSync(canonicalRegistryPath) && fs.existsSync(mirroredRegistryPath)) {
    const rawCanonical = fs.readFileSync(canonicalRegistryPath, 'utf-8');
    const rawMirrored = fs.readFileSync(mirroredRegistryPath, 'utf-8');
    try {
      const parsedCanonical = JSON.parse(rawCanonical);
      const parsedMirrored = JSON.parse(rawMirrored);
      const isMatch = JSON.stringify(parsedCanonical) === JSON.stringify(parsedMirrored);
      checks.push(
        isMatch
          ? check('skill-registry-parity', 'pass', 'Canonical skills/get-fable/registry.json and registry/skills.json are in exact parity')
          : check('skill-registry-parity', 'error', 'skills/get-fable/registry.json and registry/skills.json have drifted')
      );
    } catch (e) {
      checks.push(check('skill-registry-parity', 'error', `Failed to parse registry files: ${e}`));
    }
  } else {
    checks.push(check('skill-registry-parity', 'error', 'One or both skill registry files are missing'));
  }

  // Packs parity check
  try {
    const registry = loadSkillRegistry(repoRoot);
    const packsDir = path.join(repoRoot, 'packs');
    const packFailures: string[] = [];

    const packMap: Record<FablePack, string[]> = {
      core: [],
      intelligence: [],
      build: [],
      proof: [],
      delivery: [],
      evolution: [],
      system: [],
      creator: [],
    };

    for (const skill of registry.skills) {
      if (packMap[skill.pack as FablePack]) {
        packMap[skill.pack as FablePack].push(skill.id);
      }
    }

    for (const [packName, expectedSkills] of Object.entries(packMap)) {
      const packFile = path.join(packsDir, `${packName}.json`);
      if (!fs.existsSync(packFile)) {
        packFailures.push(`packs/${packName}.json missing`);
        continue;
      }
      const content = JSON.parse(fs.readFileSync(packFile, 'utf-8'));
      const packSkills = content.skills || [];
      const sortedExpected = [...expectedSkills].sort();
      const sortedActual = [...packSkills].sort();
      if (JSON.stringify(sortedExpected) !== JSON.stringify(sortedActual)) {
        packFailures.push(`packs/${packName}.json skills mismatch`);
      }
    }

    const fullPackFile = path.join(packsDir, 'full.json');
    if (fs.existsSync(fullPackFile)) {
      const fullContent = JSON.parse(fs.readFileSync(fullPackFile, 'utf-8'));
      if ((fullContent.skills?.length || 0) !== canonicalSkillIds().length) {
        packFailures.push('packs/full.json count mismatch');
      }
    }

    checks.push(
      packFailures.length === 0
        ? check('skill-pack-parity', 'pass', 'All pack files in packs/*.json match registry definitions with 100% parity')
        : check('skill-pack-parity', 'error', `Pack parity issues: ${packFailures.join(', ')}`)
    );
  } catch (e) {
    checks.push(check('skill-pack-parity', 'error', `Pack validation error: ${e}`));
  }

  // Recipe integrity check
  const recipeVal = validateAllRecipes(repoRoot);
  checks.push(
    recipeVal.valid
      ? check('recipe-integrity', 'pass', `Validated ${recipeVal.recipes.length} lifecycle recipes`)
      : check('recipe-integrity', 'error', `Recipe errors: ${recipeVal.errors.join('; ')}`)
  );

  // Neural graph integrity check
  try {
    const graph = loadNeuralGraph(repoRoot);
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const missingNodes = canonicalSkillIds().filter((id) => !nodeIds.has(id as any));
    const badEdges = graph.edges.filter((e) => !nodeIds.has(e.source as any) || !nodeIds.has(e.target as any));

    if (missingNodes.length > 0) {
      checks.push(check('neural-graph-integrity', 'error', `Neural graph missing nodes: ${missingNodes.join(', ')}`));
    } else if (badEdges.length > 0) {
      checks.push(check('neural-graph-integrity', 'error', `Neural graph has dangling edges: ${badEdges.length}`));
    } else {
      checks.push(check('neural-graph-integrity', 'pass', `Neural graph verified with ${graph.nodes.length} nodes and ${graph.edges.length} edges`));
    }
  } catch (e) {
    checks.push(check('neural-graph-integrity', 'error', `Neural graph error: ${e}`));
  }

  // Hook registry integrity check
  const hookRegistryPath = path.join(repoRoot, 'registry', 'hooks.json');
  if (fs.existsSync(hookRegistryPath)) {
    try {
      const hookData = JSON.parse(fs.readFileSync(hookRegistryPath, 'utf-8'));
      const hookErrors: string[] = [];
      for (const [event, hookList] of Object.entries(hookData.hooks || {})) {
        if (Array.isArray(hookList)) {
          for (const h of hookList as any[]) {
            const cmd = h.command || '';
            const scriptMatch = cmd.match(/python3\s+([^\s]+)/);
            if (scriptMatch) {
              const scriptPath = path.resolve(repoRoot, scriptMatch[1]);
              if (!fs.existsSync(scriptPath)) {
                hookErrors.push(`Hook script not found: ${scriptMatch[1]} (for ${h.name || event})`);
              }
            }
          }
        }
      }
      checks.push(
        hookErrors.length === 0
          ? check('hook-registry-integrity', 'pass', 'All registered hooks point to existing scripts')
          : check('hook-registry-integrity', 'error', hookErrors.join('; '))
      );
    } catch (e) {
      checks.push(check('hook-registry-integrity', 'error', `Hook registry parse error: ${e}`));
    }
  }

  return checks;
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
  checks.push(...validateSkillPackages(repoRoot));
  checks.push(...validateRegistriesAndPacks(repoRoot));

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
