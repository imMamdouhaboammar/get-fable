import { describe, expect, test } from 'bun:test';
import { buildAgentBehaviorEvalPlan, runAgentBehaviorEvalPlan } from '../src/core/agent-behavior-eval.ts';
import type { SkillBehaviorProvider } from '../src/integrations/providers.ts';

describe('provider-neutral agent behavior evaluation', () => {
  test('builds executable action-contract cases without treating routing-only cases as action proof', () => {
    const plan = buildAgentBehaviorEvalPlan();
    expect(plan.length).toBeGreaterThanOrEqual(20);
    expect(plan.some((item) => item.skillId === 'fable-tdd' && item.expected.action === 'write-failing-test-first')).toBe(true);
    expect(plan.some((item) => item.caseId === 'fable-plan-boundary-unknown-facts')).toBe(false);
  });

  test('evaluates structured provider outputs and forbidden actions independently', async () => {
    const plan = buildAgentBehaviorEvalPlan().slice(0, 5);
    const oracle = new Map(plan.map((item) => [item.caseId, item.expected]));
    const provider: SkillBehaviorProvider = {
      id: 'fixture-provider',
      executeSkill: async (request) => {
        const expected = oracle.get(request.caseId);
        return {
          action: expected?.action ?? 'unknown',
          selectedSkill: expected?.selectedSkill,
          produces: expected?.produces,
          gates: expected?.gates,
        };
      },
    };
    const result = await runAgentBehaviorEvalPlan(provider, plan);
    expect(result.total).toBe(5);
    expect(result.passed).toBe(5);
    expect(result.forbiddenViolations).toBe(0);
    expect(result.providerId).toBe('fixture-provider');
    expect(result.metric).toBe('agent-behavior');
    expect(result.cases[0].expected.action).toBe(plan[0].expected.action);
  });

  test('contains provider failures and timeouts as case failures instead of aborting the suite', async () => {
    const plan = buildAgentBehaviorEvalPlan().slice(0, 3);
    let calls = 0;
    const provider: SkillBehaviorProvider = {
      id: 'unstable-provider',
      executeSkill: async () => {
        calls += 1;
        if (calls === 1) throw new Error('provider unavailable');
        if (calls === 2) return await new Promise(() => {});
        return { ...plan[2].expected };
      },
    };
    const result = await runAgentBehaviorEvalPlan(provider, plan, { timeoutMs: 10 });
    expect(result.total).toBe(3);
    expect(result.cases[0].error).toContain('provider unavailable');
    expect(result.cases[1].error).toContain('timed out');
    expect(result.cases[2].response?.action).toBe(plan[2].expected.action);
    expect(result.cases.filter((item) => !item.passed).length).toBe(2);
  });


  test('supplies one global action vocabulary without leaking case oracles', async () => {
    const plan = buildAgentBehaviorEvalPlan().slice(0, 2);
    const seen: any[] = [];
    const oracle = new Map(plan.map((item) => [item.caseId, item.expected]));
    const provider: SkillBehaviorProvider = {
      id: 'vocabulary-provider',
      executeSkill: async (request) => {
        seen.push(request);
        return { ...oracle.get(request.caseId)! };
      },
    };
    await runAgentBehaviorEvalPlan(provider, plan);
    expect(seen.length).toBe(2);
    expect(seen[0].actionVocabulary.length).toBeGreaterThan(10);
    expect(seen[0].actionVocabulary).toEqual(seen[1].actionVocabulary);
    expect(seen[0].actionVocabulary).toContain(plan[0].expected.action);
    expect('expected' in seen[0]).toBe(false);
    expect('forbidden' in seen[0]).toBe(false);
  });


  test('treats gate and structure collections as semantic sets, not ordered arrays', async () => {
    const item = buildAgentBehaviorEvalPlan().find((entry) => (entry.expected.gates?.length ?? 0) > 1)!;
    const provider: SkillBehaviorProvider = {
      id: 'set-order-provider',
      executeSkill: async () => ({
        action: item.expected.action,
        produces: item.expected.produces,
        gates: [...(item.expected.gates ?? [])].reverse(),
        structure: item.expected.structure ? [...item.expected.structure].reverse() : undefined,
      }),
    };
    const result = await runAgentBehaviorEvalPlan(provider, [item]);
    expect(result.passed).toBe(1);
  });

});
