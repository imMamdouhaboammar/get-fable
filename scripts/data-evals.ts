export type Scenario = {
  id: string;
  name: string;
  category: 'should-trigger' | 'should-not-trigger' | 'behavioral';
  prompt: string;
  expectedAction?: string;
  forbiddenAction?: string;
  shouldTrigger?: boolean;
};

export const SKILL_EVALS: Record<string, Scenario[]> = {};

// Helper to generate 10 standard scenarios per skill
export function buildStandardScenarios(
  skillId: string,
  positives: Array<{ id: string; name: string; prompt: string }>,
  negatives: Array<{ id: string; name: string; prompt: string }>,
  behavioral: { id: string; name: string; prompt: string; expected: string; forbidden: string }
): Scenario[] {
  const list: Scenario[] = [];
  positives.slice(0, 5).forEach((p) => {
    list.push({
      id: p.id,
      name: p.name,
      category: 'should-trigger',
      prompt: p.prompt,
      shouldTrigger: true,
    });
  });
  negatives.slice(0, 4).forEach((n) => {
    list.push({
      id: n.id,
      name: n.name,
      category: 'should-not-trigger',
      prompt: n.prompt,
      shouldTrigger: false,
    });
  });
  list.push({
    id: behavioral.id,
    name: behavioral.name,
    category: 'behavioral',
    prompt: behavioral.prompt,
    expectedAction: behavioral.expected,
    forbiddenAction: behavioral.forbidden,
    shouldTrigger: true,
  });
  return list;
}
