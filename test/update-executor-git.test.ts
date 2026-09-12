import { describe, expect, test } from 'bun:test';
import { executeUpdate, type ExecutorDeps } from '../src/core/update/executor.ts';
import type { UpdatePlan, UpdateReceipt } from '../src/core/update/types.ts';
import type { LockHandle } from '../src/core/update/lock.ts';

function gitPlan(): UpdatePlan {
  return {
    currentVersion: '1.5.1',
    targetVersion: '1.6.0',
    installation: {
      method: 'git-checkout',
      executablePath: '/workspace/get-fable/bin/get-fable.js',
      repoRoot: '/workspace/get-fable',
      packageRoot: '/workspace/get-fable',
      evidence: ['fixture:git-checkout'],
    },
    strategy: 'git-checkout',
    requiresConfirmation: true,
    reason: 'guarded Git update',
  };
}

function handle(): LockHandle {
  return {
    path: '/tmp/update.lock',
    token: 'owner-token',
    record: {
      schemaVersion: 1,
      token: 'owner-token',
      pid: 4242,
      acquiredAt: '2026-09-12T12:00:00.000Z',
      targetVersion: '1.6.0',
      installationMethod: 'git-checkout',
    },
  };
}

function gitSuccess(): UpdateReceipt {
  return {
    success: true,
    outcome: 'success',
    strategy: 'git-checkout',
    targetVersion: '1.6.0',
    verifiedVersion: '1.6.0',
    message: 'updated',
  };
}

function deps(overrides: Partial<ExecutorDeps> = {}): ExecutorDeps {
  return {
    run: () => ({ status: 0, stdout: '', stderr: '' }),
    verifyInstalledVersion: () => '1.6.0',
    acquireLock: () => handle(),
    releaseLock: () => {},
    executeGitUpdate: () => gitSuccess(),
    ...overrides,
  };
}

describe('explicit executor Git delegation', () => {
  test('holds the owner-token lock around the Git strategy', () => {
    const events: string[] = [];

    const receipt = executeUpdate(
      gitPlan(),
      deps({
        acquireLock: () => {
          events.push('acquire');
          return handle();
        },
        executeGitUpdate: () => {
          events.push('git');
          return gitSuccess();
        },
        releaseLock: () => {
          events.push('release');
        },
      })
    );

    expect(receipt.success).toBe(true);
    expect(events).toEqual(['acquire', 'git', 'release']);
  });

  test('fails closed before locking when the Git strategy is not configured', () => {
    let acquired = false;
    const configured = deps({
      acquireLock: () => {
        acquired = true;
        return handle();
      },
    });
    delete configured.executeGitUpdate;

    const receipt = executeUpdate(gitPlan(), configured);

    expect(receipt.success).toBe(false);
    expect(receipt.outcome).toBe('unsupported');
    expect(acquired).toBe(false);
  });

  test('releases the lock and redacts thrown Git-strategy details', () => {
    const events: string[] = [];
    const receipt = executeUpdate(
      gitPlan(),
      deps({
        acquireLock: () => {
          events.push('acquire');
          return handle();
        },
        executeGitUpdate: () => {
          events.push('git');
          throw new Error('secret remote credential');
        },
        releaseLock: () => {
          events.push('release');
        },
      })
    );

    expect(receipt.success).toBe(false);
    expect(receipt.outcome).toBe('command-failure');
    expect(receipt.message).not.toContain('credential');
    expect(events).toEqual(['acquire', 'git', 'release']);
  });

  test('reports lock-release failure even after successful Git verification', () => {
    const receipt = executeUpdate(
      gitPlan(),
      deps({
        releaseLock: () => {
          throw new Error('unlink detail');
        },
      })
    );

    expect(receipt.success).toBe(false);
    expect(receipt.outcome).toBe('release-failure');
    expect(receipt.verifiedVersion).toBe('1.6.0');
    expect(receipt.message).not.toContain('unlink detail');
  });
});
