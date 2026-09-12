import type { LockHandle } from './lock.js';
import type { ProcessRunner, UpdatePlan, UpdateReceipt } from './types.js';

export interface ExecutorDeps {
  run: ProcessRunner;
  verifyInstalledVersion: () => string;
  acquireLock: (plan: UpdatePlan) => LockHandle;
  releaseLock: (handle: LockHandle) => void;
}

function unsupportedReceipt(plan: UpdatePlan, message: string): UpdateReceipt {
  return {
    success: false,
    strategy: plan.strategy,
    targetVersion: plan.targetVersion,
    message,
  };
}

export function executeUpdate(plan: UpdatePlan, deps: ExecutorDeps): UpdateReceipt {
  if (plan.strategy === 'notify-only') {
    return unsupportedReceipt(plan, plan.reason || 'Update plan is notification-only');
  }

  if (!plan.executable || !plan.argv) {
    return unsupportedReceipt(plan, `Strategy ${plan.strategy} is not executable in this updater stage`);
  }

  const lock = deps.acquireLock(plan);
  try {
    const result = deps.run(plan.executable, [...plan.argv]);
    if (result.status !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim();
      return unsupportedReceipt(
        plan,
        `Update command failed with exit status ${result.status}${detail ? `: ${detail}` : ''}`
      );
    }

    const verifiedVersion = deps.verifyInstalledVersion();
    if (verifiedVersion !== plan.targetVersion) {
      return {
        success: false,
        strategy: plan.strategy,
        targetVersion: plan.targetVersion,
        verifiedVersion,
        message: `Post-update version verification mismatch: expected ${plan.targetVersion}, found ${verifiedVersion}`,
      };
    }

    return {
      success: true,
      strategy: plan.strategy,
      targetVersion: plan.targetVersion,
      verifiedVersion,
      message: `Updated and verified get-fable ${verifiedVersion}`,
    };
  } finally {
    deps.releaseLock(lock);
  }
}
