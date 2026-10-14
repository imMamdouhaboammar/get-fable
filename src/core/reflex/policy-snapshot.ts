import type {
  FableState,
  RoutingDecision,
} from '../types.js';
import { extractTaskConstraints } from './envelope.js';
import type { HardPolicySnapshot } from './types.js';

import { RECOVERY_FAILURE_THRESHOLD } from '../task-router.js';
export { RECOVERY_FAILURE_THRESHOLD };

/**
 * Extracts non-negotiable hard-policy constraints from task, lifecycle state, and deterministic routing.
 */
export function extractHardPolicy(
  task: string,
  state: FableState | null | undefined,
  deterministic: RoutingDecision
): HardPolicySnapshot {
  const suppressions = extractTaskConstraints(task);
  const reasons: string[] = [];

  // 1. Recovery Lock
  const failureStreak = state?.failureStreak || 0;
  const isRecoveringPhase = state?.phase === 'recovering';
  const isRecoveryTask = /failed twice|fails twice|same (?:test|command|fix|failure)|retry(?:ing|ied)?|still fail|keeps? failing|doesn['’]?t work|didn['’]?t work|stale|cache|wrong branch|wrong build|no effect/i.test(
    task
  );
  const recoveryLocked =
    failureStreak >= RECOVERY_FAILURE_THRESHOLD ||
    isRecoveringPhase ||
    deterministic.selectedSkill === 'fable-recover';

  if (recoveryLocked) {
    reasons.push('recovery-lock: deterministic recovery cannot be downgraded');
  }

  // 2. Security Lock (redteam, heal, security boundary)
  const isRedteam = deterministic.selectedSkill === 'fable-redteam';
  const isHeal = deterministic.selectedSkill === 'fable-heal';
  const isSecurity = deterministic.selectedSkill === 'fable-security';
  const securityLocked = isRedteam || isHeal || isSecurity;

  if (securityLocked) {
    reasons.push(`security-lock: explicit ${deterministic.selectedSkill} cannot be downgraded`);
  }

  // 3. Release Lock
  const releaseLocked = deterministic.selectedSkill === 'fable-release';
  if (releaseLocked) {
    reasons.push('release-lock: explicit release/delivery route cannot be downgraded');
  }

  // 4. Handoff Lock
  const handoffLocked = deterministic.selectedSkill === 'fable-handoff';
  if (handoffLocked) {
    reasons.push('handoff-lock: explicit handoff continuation cannot be downgraded');
  }

  // 5. Eval Lock
  const evalLocked = deterministic.selectedSkill === 'fable-eval';
  if (evalLocked) {
    reasons.push('eval-lock: explicit agent evaluation cannot be downgraded');
  }

  return {
    recoveryLocked,
    securityLocked,
    releaseLocked,
    handoffLocked,
    evalLocked,
    reasons,
    suppressions,
  };
}

/**
 * Checks whether an advisory proposal from Jev would violate hard policy invariants.
 */
export function isHardPolicyViolation(
  policy: HardPolicySnapshot,
  deterministic: RoutingDecision,
  proposedSkill: string
): { violated: boolean; reason?: string } {
  if (policy.recoveryLocked && proposedSkill !== 'fable-recover') {
    return {
      violated: true,
      reason: 'Violates recovery lock: cannot downgrade fable-recover to another skill',
    };
  }

  if (policy.securityLocked && deterministic.selectedSkill === 'fable-security' && proposedSkill !== 'fable-security') {
    return {
      violated: true,
      reason: 'Violates security lock: cannot downgrade fable-security to another skill',
    };
  }

  if (policy.securityLocked && deterministic.selectedSkill === 'fable-redteam' && proposedSkill !== 'fable-redteam') {
    return {
      violated: true,
      reason: 'Violates security lock: cannot downgrade fable-redteam to another skill',
    };
  }

  if (policy.securityLocked && deterministic.selectedSkill === 'fable-heal' && proposedSkill !== 'fable-heal') {
    return {
      violated: true,
      reason: 'Violates security lock: cannot downgrade fable-heal to another skill',
    };
  }

  if (policy.releaseLocked && proposedSkill !== 'fable-release') {
    return {
      violated: true,
      reason: 'Violates release lock: cannot downgrade fable-release to another skill',
    };
  }

  if (policy.handoffLocked && proposedSkill !== 'fable-handoff') {
    return {
      violated: true,
      reason: 'Violates handoff lock: cannot downgrade fable-handoff to another skill',
    };
  }

  // Check explicit suppressions
  if (policy.suppressions.suppressResearch && proposedSkill === 'fable-research') {
    return { violated: true, reason: 'Violates user constraint: research is suppressed' };
  }
  if (policy.suppressions.suppressRelease && proposedSkill === 'fable-release') {
    return { violated: true, reason: 'Violates user constraint: release is suppressed' };
  }
  if (policy.suppressions.suppressSecurity && (proposedSkill === 'fable-security' || proposedSkill === 'fable-redteam' || proposedSkill === 'fable-heal')) {
    return { violated: true, reason: 'Violates user constraint: security is suppressed' };
  }
  if (policy.suppressions.suppressTdd && proposedSkill === 'fable-tdd') {
    return { violated: true, reason: 'Violates user constraint: tdd/behavior-change is suppressed' };
  }
  if (policy.suppressions.suppressPlan && proposedSkill === 'fable-plan') {
    return { violated: true, reason: 'Violates user constraint: planning is suppressed' };
  }
  if (policy.suppressions.suppressReview && proposedSkill === 'fable-review') {
    return { violated: true, reason: 'Violates user constraint: review is suppressed' };
  }
  if (policy.suppressions.suppressDelegation && proposedSkill === 'fable-delegate') {
    return { violated: true, reason: 'Violates user constraint: delegation is suppressed' };
  }

  return { violated: false };
}
