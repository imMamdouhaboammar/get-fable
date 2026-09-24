import { getCoreRepoRoot } from './skill-registry.js';
import { loadSkillPackage, readSkillResource } from './skill-package.js';
import type { FableSkillId } from './types.js';

export interface SkillScenario {
  id: string;
  description?: string;
  given?: Record<string, unknown>;
  expected?: Record<string, unknown>;
  forbidden?: Record<string, unknown>;
  prompt?: string;
  expected_skill?: string;
  expected_pack?: string;
  expected_output_contains?: string[];
  type?: string;
  name?: string;
  category?: string;
  shouldTrigger?: boolean;
  [key: string]: unknown;
}

export const validateObjectField = (
  obj: Record<string, unknown>,
  field: string,
  skillId: string,
  resourcePath: string
): void => {
  const val = obj[field];
  if (val !== undefined && (!val || typeof val !== 'object' || Array.isArray(val))) {
    throw new Error(
      `Failed to validate eval scenario "${obj.id}" in "${resourcePath}" for skill "${skillId}": invalid "${field}" field: must be an object.`
    );
  }
};

export const TESTABLE_SCENARIO_KEYS = [
  'expected',
  'prompt',
  'given',
  'expected_skill',
  'shouldTrigger',
  'category',
] as const;

export const assertScenarioObject = (
  raw: unknown,
  skillId: string,
  resourcePath: string,
  index: number
): Record<string, unknown> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(
      `Failed to validate eval scenario at index ${index} in "${resourcePath}" for skill "${skillId}": expected an object.`
    );
  }
  return raw as Record<string, unknown>;
};

export const assertScenarioId = (
  obj: Record<string, unknown>,
  skillId: string,
  resourcePath: string,
  index: number
): void => {
  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    throw new Error(
      `Failed to validate eval scenario at index ${index} in "${resourcePath}" for skill "${skillId}": missing a valid string "id".`
    );
  }
};

export const assertScenarioHasTestable = (
  obj: Record<string, unknown>,
  skillId: string,
  resourcePath: string
): void => {
  const hasTestable = TESTABLE_SCENARIO_KEYS.some((key) => obj[key] !== undefined);
  if (!hasTestable) {
    throw new Error(
      `Failed to validate eval scenario "${obj.id}" in "${resourcePath}" for skill "${skillId}": has no valid testable fields (expected, prompt, given, expected_skill, shouldTrigger, category).`
    );
  }
};

export const validateScenario = (
  raw: unknown,
  skillId: string,
  resourcePath: string,
  index: number
): SkillScenario => {
  const obj = assertScenarioObject(raw, skillId, resourcePath, index);
  assertScenarioId(obj, skillId, resourcePath, index);
  assertScenarioHasTestable(obj, skillId, resourcePath);

  validateObjectField(obj, 'expected', skillId, resourcePath);
  validateObjectField(obj, 'given', skillId, resourcePath);
  validateObjectField(obj, 'forbidden', skillId, resourcePath);

  return obj as SkillScenario;
};

export const readAndParseEvalResource = (
  id: FableSkillId,
  resource: string,
  repoRoot: string
): unknown => {
  if (!resource.endsWith('.json')) {
    throw new Error(
      `Unsupported eval format for "${resource}" in skill "${id}". Only .json is supported.`
    );
  }
  const rawContent = readSkillResource(id, resource, repoRoot);
  try {
    return JSON.parse(rawContent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to parse eval resource "${resource}" in skill "${id}": ${message}`
    );
  }
};

export const extractScenariosArray = (
  parsed: unknown,
  id: FableSkillId,
  resource: string
): unknown[] => {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.scenarios)) {
      return obj.scenarios as unknown[];
    }
  }
  throw new Error(
    `Eval resource "${resource}" in skill "${id}" must contain an array of scenarios or an object with a "scenarios" array.`
  );
};

export const loadSkillScenarios = (
  id: FableSkillId,
  repoRoot: string = getCoreRepoRoot()
): SkillScenario[] => {
  const manifest = loadSkillPackage(id, repoRoot);
  const allScenarios: SkillScenario[] = [];

  for (const resource of manifest.evals) {
    const parsed = readAndParseEvalResource(id, resource, repoRoot);
    const rawArray = extractScenariosArray(parsed, id, resource);
    rawArray.forEach((item, index) => {
      allScenarios.push(validateScenario(item, id, resource, index));
    });
  }

  return allScenarios;
};

export const countSkillScenarios = (
  id: FableSkillId,
  repoRoot: string = getCoreRepoRoot()
): number | null => {
  try {
    const manifest = loadSkillPackage(id, repoRoot);
    if (!manifest.evals || manifest.evals.length === 0) {
      return 0;
    }
    const scenarios = loadSkillScenarios(id, repoRoot);
    return scenarios.length;
  } catch {
    return null;
  }
};
