import fs from 'node:fs';
import path from 'node:path';
import { getCoreRepoRoot, canonicalSkillIds } from './skill-registry.js';

export interface RecipeStep {
  skill: string;
  gate?: string;
  optional?: boolean;
  description?: string;
  fallback?: string;
}

export interface Recipe {
  id: string;
  name: string;
  version: string;
  description: string;
  targetShape?: string;
  steps: RecipeStep[];
}

function parseRecipeContent(content: string, id: string): Recipe {
  // If JSON
  if (content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      return {
        id,
        name: parsed.name || id,
        version: parsed.version || '1.0.0',
        description: parsed.description || 'Fable lifecycle recipe',
        targetShape: parsed.targetShape,
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      };
    } catch {}
  }

  // YAML parsing
  const nameMatch = content.match(/^name:\s*(.+)$/m);
  const versionMatch = content.match(/^version:\s*(.+)$/m);
  const descMatch = content.match(/^description:\s*(.+)$/m);
  const shapeMatch = content.match(/^targetShape:\s*(.+)$/m);

  const steps: RecipeStep[] = [];
  const lines = content.split('\n');
  let currentStep: Partial<RecipeStep> | null = null;
  let inSteps = false;

  for (const line of lines) {
    if (line.match(/^steps:\s*$/)) {
      inSteps = true;
      continue;
    }
    if (!inSteps) continue;

    const stepStart = line.match(/^\s*-\s*skill:\s*([a-z0-9-]+)\s*$/);
    if (stepStart) {
      if (currentStep && currentStep.skill) {
        steps.push(currentStep as RecipeStep);
      }
      currentStep = { skill: stepStart[1] };
      continue;
    }

    if (currentStep) {
      const gateMatch = line.match(/^\s*gate:\s*([a-z0-9_-]+)\s*$/);
      if (gateMatch) {
        currentStep.gate = gateMatch[1];
        continue;
      }
      const optMatch = line.match(/^\s*optional:\s*(true|false)\s*$/i);
      if (optMatch) {
        currentStep.optional = optMatch[1].toLowerCase() === 'true';
        continue;
      }
      const descLineMatch = line.match(/^\s*description:\s*(.+)$/);
      if (descLineMatch) {
        currentStep.description = descLineLineMatch(descLineMatch[1]);
        continue;
      }
      const fallbackMatch = line.match(/^\s*fallback:\s*([a-z0-9_-]+)\s*$/);
      if (fallbackMatch) {
        currentStep.fallback = fallbackMatch[1];
        continue;
      }
    }
  }

  if (currentStep && currentStep.skill) {
    steps.push(currentStep as RecipeStep);
  }

  function descLineLineMatch(raw: string): string {
    return raw.trim().replace(/^['"](.*)['"]$/, '$1');
  }

  return {
    id,
    name: nameMatch ? nameMatch[1].trim() : id,
    version: versionMatch ? versionMatch[1].trim() : '1.0.0',
    description: descMatch ? descMatch[1].trim() : 'Fable lifecycle recipe',
    targetShape: shapeMatch ? shapeMatch[1].trim() : undefined,
    steps,
  };
}

export function listRecipes(repoRoot: string = getCoreRepoRoot()): Recipe[] {
  const recipesDir = path.join(repoRoot, 'recipes');
  if (!fs.existsSync(recipesDir)) return [];

  const files = fs.readdirSync(recipesDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.json'));
  const results: Recipe[] = [];

  for (const file of files) {
    const filePath = path.join(recipesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const id = path.basename(file, path.extname(file));
    results.push(parseRecipeContent(content, id));
  }

  return results;
}

export function getRecipe(recipeId: string, repoRoot: string = getCoreRepoRoot()): Recipe | null {
  const recipes = listRecipes(repoRoot);
  return recipes.find((r) => r.id === recipeId) || null;
}

export function validateAllRecipes(repoRoot: string = getCoreRepoRoot()): {
  valid: boolean;
  errors: string[];
  recipes: Recipe[];
} {
  const recipes = listRecipes(repoRoot);
  const errors: string[] = [];
  const canonicalIds = new Set(canonicalSkillIds());

  for (const r of recipes) {
    if (!r.id || !r.name || !r.version) {
      errors.push(`Recipe ${r.id} missing required header fields`);
    }
    if (!r.steps || r.steps.length === 0) {
      errors.push(`Recipe ${r.id} has no steps`);
    }
    for (let i = 0; i < r.steps.length; i++) {
      const step = r.steps[i];
      if (!canonicalIds.has(step.skill as any)) {
        errors.push(`Recipe ${r.id} step [${i}] references unknown skill: ${step.skill}`);
      }
      if (step.fallback && !canonicalIds.has(step.fallback as any)) {
        errors.push(`Recipe ${r.id} step [${i}] references unknown fallback skill: ${step.fallback}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    recipes,
  };
}

export function renderRecipeAscii(recipeId: string, repoRoot: string = getCoreRepoRoot()): string {
  const recipe = getRecipe(recipeId, repoRoot);
  if (!recipe) {
    throw new Error(`Recipe '${recipeId}' not found`);
  }

  const lines: string[] = [
    `=== Fable Recipe: ${recipe.name} (v${recipe.version}) ===`,
    `Description: ${recipe.description}`,
    `Target Shape: ${recipe.targetShape || 'general'}`,
    '',
    'Workflow Steps:',
  ];

  recipe.steps.forEach((step, idx) => {
    const gateInfo = step.gate ? ` [Gate: ${step.gate}]` : '';
    const optInfo = step.optional ? ' (optional)' : '';
    const desc = step.description ? ` - ${step.description}` : '';
    lines.push(`  ${idx + 1}. ${step.skill}${gateInfo}${optInfo}${desc}`);
  });

  return lines.join('\n');
}
