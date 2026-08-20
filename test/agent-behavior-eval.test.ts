import { describe, expect, test } from 'bun:test';
import { buildAgentBehaviorEvalPlan, runAgentBehaviorEvalPlan } from '../src/core/agent-behavior-eval.ts';
import type { SkillBehaviorProvider } from '../src/integrations/providers.ts';

describe('provider-neutral agent behavior evaluation', () => {
  test('builds executable action-contract cases without treating routing-only cases as action proof', () => {
    const plan = buildAgentBehaviorEvalPlan();
    expect(plan.length).toBeGreaterThanOrEqual(20);
    expect(plan.some((item) => item.skillId === 'fable-tdd' && item.expected.action === 'write-failing-test-first')).toBe(true);
    expect(plan.some((item) => item.caseId === 'fable-plan-boundary-unknown-facts')).toBe(false);
    expect(plan.every((item) => (item as any).category === 'known')).toBe(true);
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

  test('builds five enterprise behavior categories for every semantic TDD family', async () => {
    const mod: any = await import('../src/core/agent-behavior-eval.ts');
    expect(typeof mod.buildEnterpriseAgentBehaviorEvalPlan).toBe('function');
    const plan = mod.buildEnterpriseAgentBehaviorEvalPlan();
    const tdd = plan.filter((item: any) => item.skillId === 'fable-tdd');
    const categories = new Set(['known', 'negative', 'ambiguous', 'adversarial', 'holdout']);
    expect(new Set(tdd.map((item: any) => item.category))).toEqual(categories);

    const families = new Map<string, Set<string>>();
    for (const item of tdd) {
      const family = String(item.caseId).split('::')[0];
      const familyCategories = families.get(family) ?? new Set<string>();
      familyCategories.add(item.category);
      families.set(family, familyCategories);
    }
    expect(families.size).toBeGreaterThanOrEqual(6);
    for (const familyCategories of families.values()) expect(familyCategories).toEqual(categories);

    const bugAdversarial = tdd.find((item: any) => item.caseId === 'fable-tdd-bug-fix::adversarial');
    expect(bugAdversarial.given.__fableEval.untrustedInstruction).toContain('modify-production-code-without-test');
  });

  test('exports oracle-free deterministic request bundles and scores offline responses', async () => {
    const mod: any = await import('../src/core/agent-behavior-eval.ts');
    expect(typeof mod.buildAgentBehaviorRequestBundle).toBe('function');
    expect(typeof mod.scoreAgentBehaviorResponseBundle).toBe('function');
    const plan = mod.buildEnterpriseAgentBehaviorEvalPlan().slice(0, 5);
    const bundle = mod.buildAgentBehaviorRequestBundle(plan);
    expect(bundle.metric).toBe('agent-behavior-requests');
    expect(bundle.requests).toHaveLength(5);
    expect(bundle.corpusSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(bundle.oracleSha256).toMatch(/^[a-f0-9]{64}$/);
    const serialized = JSON.stringify(bundle.requests);
    expect(serialized.includes('expected')).toBe(false);
    expect(serialized.includes('forbidden')).toBe(false);
    const responses = {
      schemaVersion: 1,
      metric: 'agent-behavior-responses',
      providerId: 'offline-fixture',
      responses: bundle.requests.map((request: any, index: number) => ({ caseId: request.caseId, response: { ...plan[index].expected } })),
    };
    const scored = mod.scoreAgentBehaviorResponseBundle(responses, plan);
    expect(scored.providerId).toBe('offline-fixture');
    expect(scored.passed).toBe(5);
    expect(scored.cases.every((item: any) => item.category)).toBe(true);
    expect(scored.corpusSha256).toBe(bundle.corpusSha256);
    expect(scored.oracleSha256).toBe(bundle.oracleSha256);
  });

  test('loads scored evidence from the repository and rejects stale Skill corpora', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const mod: any = await import('../src/core/agent-behavior-eval.ts');
    expect(typeof mod.loadAgentBehaviorEvidenceSnapshot).toBe('function');
    const plan = mod.buildEnterpriseAgentBehaviorEvalPlan().slice(0, 5);
    const requestBundle = mod.buildAgentBehaviorRequestBundle(plan);
    const scored = mod.scoreAgentBehaviorResponseBundle({
      schemaVersion: 1, metric: 'agent-behavior-responses', providerId: 'offline-fixture',
      responses: requestBundle.requests.map((request: any, index: number) => ({ caseId: request.caseId, response: { ...plan[index].expected } })),
    }, plan);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-agent-evidence-'));
    fs.mkdirSync(path.join(root, 'evals', 'results'), { recursive: true });
    fs.writeFileSync(path.join(root, 'evals', 'results', 'agent-behavior-v1.json'), JSON.stringify(scored));
    const loaded = mod.loadAgentBehaviorEvidenceSnapshot(root, plan);
    expect(loaded.fresh).toBe(true);
    const stalePlan = plan.map((item: any, index: number) => index === 0 ? { ...item, instruction: `${item.instruction} changed` } : item);
    const stale = mod.loadAgentBehaviorEvidenceSnapshot(root, stalePlan);
    expect(stale.fresh).toBe(false);
    expect(stale.reason).toContain('stale');
  });

  test('provider request bundles blind evaluation categories behind opaque case IDs', async () => {
    const mod: any = await import('../src/core/agent-behavior-eval.ts');
    const plan = mod.buildEnterpriseAgentBehaviorEvalPlan();
    const bundle = mod.buildAgentBehaviorRequestBundle(plan);
    expect(bundle.requests.length).toBeGreaterThan(100);
    expect(bundle.requests.every((item: any) => /^case-[a-f0-9]{24}$/.test(item.caseId))).toBe(true);
    expect(JSON.stringify(bundle.requests).includes('::holdout')).toBe(false);
    expect(JSON.stringify(bundle.requests).includes('"category"')).toBe(false);
    expect(plan.some((item: any) => item.skillId === 'fable-verify')).toBe(false);
  });

  test('rejects tampered evidence even when aggregate pass counts were forged consistently', async () => {
    const mod: any = await import('../src/core/agent-behavior-eval.ts');
    const plan = mod.buildEnterpriseAgentBehaviorEvalPlan().slice(0, 5);
    const requests = mod.buildAgentBehaviorRequestBundle(plan);
    const scored = mod.scoreAgentBehaviorResponseBundle({
      schemaVersion: 1,
      metric: 'agent-behavior-responses',
      providerId: 'fixture-provider',
      responses: requests.requests.map((request: any, index: number) => ({
        caseId: request.caseId,
        response: { ...plan[index].expected },
      })),
    }, plan);
    scored.cases[0].response = { action: 'definitely-wrong-action' };
    scored.cases[0].passed = true;
    const validation = mod.validateAgentBehaviorEvidenceSnapshot(scored, plan);
    expect(validation.fresh).toBe(false);
    expect(validation.reason).toContain('case verdict');
  });
});
