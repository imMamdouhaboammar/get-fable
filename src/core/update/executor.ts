import type { LockHandle } from './lock.js';
import type { ProcessRunner, UpdatePlan, UpdateReceipt, UpdateReceiptOutcome } from './types.js';

export interface ExecutorDeps {
  run: ProcessRunner;
  verifyInstalledVersion: () => string;
  acquireLock: (plan: UpdatePlan) => LockHandle;
  releaseLock: (handle: LockHandle) => void;
}

function failureReceipt(
  plan: UpdatePlan,
  outcome: Exclude<UpdateReceiptOutcome, 'success'>,
  message: string,
  verifiedVersion?: string
): UpdateReceipt {
  return {
    success: false,
    outcome,
    strategy: plan.strategy,
    targetVersion: plan.targetVersion,
    ...(verifiedVersion ? { verifiedVersion } : {}),
    message,
  };
}

export function executeUpdate(plan: UpdatePlan, deps: ExecutorDeps): UpdateReceipt {
  if (plan.strategy === 'notify-only') {
    return failureReceipt(plan, 'notify-only', plan.reason || 'Update plan is notification-only');
  }

  if (!plan.executable || !plan.argv) {
    return failureReceipt(plan, 'unsupported', `Strategy ${plan.strategy} is not executable in this updater stage`);
  }

  let lock: LockHandle;
  try {
    lock = deps.acquireLock(plan);
  } catch {
    return failureReceipt(plan, 'lock-failure', 'Update lock could not be acquired safely');
  }

  try {
    let result;
    try {
      result = deps.run(plan.executable, [...plan.argv]);
    } catch {
      return failureReceipt(plan, 'command-failure', 'Update command execution failed');
    }

    if (result.status !== 0) {
      return failureReceipt(plan, 'command-failure', `Update command failed with exit status ${result.status}`);
    }

    let verifiedVersion: string;
    try {
      verifiedVersion = deps.verifyInstalledVersion();
    } catch {
      return failureReceipt(plan, 'verification-failure', 'Post-update version verification failed');
    }

    if (verifiedVersion !== plan.targetVersion) {
      return failureReceipt(
        plan,
        'verification-failure',
        `Post-update version verification mismatch: expected ${plan.targetVersion}, found ${verifiedVersion}`,
        verifiedVersion
      );
    }

    return {
      success: true,
      outcome: 'success',
      strategy: plan.strategy,
      targetVersion: plan.targetVersion,
      verifiedVersion,
      message: `Updated and verified get-fable ${verifiedVersion}`,
    };
  } finally {
    deps.releaseLock(lock);
  }
}
