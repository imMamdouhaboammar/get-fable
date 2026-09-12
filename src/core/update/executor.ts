import { UpdateLockError, type LockHandle } from './lock.js';
import type { ProcessRunner, UpdatePlan, UpdateReceipt, UpdateReceiptOutcome } from './types.js';

export interface ExecutorDeps {
  run: ProcessRunner;
  verifyInstalledVersion: () => string;
  acquireLock: (plan: UpdatePlan) => LockHandle;
  releaseLock: (handle: LockHandle) => void;
}

function lockFailureMessage(error: unknown): string {
  if (!(error instanceof UpdateLockError)) {
    return 'Update lock could not be acquired safely';
  }

  switch (error.code) {
    case 'owner-alive':
      return 'Another updater still owns the update lock; wait for it to finish, then retry';
    case 'owner-liveness-unknown':
      return 'Update lock ownership could not be verified; inspect the existing updater process before retrying, and remove the lock only after confirming the owner is absent';
    case 'reclaim-race':
      return 'Update lock ownership changed during recovery; retry after the other updater finishes';
  }
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

function executeOwnedUpdate(
  plan: UpdatePlan,
  executable: string,
  argv: string[],
  deps: ExecutorDeps
): UpdateReceipt {
  let result;
  try {
    result = deps.run(executable, [...argv]);
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
  } catch (error) {
    return failureReceipt(plan, 'lock-failure', lockFailureMessage(error));
  }

  let receipt: UpdateReceipt | null = null;
  let releaseFailed = false;
  try {
    receipt = executeOwnedUpdate(plan, plan.executable, plan.argv, deps);
  } finally {
    try {
      deps.releaseLock(lock);
    } catch {
      releaseFailed = true;
    }
  }

  if (releaseFailed) {
    return failureReceipt(
      plan,
      'release-failure',
      'Update lock could not be released safely',
      receipt?.verifiedVersion
    );
  }

  if (!receipt) {
    throw new Error('Update execution completed without a receipt');
  }

  return receipt;
}
