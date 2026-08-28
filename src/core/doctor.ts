import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalSkillIds, getCoreRepoRoot, loadSkillRegistry } from './skill-registry.js';
import { readFableState, createInitialState, writeFableState } from './state.js';
import { evaluateFableSpark } from './spark.js';
import { loadTelemetryConfig } from './telemetry.js';
import { loadSkillFeed } from './feed.js';
import { validateAllSkillPackages, getSkillManifestPath, getSkillPackageSummary, FABLE_SKILL_PACKAGE_SCHEMA_VERSION } from './skill-package.js';
import { validateAllRecipes } from './recipes.js';
import { loadNeuralGraph } from './neural-linking.js';
import { checkCatalogArtifacts } from './catalog-generator.js';
import { evaluateSkillMaturity } from './maturity.js';
import { HOST_CONTRACTS } from './host-contract.js';
import { evaluateHostInstallerParity } from './host-evidence.js';
import { FABLE_STATE_SCHEMA_VERSION, type DoctorCheck, type DoctorReport, type FablePack } from './types.js';
import {
  CANONICAL_GIT_HOOKS,
  areCanonicalGitHooksInstalled,
  resolveGitHooksPath,
} from './git-hooks-path.js';

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
      ? check('skill-package-manifest', 'PASS', `All ${canonical.length} canonical skills have valid skill.package.json manifests`)
      : check('skill-package-manifest', 'ERROR', `Missing manifests for: ${manifestFailures.join(', ')}`)
  );

  checks.push(
    resourceFailures.length === 0
      ? check('skill-package-resources', 'PASS', 'All package-referenced resources exist, are non-empty, and adhere to containment boundaries')
      : check('skill-package-resources', 'ERROR', `Package resource errors in: ${resourceFailures.join(' | ')}`)
  );

  checks.push(
    agentFailures.length === 0
      ? check('skill-package-agents', 'PASS', `All ${canonical.length} skills have valid agent definitions`)
      : check('skill-package-agents', 'ERROR', `Missing agent metadata in: ${agentFailures.join(', ')}`)
  );

  checks.push(
    evalFailures.length === 0
      ? check('skill-package-evals', 'PASS', `All ${canonical.length} skills declare one or more eval resources; this is structural evidence only`)
      : check('skill-package-evals', 'ERROR', `Missing eval suites in: ${evalFailures.join(', ')}`)
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
          ? check('skill-registry-parity', 'PASS', 'Canonical skills/get-fable/registry.json and registry/skills.json are in exact parity')
          : check('skill-registry-parity', 'ERROR', 'skills/get-fable/registry.json and registry/skills.json have drifted')
      );
    } catch (e) {
      checks.push(check('skill-registry-parity', 'ERROR', `Failed to parse registry files: ${e}`));
    }
  } else {
    checks.push(check('skill-registry-parity', 'ERROR', 'One or both skill registry files are missing'));
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
        ? check('skill-pack-parity', 'PASS', 'All pack files in packs/*.json match registry definitions with 100% parity')
        : check('skill-pack-parity', 'ERROR', `Pack parity issues: ${packFailures.join(', ')}`)
    );
  } catch (e) {
    checks.push(check('skill-pack-parity', 'ERROR', `Pack validation error: ${e}`));
  }

  // Recipe integrity check
  const recipeVal = validateAllRecipes(repoRoot);
  checks.push(
    recipeVal.valid
      ? check('recipe-integrity', 'PASS', `Validated ${recipeVal.recipes.length} lifecycle recipes`)
      : check('recipe-integrity', 'ERROR', `Recipe errors: ${recipeVal.errors.join('; ')}`)
  );

  // Neural graph integrity check
  try {
    const graph = loadNeuralGraph(repoRoot);
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const missingNodes = canonicalSkillIds().filter((id) => !nodeIds.has(id as any));
    const badEdges = graph.edges.filter((e) => !nodeIds.has(e.source as any) || !nodeIds.has(e.target as any));

    if (missingNodes.length > 0) {
      checks.push(check('neural-graph-integrity', 'ERROR', `Neural graph missing nodes: ${missingNodes.join(', ')}`));
    } else if (badEdges.length > 0) {
      checks.push(check('neural-graph-integrity', 'ERROR', `Neural graph has dangling edges: ${badEdges.length}`));
    } else {
      checks.push(check('neural-graph-integrity', 'PASS', `Neural graph verified with ${graph.nodes.length} nodes and ${graph.edges.length} edges`));
    }
  } catch (e) {
    checks.push(check('neural-graph-integrity', 'ERROR', `Neural graph error: ${e}`));
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
          ? check('hook-registry-integrity', 'PASS', 'All registered hooks point to existing scripts')
          : check('hook-registry-integrity', 'ERROR', hookErrors.join('; '))
      );
    } catch (e) {
      checks.push(check('hook-registry-integrity', 'ERROR', `Hook registry parse error: ${e}`));
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
    checks.push(check('plugin-manifest', 'ERROR', '.codex-plugin/plugin.json is missing'));
  } else {
    checks.push(check('plugin-manifest', 'PASS', '.codex-plugin/plugin.json is present'));
  }

  if (!fs.existsSync(claudeMarketplaceManifest)) {
    checks.push(check('claude-marketplace-manifest', 'ERROR', '.claude-plugin/marketplace.json is missing'));
  } else {
    try {
      const marketplace = JSON.parse(fs.readFileSync(claudeMarketplaceManifest, 'utf-8'));
      if (!marketplace.name || !Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
        checks.push(check('claude-marketplace-manifest', 'ERROR', '.claude-plugin/marketplace.json is missing name or plugins'));
      } else {
        checks.push(check('claude-marketplace-manifest', 'PASS', '.claude-plugin/marketplace.json is present and valid'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push(check('claude-marketplace-manifest', 'ERROR', `Invalid marketplace manifest: ${message}`));
    }
  }

  if (!fs.existsSync(claudePluginManifest)) {
    checks.push(check('claude-plugin-manifest', 'ERROR', '.claude-plugin/plugin.json is missing'));
  } else {
    checks.push(check('claude-plugin-manifest', 'PASS', '.claude-plugin/plugin.json is present'));
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
      checks.push(check(`${platform.id}-marketplace`, 'PASS', `${platform.dir}/marketplace.json is present`));
    }
  }

  const skillsShPath = path.join(repoRoot, 'skills.sh.json');
  if (fs.existsSync(skillsShPath)) {
    checks.push(check('skills-sh-catalog', 'PASS', 'skills.sh.json catalog is present'));
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
        ? check('plugin-branding', 'PASS', 'Required plugin logo and composer icon assets are present')
        : check('plugin-branding', 'ERROR', failures.join('; '))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check('plugin-branding', 'ERROR', `Invalid plugin manifest: ${message}`));
  }

  const skillsRoot = path.join(repoRoot, 'skills');
  if (!fs.existsSync(skillsRoot)) {
    checks.push(check('plugin-skills-root', 'ERROR', 'skills/ is missing'));
    return checks;
  }

  const invalidEntries = fs.readdirSync(skillsRoot, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [entry.name];
    return fs.existsSync(path.join(skillsRoot, entry.name, 'SKILL.md')) ? [] : [`${entry.name}/`];
  });

  checks.push(
    invalidEntries.length === 0
      ? check('plugin-skills-root', 'PASS', 'Every direct skills/ child is an importable skill directory')
      : check(
          'plugin-skills-root',
          'ERROR',
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

  const hooksPath = resolveGitHooksPath(targetDir);
  if (hooksPath.kind === 'error') {
    errors.push(hooksPath.message);
  } else if (hooksPath.kind === 'resolved') {
    const hooksSourceDir = path.join(repoRoot, 'hooks', 'git');
    const hooksDestDir = hooksPath.hooksDir;
    try {
      if (!fs.existsSync(hooksSourceDir)) {
        throw new Error(`Git hook sources are missing: ${hooksSourceDir}`);
      }
      fs.mkdirSync(hooksDestDir, { recursive: true });
      for (const hookFile of CANONICAL_GIT_HOOKS) {
        const sourceFile = path.join(hooksSourceDir, hookFile);
        if (!fs.existsSync(sourceFile)) {
          throw new Error(`Git hook source is missing: ${sourceFile}`);
        }
        const destFile = path.join(hooksDestDir, hookFile);
        if (fs.existsSync(destFile)) {
          const stat = fs.statSync(destFile);
          if (!stat.isFile()) {
            throw new Error(`Git hook destination is not a regular file: ${destFile}`);
          }
        } else {
          fs.copyFileSync(sourceFile, destFile);
          try {
            fs.chmodSync(destFile, 0o755);
          } catch {
            // ignore chmod on non-posix
          }
          repaired.push(`Installed missing git hook: ${hookFile}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to repair git hooks in ${hooksDestDir}: ${message}`);
    }
  }

  return { repaired, errors };
}

function validateEnterpriseConfiguration(repoRoot: string): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  try {
    const stateSchema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'schemas', 'state.schema.json'), 'utf-8'));
    const packageSchema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'schemas', 'skill-package.schema.json'), 'utf-8'));
    const stateVersions = stateSchema?.properties?.schemaVersion?.enum;
    const packageVersions = packageSchema?.properties?.schemaVersion?.enum;
    const parity = Array.isArray(stateVersions) && stateVersions.length === 1 && stateVersions[0] === FABLE_STATE_SCHEMA_VERSION &&
      Array.isArray(packageVersions) && packageVersions.length === 1 && packageVersions[0] === FABLE_SKILL_PACKAGE_SCHEMA_VERSION;
    checks.push(parity
      ? check('schema-runtime-parity', 'PASS', `State schema v${FABLE_STATE_SCHEMA_VERSION} and Skill Package schema v${FABLE_SKILL_PACKAGE_SCHEMA_VERSION} match runtime validators`)
      : check('schema-runtime-parity', 'ERROR', 'Runtime and JSON schema version contracts have drifted'));
  } catch (error) {
    checks.push(check('schema-runtime-parity', 'ERROR', `Schema parity check failed: ${error instanceof Error ? error.message : String(error)}`));
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8'));
    const files = Array.isArray(pkg.files) ? pkg.files : [];
    const intentional = files.includes('eval/') && !files.includes('evals/') && !files.includes('docs/') && files.includes('docs/*.md') && files.includes('public/');
    checks.push(intentional
      ? check('distribution-contract', 'PASS', 'npm whitelist keeps runtime eval material, public docs/site assets, and excludes root holdouts and internal Superpowers plans')
      : check('distribution-contract', 'ERROR', 'npm package whitelist does not match the documented distribution boundary'));
  } catch (error) {
    checks.push(check('distribution-contract', 'ERROR', `Distribution contract check failed: ${error instanceof Error ? error.message : String(error)}`));
  }

  const workflowsDir = path.join(repoRoot, '.github', 'workflows');
  try {
    const workflowPaths = fs.readdirSync(workflowsDir)
      .filter((name) => /\.ya?ml$/.test(name))
      .sort()
      .map((name) => `.github/workflows/${name}`);
    const workflows = workflowPaths.map((relative) => ({ relative, text: fs.readFileSync(path.join(repoRoot, relative), 'utf-8') }));
    const actionRefs = workflows.flatMap(({ text }) => [...text.matchAll(/uses:\s+[^@\s]+@([^\s#]+)/g)].map((match) => match[1]));
    const pinned = actionRefs.length > 0 && actionRefs.every((ref) => /^[0-9a-f]{40}$/.test(ref));
    const workflow = (name: string) => workflows.find((item) => item.relative.endsWith(`/${name}`))?.text || '';
    const ci = workflow('ci.yml');
    const security = workflow('security.yml');
    const release = workflow('release.yml');
    const e2e = workflow('e2e.yml');
    const githubRelease = workflow('github-release.yml');
    const docsPreview = workflow('docs-preview.yml');
    const supplyChain = pinned && ci.includes('bun install --frozen-lockfile') && release.includes('id-token: write') &&
      release.includes('environment: npm') && !/NPM_TOKEN|NODE_AUTH_TOKEN/.test(release);
    checks.push(supplyChain
      ? check('supply-chain-config', 'PASS', `All ${actionRefs.length} third-party Action references across ${workflows.length} workflows are full commit SHAs; CI uses frozen Bun resolution and npm publishing uses OIDC`)
      : check('supply-chain-config', 'ERROR', 'CI/release supply-chain configuration is incomplete or mutable'));

    const securityReady = security.includes('github/codeql-action') && security.includes('actions/dependency-review-action') &&
      security.includes('trufflesecurity/trufflehog') && security.includes('version: 3.97.0');
    checks.push(securityReady
      ? check('security-ci-config', 'PASS', 'Security workflow configures CodeQL, dependency review, and TruffleHog OSS with scoped permissions')
      : check('security-ci-config', 'ERROR', 'Security CI is missing CodeQL, dependency review, or TruffleHog secret scanning'));

    const e2eReady = e2e.includes('cypress-io/github-action') && e2e.includes('bun install --frozen-lockfile') &&
      e2e.includes('start: bun run serve:web') && e2e.includes('wait-on: http://127.0.0.1:3000') && e2e.includes('cypress/e2e/site.cy.ts');
    checks.push(e2eReady
      ? check('e2e-ci-config', 'PASS', 'Cypress E2E workflow runs the pinned site smoke suite against a bounded local server')
      : check('e2e-ci-config', 'ERROR', 'Cypress E2E workflow is missing or incomplete'));

    const draftReleaseReady = githubRelease.includes('softprops/action-gh-release') && githubRelease.includes('draft: true') &&
      githubRelease.includes('generate_release_notes: true') && githubRelease.includes('contents: write');
    checks.push(draftReleaseReady
      ? check('github-release-config', 'PASS', 'Version tags create a draft GitHub Release; npm publish still requires an explicit Release publication')
      : check('github-release-config', 'ERROR', 'GitHub Release workflow must create drafts without implicitly triggering npm publication'));

    const docsPreviewReady = docsPreview.includes('workflow_dispatch:') && docsPreview.includes('ldeluigi/markdown-docs') &&
      docsPreview.includes('src: docs') && docsPreview.includes('dst: .generated/markdown-docs') && !docsPreview.includes('pull_request:') && !docsPreview.includes('push:');
    checks.push(docsPreviewReady
      ? check('docs-preview-config', 'PASS', 'Markdown Docs is isolated to a manual non-gating preview workflow')
      : check('docs-preview-config', 'ERROR', 'Markdown Docs preview must remain manual and isolated from required CI'));

    checks.push(check('release-runtime-evidence', 'NOT_CHECKED', 'Release workflow is configured but has not been executed for the current working revision'));
  } catch (error) {
    checks.push(check('supply-chain-config', 'ERROR', `Workflow configuration check failed: ${error instanceof Error ? error.message : String(error)}`));
  }
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
      check('skill-registry', 'PASS', `Validated ${registry.skills.length} canonical skills and transition targets`)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check('skill-registry', 'ERROR', message));
  }

  checks.push(...validatePluginPackage(repoRoot));
  checks.push(...validateSkillPackages(repoRoot));
  checks.push(...validateRegistriesAndPacks(repoRoot));
  checks.push(...validateEnterpriseConfiguration(repoRoot));

  const generated = checkCatalogArtifacts(repoRoot);
  checks.push(
    generated.ok
      ? check('generated-catalog-drift', 'PASS', 'Generated TypeScript, Python, registry, catalog, and pack artifacts match the canonical registry')
      : check('generated-catalog-drift', 'ERROR', `Generated artifact drift: ${generated.drift.join(', ')}`)
  );

  try {
    const maturity = canonicalSkillIds().map((id) => evaluateSkillMaturity(id, repoRoot));
    const counts = Object.fromEntries(['M0','M1','M2','M3','M4','M5'].map((level) => [level, maturity.filter((item) => item.maturity === level).length]));
    const uncheckedHoldouts = maturity.filter((item) => item.behavior.holdout.status === 'NOT_CHECKED').length;
    checks.push(
      uncheckedHoldouts > 0
        ? check('behavioral-maturity', 'NOT_CHECKED', `Evidence maturity: ${JSON.stringify(counts)}; holdout evidence is NOT_CHECKED for ${uncheckedHoldouts}/${maturity.length} skills, so Doctor does not award behavioral proof`)
        : check('behavioral-maturity', 'PASS', `Evidence maturity evaluated with current holdout evidence: ${JSON.stringify(counts)}`)
    );
  } catch (error) {
    checks.push(check('behavioral-maturity', 'ERROR', `Maturity evaluation failed: ${error instanceof Error ? error.message : String(error)}`));
  }

  try {
    const hostParity = evaluateHostInstallerParity();
    const failures = hostParity.results.filter((item) => !item.passed);
    checks.push(failures.length === 0
      ? check('host-parity', 'PASS', `Isolated installer parity passed for all ${hostParity.total} declared hosts (${HOST_CONTRACTS.filter((host) => host.level === 'FULL').length} FULL)`)
      : check('host-parity', 'ERROR', `Host parity failed: ${failures.map((item) => `${item.id}: ${item.failures.join(', ')}`).join(' | ')}`));
  } catch (error) {
    checks.push(check('host-parity', 'ERROR', `Host parity evaluation failed: ${error instanceof Error ? error.message : String(error)}`));
  }

  try {
    const feed = loadSkillFeed(repoRoot, targetDir);
    checks.push(check('feed-engine', 'PASS', `Feed engine loaded with ${feed.length} skills`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check('feed-engine', 'ERROR', `Feed engine error: ${message}`));
  }

  try {
    const telemetry = loadTelemetryConfig();
    checks.push(
      check(
        'telemetry-health',
        'PASS',
        `Telemetry local storage ready (${telemetry.enabled ? 'enabled' : 'disabled'})`
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check('telemetry-health', 'ERROR', `Telemetry error: ${message}`));
  }

  const activeProject = fs.existsSync(path.join(targetDir, '.fable'));
  if (!activeProject) {
    checks.push(check('project-state', 'WARN', 'No active .fable directory in the current project'));
    checks.push(check('project-skills', 'WARN', 'Project-local canonical skills are not required until get-fable is initialized'));
  } else {
    try {
      const state = readFableState(targetDir);
      if (!state) throw new Error('.fable/state.json is missing');
      checks.push(check('project-state', 'PASS', `State schema ${state.schemaVersion}, phase ${state.phase}`));
      const spark = evaluateFableSpark({ state });
      checks.push(
        check(
          'fable-spark',
          'PASS',
          spark.silent ? 'Spark micro-policy standing by (silent)' : `Next move: ${spark.suggestion}`
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push(check('project-state', 'ERROR', message));
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
            'PASS',
            isSourceRepo
              ? 'Source repository canonical skills are present'
              : 'All canonical project skills are installed'
          )
        : check('project-skills', 'ERROR', `Missing project skills: ${missing.join(', ')}`)
    );
  }

  const hooksPath = resolveGitHooksPath(targetDir);
  if (hooksPath.kind === 'error') {
    checks.push(check('git-hooks', 'WARN', hooksPath.message));
  } else if (hooksPath.kind === 'resolved') {
    checks.push(
      areCanonicalGitHooksInstalled(hooksPath.hooksDir)
        ? check('git-hooks', 'PASS', 'All four canonical Git lifecycle hooks are installed')
        : check('git-hooks', 'WARN', `Canonical Git hooks are incomplete in ${hooksPath.hooksDir} (run get-fable install git-hooks or get-fable doctor --fix)`)
    );
  }

  const python = spawnSync('python3', ['--version'], { encoding: 'utf-8' });
  checks.push(
    python.status === 0
      ? check('python-runtime', 'PASS', (python.stdout || python.stderr || 'python3 available').trim())
      : check('python-runtime', 'WARN', 'python3 was not found; lifecycle hooks cannot run on hosts that require them')
  );

  return {
    schemaVersion: 1,
    ok: checks.every((item) => item.status !== 'ERROR'),
    checks,
  };
}
