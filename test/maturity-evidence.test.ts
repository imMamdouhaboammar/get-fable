import { describe, expect, test } from 'bun:test';
import { computeEvidenceBackedMaturity, evaluateSkillMaturity } from '../src/core/maturity.ts';

describe('evidence-backed maturity', () => {
  test('presence-only resources can never produce M4', () => {
    expect(computeEvidenceBackedMaturity({
      sourceAvailable: true, structured: true, contractValid: true,
      runtimeIntegrated: true, knownCases: 5, knownPassRate: 1,
      negativeCases: 0, negativePassRate: 1, ambiguousCases: 0, ambiguousPassRate: 1,
      adversarialCases: 0, adversarialPassRate: 1, holdoutCases: 0, holdoutPassRate: 1,
      enterpriseGatesPassed: false,
    })).toBe('M3');
  });

  test('all canonical skills have a deterministic runtime integration proof independent from behavioral maturity', async () => {
    const { canonicalSkillIds } = await import('../src/core/skill-registry.ts');
    const evidence = canonicalSkillIds().map((id) => evaluateSkillMaturity(id));
    expect(evidence.filter((item) => !item.runtimeIntegrated).map((item) => item.id)).toEqual([]);
    expect(evidence.every((item) => ['M3', 'M4', 'M5'].includes(item.maturity))).toBe(true);
  });

  test('current skill maturity records checked and unchecked behavioral evidence explicitly', () => {
    const evidence = evaluateSkillMaturity('get-fable');
    expect(evidence.packageValid).toBe(true);
    expect(evidence.behavior.known.total).toBeGreaterThan(0);
    expect(evidence.behavior.holdout.status).toBe('PASS');
    expect(evidence.maturity).toBe('M4');
    expect(evidence.enterpriseReady).toBe(false);
  });
});
