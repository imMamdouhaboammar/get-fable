import { describe, expect, test } from 'bun:test';
import { extractHardPolicy, isHardPolicyViolation } from '../../../src/core/reflex/policy-snapshot.js';
import type { FableState, RoutingDecision } from '../../../src/core/types.js';

describe('HardPolicySnapshot & Violation Checker', () => {
  const baseDecision = (skill: string): RoutingDecision => ({
    selectedSkill: skill as any,
    selectedPack: 'core',
    taskShape: 'feature',
    confidence: 0.9,
    reasons: ['mock route'],
    requiresPlan: false,
    requiredGates: [],
    fallbackSkill: null,
    parallelCandidates: [],
    nextSkills: [],
    scores: {} as any,
  });

  test('locks recovery when failure streak is 2 or more', () => {
    const state: Partial<FableState> = { failureStreak: 2 };
    const policy = extractHardPolicy('Fix failing test', state as any, baseDecision('fable-recover'));

    expect(policy.recoveryLocked).toBe(true);
    const violation = isHardPolicyViolation(policy, baseDecision('fable-recover'), 'fable-execute');
    expect(violation.violated).toBe(true);
    expect(violation.reason).toContain('Violates recovery lock');
  });

  test('locks security for explicit redteam or heal', () => {
    const redteamDecision = baseDecision('fable-redteam');
    const policy = extractHardPolicy('Run pentest against API', null, redteamDecision);

    expect(policy.securityLocked).toBe(true);
    const violation = isHardPolicyViolation(policy, redteamDecision, 'fable-tdd');
    expect(violation.violated).toBe(true);
    expect(violation.reason).toContain('Violates security lock');
  });

  test('locks release for explicit ship/publish task', () => {
    const releaseDecision = baseDecision('fable-release');
    const policy = extractHardPolicy('Prepare release v2.0', null, releaseDecision);

    expect(policy.releaseLocked).toBe(true);
    const violation = isHardPolicyViolation(policy, releaseDecision, 'fable-plan');
    expect(violation.violated).toBe(true);
  });

  test('enforces user suppressions against proposed skills', () => {
    const task = 'Refactor internal module without planning and do not delegate';
    const policy = extractHardPolicy(task, null, baseDecision('fable-execute'));

    expect(isHardPolicyViolation(policy, baseDecision('fable-execute'), 'fable-plan').violated).toBe(true);
    expect(isHardPolicyViolation(policy, baseDecision('fable-execute'), 'fable-delegate').violated).toBe(true);
    expect(isHardPolicyViolation(policy, baseDecision('fable-execute'), 'fable-simplify').violated).toBe(false);
  });
});
