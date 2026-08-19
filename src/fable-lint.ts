import fs from 'node:fs';
import path from 'node:path';
import { hasFreshPassingEvidence, readFableState } from './core/state.js';
import { canonicalSkillIds, getCoreRepoRoot, loadSkillRegistry } from './core/skill-registry.js';
import { validateAllSkillPackages, getSkillPackageDir } from './core/skill-package.js';
import { validateAllRecipes } from './core/recipes.js';
import { logInfo, logSuccess, logError, logWarn } from './utils.js';

export interface SkillPackageLintReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
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

    // 2. Inspect SKILL.md sections
    const skillPath = path.join(getSkillPackageDir(id, repoRoot), 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const requiredSections = [
        'Purpose',
        'When to Use',
        'When NOT to Use',
      ];
      for (const sec of requiredSections) {
        if (!content.toLowerCase().includes(sec.toLowerCase())) {
          warnings.push(`Skill ${id}: SKILL.md is missing "## ${sec}" section`);
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
        if (fs.existsSync(subPath) && fs.statSync(subPath).isDirectory()) {
          const files = fs.readdirSync(subPath);
          for (const file of files) {
            const rel = `${sub}/${file}`;
            if (!declaredPaths.has(rel) && !file.startsWith('.')) {
              errors.push(`Skill ${id}: Orphan file not declared in skill.package.json: ${rel}`);
            }
          }
        }
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

  // 5. Validate registry parity
  const canonicalReg = path.join(repoRoot, 'skills', 'get-fable', 'registry.json');
  const mirroredReg = path.join(repoRoot, 'registry', 'skills.json');
  if (fs.existsSync(canonicalReg) && fs.existsSync(mirroredReg)) {
    if (fs.readFileSync(canonicalReg, 'utf-8') !== fs.readFileSync(mirroredReg, 'utf-8')) {
      errors.push('Registry mismatch: skills/get-fable/registry.json does not match registry/skills.json');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function runFableLint(targetDir: string = process.cwd()): boolean {
  logInfo(`Running Fable lint checks on ${targetDir}...`);
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
