import path from 'node:path';
import type { ProcessResult, ProcessRunner, UpdateReceipt } from './types.js';

export interface GitUpdatePlan {
  repoRoot: string;
  previousSha: string;
  upstreamRef: string;
  targetSha: string;
  dependencyInputsChanged: boolean;
}

export interface GitUpdateDeps {
  run: ProcessRunner;
  verifyInstalledVersion: () => string;
}

const DEPENDENCY_INPUTS = ['package.json', 'bun.lock', 'bun.lockb'];
const IN_PROGRESS_REFS = ['MERGE_HEAD', 'REBASE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD'];

function runGit(run: ProcessRunner, repoRoot: string, argv: string[]): ProcessResult {
  return run('git', argv, { cwd: repoRoot });
}

function checkedOutput(
  run: ProcessRunner,
  repoRoot: string,
  argv: string[],
  errorMessage: string
): string {
  const result = runGit(run, repoRoot, argv);
  if (result.status !== 0) throw new Error(errorMessage);
  return result.stdout.trim();
}

function assertCleanCheckout(repoRoot: string, run: ProcessRunner): void {
  const inside = checkedOutput(
    run,
    repoRoot,
    ['rev-parse', '--is-inside-work-tree'],
    'Git checkout could not be verified'
  );
  if (inside !== 'true') throw new Error('Git checkout could not be verified');

  const status = runGit(run, repoRoot, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (status.status !== 0) throw new Error('Git worktree status could not be verified');
  if (status.stdout.trim().length > 0) {
    throw new Error('Git worktree must be clean, including untracked files, before update');
  }

  for (const ref of IN_PROGRESS_REFS) {
    const state = runGit(run, repoRoot, ['rev-parse', '--quiet', '--verify', ref]);
    if (state.status === 0) throw new Error(`Git ${ref} state is in progress; finish or abort it before update`);
  }
}

function currentBranch(repoRoot: string, run: ProcessRunner): string {
  const branch = runGit(run, repoRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  if (branch.status !== 0 || !branch.stdout.trim()) {
    throw new Error('Git update requires an attached branch; detached HEAD is unsupported');
  }
  return branch.stdout.trim();
}

function configuredUpstream(repoRoot: string, branch: string, run: ProcessRunner): string {
  const result = runGit(run, repoRoot, [
    'for-each-ref',
    '--format=%(upstream:short)',
    `refs/heads/${branch}`,
  ]);
  const upstream = result.status === 0 ? result.stdout.trim() : '';
  if (!upstream) throw new Error(`Git branch ${branch} has no upstream`);
  return upstream;
}

function dependencyInputsChanged(
  repoRoot: string,
  previousSha: string,
  targetSha: string,
  run: ProcessRunner
): boolean {
  if (previousSha === targetSha) return false;
  const result = runGit(run, repoRoot, [
    'diff',
    '--name-only',
    previousSha,
    targetSha,
    '--',
    ...DEPENDENCY_INPUTS,
  ]);
  if (result.status !== 0) throw new Error('Git dependency-input diff could not be verified');
  return result.stdout.trim().length > 0;
}

export function preflightGitUpdate(repoRoot: string, run: ProcessRunner): GitUpdatePlan {
  assertCleanCheckout(repoRoot, run);
  const branch = currentBranch(repoRoot, run);
  configuredUpstream(repoRoot, branch, run);
  const previousSha = checkedOutput(run, repoRoot, ['rev-parse', 'HEAD'], 'Git HEAD could not be resolved');

  const fetchResult = runGit(run, repoRoot, ['fetch', '--prune']);
  if (fetchResult.status !== 0) throw new Error('Git fetch failed during update preflight');

  const upstreamRef = checkedOutput(
    run,
    repoRoot,
    ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'],
    `Git branch ${branch} has no upstream`
  );
  const targetSha = checkedOutput(
    run,
    repoRoot,
    ['rev-parse', upstreamRef],
    'Git upstream target could not be resolved after fetch'
  );

  const fastForward = runGit(run, repoRoot, ['merge-base', '--is-ancestor', previousSha, targetSha]);
  if (fastForward.status !== 0) {
    throw new Error('Git upstream is not a fast-forward from the current checkout');
  }

  return {
    repoRoot,
    previousSha,
    upstreamRef,
    targetSha,
    dependencyInputsChanged: dependencyInputsChanged(repoRoot, previousSha, targetSha, run),
  };
}

function failure(
  targetVersion: string,
  outcome: 'preflight-failure' | 'command-failure' | 'verification-failure',
  message: string,
  verifiedVersion?: string
): UpdateReceipt {
  return {
    success: false,
    outcome,
    strategy: 'git-checkout',
    targetVersion,
    ...(verifiedVersion ? { verifiedVersion } : {}),
    message,
  };
}

function safeRecovery(plan: GitUpdatePlan): string {
  const repo = JSON.stringify(path.resolve(plan.repoRoot));
  return `Checkout moved from ${plan.previousSha}. Inspect the change before recovery with: git -C ${repo} diff ${plan.previousSha}..HEAD`;
}

function uncertainMovementRecovery(plan: GitUpdatePlan): string {
  const repo = JSON.stringify(path.resolve(plan.repoRoot));
  return `Previous checkout was ${plan.previousSha}. Movement state could not be confirmed. Inspect the current revision with: git -C ${repo} diff ${plan.previousSha}..HEAD`;
}

function postMoveFailure(
  plan: GitUpdatePlan,
  targetVersion: string,
  outcome: 'command-failure' | 'verification-failure',
  message: string,
  verifiedVersion?: string
): UpdateReceipt {
  return failure(targetVersion, outcome, `${message}. ${safeRecovery(plan)}`, verifiedVersion);
}

export function executeGitUpdate(
  plan: GitUpdatePlan,
  targetVersion: string,
  deps: GitUpdateDeps
): UpdateReceipt {
  try {
    assertCleanCheckout(plan.repoRoot, deps.run);
    const currentSha = checkedOutput(
      deps.run,
      plan.repoRoot,
      ['rev-parse', 'HEAD'],
      'Git HEAD could not be revalidated before update'
    );
    if (currentSha !== plan.previousSha) {
      return failure(
        targetVersion,
        'preflight-failure',
        `Git checkout changed after planning; expected ${plan.previousSha}, found ${currentSha}`
      );
    }
  } catch (error) {
    return failure(
      targetVersion,
      'preflight-failure',
      error instanceof Error ? error.message : 'Git update preflight failed'
    );
  }

  let moved = false;
  if (plan.targetSha !== plan.previousSha) {
    let movement: ProcessResult;
    try {
      movement = runGit(deps.run, plan.repoRoot, ['merge', '--ff-only', plan.targetSha]);
    } catch {
      return failure(
        targetVersion,
        'command-failure',
        `Git fast-forward runner failed. ${uncertainMovementRecovery(plan)}`
      );
    }
    if (movement.status !== 0) {
      return failure(targetVersion, 'command-failure', 'Git fast-forward movement failed');
    }
    moved = true;
  }

  if (plan.dependencyInputsChanged) {
    let install: ProcessResult;
    try {
      install = deps.run('bun', ['install', '--frozen-lockfile'], { cwd: plan.repoRoot });
    } catch {
      return moved
        ? postMoveFailure(plan, targetVersion, 'command-failure', 'Dependency reconciliation runner failed after Git movement')
        : failure(targetVersion, 'command-failure', 'Dependency reconciliation runner failed');
    }
    if (install.status !== 0) {
      return moved
        ? postMoveFailure(plan, targetVersion, 'command-failure', 'Dependency reconciliation failed after Git movement')
        : failure(targetVersion, 'command-failure', 'Dependency reconciliation failed');
    }
  }

  let build: ProcessResult;
  try {
    build = deps.run('bun', ['run', 'build'], { cwd: plan.repoRoot });
  } catch {
    return moved
      ? postMoveFailure(plan, targetVersion, 'command-failure', 'Build runner failed after Git movement')
      : failure(targetVersion, 'command-failure', 'Build runner failed');
  }
  if (build.status !== 0) {
    return moved
      ? postMoveFailure(plan, targetVersion, 'command-failure', 'Build failed after Git movement')
      : failure(targetVersion, 'command-failure', 'Build failed');
  }

  let verifiedVersion: string;
  try {
    verifiedVersion = deps.verifyInstalledVersion();
  } catch {
    return moved
      ? postMoveFailure(plan, targetVersion, 'verification-failure', 'Post-update version verification failed')
      : failure(targetVersion, 'verification-failure', 'Post-update version verification failed');
  }

  if (verifiedVersion !== targetVersion) {
    const message = `Post-update version verification mismatch: expected ${targetVersion}, found ${verifiedVersion}`;
    return moved
      ? postMoveFailure(plan, targetVersion, 'verification-failure', message, verifiedVersion)
      : failure(targetVersion, 'verification-failure', message, verifiedVersion);
  }

  return {
    success: true,
    outcome: 'success',
    strategy: 'git-checkout',
    targetVersion,
    verifiedVersion,
    message: `Updated and verified get-fable ${verifiedVersion}`,
  };
}
