import { canonicalSkillIds, getCoreRepoRoot } from './skill-registry.js';
import { loadSkillPackage, readSkillResource } from './skill-package.js';
import type { SkillBehaviorProvider, SkillBehaviorResponse } from '../integrations/providers.js';

export interface AgentBehaviorOracle {
  action: string;
  selectedSkill?: string;
  produces?: string;
  gates?: string[];
  structure?: string[];
}
export interface AgentBehaviorEvalCase {
  skillId: string;
  caseId: string;
  instruction: string;
  given: Record<string, unknown>;
  expected: AgentBehaviorOracle;
  forbidden?: Partial<AgentBehaviorOracle>;
}
export interface AgentBehaviorCaseResult {
  skillId: string;
  caseId: string;
  passed: boolean;
  forbiddenViolated: boolean;
  expected: AgentBehaviorOracle;
  forbidden?: Partial<AgentBehaviorOracle>;
  response?: SkillBehaviorResponse;
  error?: string;
}
export interface AgentBehaviorEvalResult {
  schemaVersion: 1;
  metric: 'agent-behavior';
  providerId: string;
  total: number;
  passed: number;
  passRate: number;
  forbiddenViolations: number;
  cases: AgentBehaviorCaseResult[];
}

function arraysEqual(left?: string[], right?: string[]): boolean {
  if (left === undefined) return true;
  if (!right || left.length !== right.length) return false;
  const expected = [...left].sort();
  const actual = [...right].sort();
  return expected.every((value, index) => value === actual[index]);
}

function matchesOracle(response: SkillBehaviorResponse, oracle: Partial<AgentBehaviorOracle>): boolean {
  if (oracle.action !== undefined && response.action !== oracle.action) return false;
  if (oracle.selectedSkill !== undefined && response.selectedSkill !== oracle.selectedSkill) return false;
  if (oracle.produces !== undefined && response.produces !== oracle.produces) return false;
  if (!arraysEqual(oracle.gates, response.gates)) return false;
  if (!arraysEqual(oracle.structure, response.structure)) return false;
  return true;
}

export function buildAgentBehaviorEvalPlan(repoRoot: string = getCoreRepoRoot()): AgentBehaviorEvalCase[] {
  const plan: AgentBehaviorEvalCase[] = [];
  for (const skillId of canonicalSkillIds()) {
    const manifest = loadSkillPackage(skillId, repoRoot);
    const instruction = readSkillResource(skillId, manifest.entry, repoRoot);
    for (const evalPath of manifest.evals.filter((item) => item.endsWith('.json'))) {
      let scenarios: any[] = [];
      try {
        const parsed = JSON.parse(readSkillResource(skillId, evalPath, repoRoot));
        scenarios = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.scenarios) ? parsed.scenarios : [];
      } catch { continue; }
      for (const scenario of scenarios) {
        const expected = scenario?.expected;
        if (typeof scenario?.id !== 'string' || typeof expected?.action !== 'string') continue;
        if (typeof expected?.selectedSkill === 'string') continue;
        const given = scenario?.given && typeof scenario.given === 'object' && !Array.isArray(scenario.given)
          ? scenario.given as Record<string, unknown>
          : {};
        plan.push({
          skillId,
          caseId: scenario.id,
          instruction,
          given,
          expected: {
            action: expected.action,
            selectedSkill: typeof expected.selectedSkill === 'string' ? expected.selectedSkill : undefined,
            produces: typeof expected.produces === 'string' ? expected.produces : undefined,
            gates: Array.isArray(expected.gates) ? expected.gates : undefined,
            structure: Array.isArray(expected.structure) ? expected.structure : undefined,
          },
          forbidden: typeof scenario?.forbidden?.action === 'string'
            ? { action: scenario.forbidden.action }
            : undefined,
        });
      }
    }
  }
  return plan;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, caseId: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Skill behavior case ${caseId} timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

function validateProviderResponse(value: unknown): SkillBehaviorResponse {
  if (!value || typeof value !== 'object' || typeof (value as SkillBehaviorResponse).action !== 'string' || !(value as SkillBehaviorResponse).action.trim()) {
    throw new Error('Skill behavior provider returned an invalid response');
  }
  return value as SkillBehaviorResponse;
}

export async function runAgentBehaviorEvalPlan(
  provider: SkillBehaviorProvider,
  plan: AgentBehaviorEvalCase[] = buildAgentBehaviorEvalPlan(),
  options: { timeoutMs?: number } = {}
): Promise<AgentBehaviorEvalResult> {
  const vocabularyPlan = buildAgentBehaviorEvalPlan();
  const actionVocabulary = [...new Set(vocabularyPlan.flatMap((item) => [item.expected.action, item.forbidden?.action]).filter((value): value is string => Boolean(value)))].sort();
  const timeoutMs = options.timeoutMs ?? 60_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new Error('Skill behavior timeoutMs must be a positive integer');
  const cases: AgentBehaviorCaseResult[] = [];
  for (const item of plan) {
    try {
      const response = validateProviderResponse(await withTimeout(provider.executeSkill({
        skillId: item.skillId,
        caseId: item.caseId,
        instruction: item.instruction,
        given: item.given,
        actionVocabulary,
      }), timeoutMs, item.caseId));
      const forbiddenViolated = Boolean(item.forbidden && matchesOracle(response, item.forbidden));
      cases.push({
        skillId: item.skillId,
        caseId: item.caseId,
        passed: matchesOracle(response, item.expected) && !forbiddenViolated,
        forbiddenViolated,
        expected: item.expected,
        forbidden: item.forbidden,
        response,
      });
    } catch (error) {
      cases.push({
        skillId: item.skillId,
        caseId: item.caseId,
        passed: false,
        forbiddenViolated: false,
        expected: item.expected,
        forbidden: item.forbidden,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const passed = cases.filter((item) => item.passed).length;
  const forbiddenViolations = cases.filter((item) => item.forbiddenViolated).length;
  return {
    schemaVersion: 1,
    metric: 'agent-behavior',
    providerId: provider.id,
    total: cases.length,
    passed,
    passRate: cases.length ? passed / cases.length : 0,
    forbiddenViolations,
    cases,
  };
}
