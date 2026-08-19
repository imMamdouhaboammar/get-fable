import fs from 'node:fs';
import path from 'node:path';
import { getCoreRepoRoot } from './skill-registry.js';

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

export function listRecipes(repoRoot: string = getCoreRepoRoot()): Recipe[] {
  const recipesDir = path.join(repoRoot, 'recipes');
  if (!fs.existsSync(recipesDir)) return [];

  const files = fs.readdirSync(recipesDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.json'));
  const results: Recipe[] = [];

  for (const file of files) {
    const filePath = path.join(recipesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const id = path.basename(file, path.extname(file));

    // Simple YAML/JSON parsing for recipes
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const versionMatch = content.match(/^version:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*(.+)$/m);
    const shapeMatch = content.match(/^targetShape:\s*(.+)$/m);

    const stepMatches = [...content.matchAll(/-\s*skill:\s*([a-z0-9-]+)(?:\n\s*gate:\s*([a-z0-9-]+))?(?:\n\s*description:\s*([^\n]+))?/g)];
    const steps: RecipeStep[] = stepMatches.map((m) => ({
      skill: m[1],
      gate: m[2],
      description: m[3]?.trim(),
    }));

    results.push({
      id,
      name: nameMatch ? nameMatch[1].trim() : id,
      version: versionMatch ? versionMatch[1].trim() : '1.0.0',
      description: descMatch ? descMatch[1].trim() : 'Fable lifecycle recipe',
      targetShape: shapeMatch ? shapeMatch[1].trim() : undefined,
      steps,
    });
  }

  return results;
}

export function getRecipe(recipeId: string, repoRoot: string = getCoreRepoRoot()): Recipe | null {
  const recipes = listRecipes(repoRoot);
  return recipes.find((r) => r.id === recipeId) || null;
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
    const desc = step.description ? ` - ${step.description}` : '';
    lines.push(`  ${idx + 1}. ${step.skill}${gateInfo}${desc}`);
  });

  return lines.join('\n');
}
