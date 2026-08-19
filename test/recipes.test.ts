import { describe, expect, test } from 'bun:test';
import { listRecipes, getRecipe, renderRecipeAscii } from '../src/core/recipes.ts';

describe('Fable Lifecycle Recipes', () => {
  test('lists all canonical workflow recipes', () => {
    const recipes = listRecipes();
    expect(recipes.length).toBeGreaterThanOrEqual(8);
    const ids = recipes.map((r) => r.id);
    expect(ids).toContain('bug-fix');
    expect(ids).toContain('build-feature');
    expect(ids).toContain('research-first');
    expect(ids).toContain('review-pr');
    expect(ids).toContain('security-review');
    expect(ids).toContain('release');
    expect(ids).toContain('cowork-session');
    expect(ids).toContain('create-skill');
  });

  test('retrieves and validates a specific recipe structure', () => {
    const bugFix = getRecipe('bug-fix');
    expect(bugFix).not.toBeNull();
    expect(bugFix?.targetShape).toBe('bug-fix');
    expect(bugFix?.steps.map((s) => s.skill)).toEqual([
      'fable-discover',
      'fable-tdd',
      'fable-execute',
      'fable-verify',
      'fable-review',
      'fable-handoff',
    ]);
  });

  test('renders ASCII workflow diagram for a recipe', () => {
    const ascii = renderRecipeAscii('build-feature');
    expect(ascii).toContain('Fable Recipe: build-feature');
    expect(ascii).toContain('Workflow Steps:');
    expect(ascii).toContain('fable-plan');
    expect(ascii).toContain('fable-verify');
  });
});
