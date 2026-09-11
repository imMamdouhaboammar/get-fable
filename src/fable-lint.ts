import fs from 'node:fs';
import path from 'node:path';
import { hasFreshPassingEvidence, readFableState } from './core/state.js';
import { assertSafeFableBoundary } from './core/state-boundary.js';
import { canonicalSkillIds, getCoreRepoRoot, loadSkillRegistry } from './core/skill-registry.js';
import { validateAllSkillPackages, getSkillPackageDir, readSkillResource } from './core/skill-package.js';
import { checkCatalogArtifacts } from './core/catalog-generator.js';
import { validateAllRecipes } from './core/recipes.js';
import { logInfo, logSuccess, logError, logWarn } from './utils.js';

export interface SkillPackageLintReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function hasHeading(headings: Set<string>, ...alternatives: string[]): boolean {
  return alternatives.some((value) => headings.has(value.toLowerCase()));
}

function hasHeadingContaining(headings: Set<string>, ...fragments: string[]): boolean {
  return [...headings].some((heading) => fragments.some((fragment) => heading.includes(fragment.toLowerCase())));
}

function scenarioArray(value: any): any[] {
  return Array.isArray(value) ? value : Array.isArray(value?.scenarios) ? value.scenarios : [];
}

export function runSkillPackageLint(repoRoot: string = getCoreRepoRoot()): SkillPackageLintReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const canonical = canonicalSkillIds();

  // 1. Validate all skill packages via deep loader
  const packageResults = validateAllSkillPackages(repoRoot);
  for (const id of canonical) {
    const res = packageResults[id];
    if (!res) {
      errors.push(`Skill package ${id}: not found`);
      continue;
    }
    if (!res.valid) {
      for (const err of res.errors) {
        errors.push(`Skill ${id}: ${err}`);
      }
    }

    // 2. Inspect the authoring contract without forcing V1 boilerplate onto V2 playbooks.
    const skillPath = path.join(getSkillPackageDir(id, repoRoot), 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const headings = new Set(
        content.split('\n')
          .map((line) => line.match(/^##\s+(.+?)\s*$/)?.[1]?.trim().toLowerCase())
          .filter((heading): heading is string => Boolean(heading))
      );
      const isDeepPlaybook = hasHeading(headings, 'Mission') && hasHeading(headings, 'Anti-Patterns') && hasHeading(headings, 'Invariants');

      if (isDeepPlaybook) {
        const v2Requirements: Array<{ label: string; present: boolean }> = [
          { label: 'Mission', present: hasHeading(headings, 'Mission') },
          { label: 'Activation contract', present: hasHeading(headings, 'Activate When', 'Activation Contract') || hasHeadingContaining(headings, 'activation') },
          { label: 'Situation classification', present: hasHeadingContaining(headings, 'classification') },
          { label: 'Protocol', present: hasHeadingContaining(headings, 'protocol', 'procedure') },
          { label: 'Decision Rules', present: hasHeading(headings, 'Decision Rules') },
          { label: 'Invariants', present: hasHeading(headings, 'Invariants') },
          { label: 'Failure Taxonomy', present: hasHeadingContaining(headings, 'failure taxonomy') },
          { label: 'Anti-Patterns', present: hasHeading(headings, 'Anti-Patterns') },
          { label: 'Completion Criteria', present: hasHeading(headings, 'Completion Criteria') },
          { label: 'Progressive Resources', present: hasHeading(headings, 'Progressive Resources') },
        ];
        for (const requirement of v2Requirements) {
          if (!requirement.present) warnings.push(`Skill ${id}: missing V2 authoring section "${requirement.label}"`);
        }

        // Deep Skills need semantic evaluation breadth, not one scenario multiplied by category variants.
        if (res.manifest) {
          const scenarios = res.manifest.evals.flatMap((resource) => {
            if (!resource.endsWith('.json')) return [];
            try { return scenarioArray(JSON.parse(readSkillResource(id, resource, repoRoot))); }
            catch { return []; }
          });
          if (scenarios.length < 6) {
            errors.push(`Skill ${id}: Deep Playbook V2 requires at least 6 semantic eval scenarios; found ${scenarios.length}`);
          }

          // Progressive disclosure must include at least one substantial reference rather than only summary stubs.
          const substantialReference = res.manifest.references.some((resource) => {
            try { return Buffer.byteLength(readSkillResource(id, resource, repoRoot), 'utf8') >= 1000; }
            catch { return false; }
          });
          if (!substantialReference) {
            errors.push(`Skill ${id}: Deep Playbook V2 requires at least one substantial progressive reference (>=1000 bytes)`);
          }
        }
      } else {
        const requiredSections: Array<{ label: string; alternatives?: string[] }> = [
          { label: 'Purpose' },
          { label: 'When to Use' },
          { label: 'When NOT to Use' },
          { label: 'Inputs' },
          { label: 'Expected Outputs', alternatives: ['Outputs'] },
          { label: 'Procedure' },
          { label: 'Decision Rules' },
          { label: 'Tool Policy' },
          { label: 'Evidence Requirements' },
          { label: 'Failure Handling' },
          { label: 'Completion Criteria' },
        ];
        for (const section of requiredSections) {
          const accepted = [section.label, ...(section.alternatives || [])].map((value) => value.toLowerCase());
          if (!accepted.some((value) => headings.has(value))) {
            warnings.push(`Skill ${id}: missing required authoring section "## ${section.label}"`);
          }
        }
        if (!headings.has('constraints') && !headings.has('decision rules') && !headings.has('tool policy')) {
          warnings.push(`Skill ${id}: constraints are not explicit through Constraints, Decision Rules, or Tool Policy`);
        }
      }
    }

    // 3. Check for orphan unreferenced files in skill package directory
    const skillDir = getSkillPackageDir(id, repoRoot);
    if (fs.existsSync(skillDir) && res.manifest) {
      const declaredPaths = new Set<string>([
        'SKILL.md',
        'skill.package.json',
        ...res.manifest.agents,
        ...res.manifest.references,
        ...res.manifest.templates,
        ...res.manifest.examples,
        ...res.manifest.evals,
        ...res.manifest.scripts,
      ]);

      const checkSubdir = (sub: string) => {
        const subPath = path.join(skillDir, sub);
        if (!fs.existsSync(subPath) || !fs.statSync(subPath).isDirectory()) return;
        const walk = (dir: string) => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name.startsWith('.')) continue;
            const absolute = path.join(dir, entry.name);
            const rel = path.relative(skillDir, absolute).split(path.sep).join('/');
            if (entry.isSymbolicLink()) {
              errors.push(`Skill ${id}: Symlink resource is not allowed: ${rel}`);
            } else if (entry.isDirectory()) {
              walk(absolute);
            } else if (entry.isFile()) {
              if (!declaredPaths.has(rel)) {
                errors.push(`Skill ${id}: Orphan file not declared in skill.package.json: ${rel}`);
              }
            } else {
              errors.push(`Skill ${id}: Special resource is not allowed: ${rel}`);
            }
          }
        };
        walk(subPath);
      };

      for (const sub of ['agents', 'references', 'templates', 'examples', 'evals', 'scripts']) {
        checkSubdir(sub);
      }
    }
  }

  // 4. Validate recipe integrity
  const recipeVal = validateAllRecipes(repoRoot);
  if (!recipeVal.valid) {
    for (const err of recipeVal.errors) errors.push(`Recipe error: ${err}`);
  }

  // 5. Validate every generated compatibility artifact against the canonical registry.
  const generated = checkCatalogArtifacts(repoRoot);
  if (!generated.ok) {
    errors.push(`Generated catalog drift: ${generated.drift.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function runFableLint(targetDir: string = process.cwd()): boolean {
  logInfo(`Running Fable lint checks on ${targetDir}...`);
  try {
    assertSafeFableBoundary(targetDir);
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error));
    return false;
  }
  let hasErrors = false;

  const repoRoot = getCoreRepoRoot();
  const isSourceRepo = path.resolve(targetDir) === path.resolve(repoRoot);

  // If in source repo or skills/ directory exists, run skill package authoring lint
  if (isSourceRepo || fs.existsSync(path.join(targetDir, 'skills'))) {
    const pkgReport = runSkillPackageLint(targetDir);
    if (!pkgReport.valid) {
      for (const err of pkgReport.errors) {
        logError(`Package lint: ${err}`);
        hasErrors = true;
      }
    }
    for (const warn of pkgReport.warnings) {
      logWarn(`Package lint: ${warn}`);
    }
  }

  const fableDir = path.join(targetDir, '.fable');
  const ledgerPath = path.join(fableDir, 'LEDGER.md');
  const statePath = path.join(fableDir, 'state.json');
  const specPath = path.join(targetDir, 'docs', 'SPEC.md');

  if (!fs.existsSync(ledgerPath)) {
    logWarn(`No .fable/LEDGER.md found in ${targetDir}`);
  } else {
    const content = fs.readFileSync(ledgerPath, 'utf-8');
    const lines = content.split('\n');
    let openCards = 0;
    let closedCards = 0;

    lines.forEach((line, idx) => {
      const openMatch = line.match(/^\s*-\s*\[\s*\]\s*(.*)/);
      const closedMatch = line.match(/^\s*-\s*\[[xX]\]\s*(.*)/);

      if (openMatch) {
        openCards++;
        const text = openMatch[1];
        if (
          !text.toLowerCase().includes('acceptance') &&
          !text.toLowerCase().includes('test') &&
          !text.toLowerCase().includes('check')
        ) {
          logError(
            `LEDGER.md L${idx + 1}: Open card missing explicit machine-checkable acceptance test`
          );
          hasErrors = true;
        }
      }

      if (closedMatch) {
        closedCards++;
        const evidenceMatch = line.match(/--\s*evidence:\s*(.+)$/i);
        if (!evidenceMatch || evidenceMatch[1].trim().length < 3) {
          logError(`LEDGER.md L${idx + 1}: Closed card missing substantive '-- evidence:' annotation`);
          hasErrors = true;
        }
      }
    });

    logInfo(`LEDGER.md Summary: ${openCards} open cards, ${closedCards} closed cards.`);
  }

  if (fs.existsSync(statePath)) {
    try {
      const state = readFableState(targetDir);
      if (!state) throw new Error('.fable/state.json could not be loaded');
      if (state.phase === 'complete' && state.substantial && !hasFreshPassingEvidence(state)) {
        logError('state.json: substantial work is complete without fresh passing evidence');
        hasErrors = true;
      }
      if (state.failureStreak > 1 && state.phase === 'executing') {
        logError('state.json: repeated failure must route through recovery before more execution');
        hasErrors = true;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logError(`state.json: ${reason}`);
      hasErrors = true;
    }
  }

  if (fs.existsSync(specPath)) {
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const tags = ['[measured]', '[inferred]', '[not-shown]'];
    if (!tags.some((tag) => specContent.includes(tag))) {
      logWarn('SPEC.md missing source tags ([measured]/[inferred]/[not-shown]) for claims.');
    }
  }

  if (!hasErrors) logSuccess('Fable lint passed! State, cards, packages, acceptance, and evidence are consistent.');
  return !hasErrors;
}
