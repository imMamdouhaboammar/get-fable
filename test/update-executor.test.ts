import { describe, expect, test } from 'bun:test';
import { executeUpdate } from '../src/core/update/executor.ts';
import type { UpdatePlan } from '../src/core/update/types.ts';
import type { ExecutorDeps } from '../src/core/update/executor.ts';
import type { LockHandle } from '../src/core/update/lock.ts';

function plan(overrides: Partial<UpdatePlan> = {}): UpdatePlan {
  return {
    currentVersion: '1.5.1',
    targetVersion: '1.6.0',
    installation: {
      method: 'npm-global',
      executablePath: '/usr/local/bin/get-fable',
      evidence: ['fixture:npm-global'],
    },
    strategy: 'npm-global',
    executable: 'npm',
    argv: ['install', '-g', 'get-fable@1.6.0'],
    requiresConfirmation: true,
    reason: 'fixture plan',
    ...overrides,
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
      acquiredAt: '2026-08-29T03:00:00.000Z',
      targetVersion: '1.6.0',
      installationMethod: 'npm-global',
    },
  };
}

function deps(overrides: Partial<ExecutorDeps> = {}): ExecutorDeps {
  return {
    run: () => ({ status: 0, stdout: '', stderr: '' }),
    verifyInstalledVersion: () => '1.6.0',
    acquireLock: () => handle(),
    releaseLock: () => {},
    ...overrides,
  };
}

describe('explicit update executor', () => {
  test('executes the exact Bun argv from the validated plan', () => {
    const calls: Array<{ executable: string; argv: string[] }> = [];
    const receipt = executeUpdate(
      plan({
        installation: {
          method: 'bun-global',
          executablePath: '/home/test/.bun/bin/get-fable',
          evidence: ['fixture:bun-global'],
        },
        strategy: 'bun-global',
        executable: 'bun',
        argv: ['add', '-g', 'get-fable@1.6.0'],
      }),
      deps({
        run: (executable, argv) => {
          calls.push({ executable, argv: [...argv] });
          return { status: 0, stdout: '', stderr: '' };
        },
      })
    );

    expect(calls).toEqual([{ executable: 'bun', argv: ['add', '-g', 'get-fable@1.6.0'] }]);
    expect(receipt.success).toBe(true);
  });

  test('executes the exact npm argv from the validated plan', () => {
    const calls: Array<{ executable: string; argv: string[] }> = [];
    const receipt = executeUpdate(
      plan(),
      deps({
        run: (executable, argv) => {
          calls.push({ executable, argv: [...argv] });
          return { status: 0, stdout: '', stderr: '' };
        },
      })
    );

    expect(calls).toEqual([{ executable: 'npm', argv: ['install', '-g', 'get-fable@1.6.0'] }]);
    expect(receipt.success).toBe(true);
  });

  test('does not acquire a lock or execute for notify-only plans', () => {
    let acquired = false;
    let ran = false;
    const receipt = executeUpdate(
      plan({
        strategy: 'notify-only',
        executable: undefined,
        argv: undefined,
        requiresConfirmation: false,
        reason: 'ownership unknown',
      }),
      deps({
        acquireLock: () => {
          acquired = true;
          return handle();
        },
        run: () => {
          ran = true;
          return { status: 0, stdout: '', stderr: '' };
        },
      })
    );

    expect(acquired).toBe(false);
    expect(ran).toBe(false);
    expect(receipt.success).toBe(false);
    expect(receipt.strategy).toBe('notify-only');
  });

  test('reports command failure without claiming the target version', () => {
    let verified = false;
    const receipt = executeUpdate(
      plan(),
      deps({
        run: () => ({ status: 7, stdout: '', stderr: 'install failed' }),
        verifyInstalledVersion: () => {
          verified = true;
          return '1.6.0';
        },
      })
    );

    expect(receipt.success).toBe(false);
    expect(receipt.message).toMatch(/failed|status|exit/i);
    expect(receipt.verifiedVersion).toBeUndefined();
    expect(verified).toBe(false);
  });

  test('treats status zero followed by a version mismatch as failure', () => {
    const receipt = executeUpdate(
      plan(),
      deps({ verifyInstalledVersion: () => '1.5.1' })
    );

    expect(receipt.success).toBe(false);
    expect(receipt.verifiedVersion).toBe('1.5.1');
    expect(receipt.message).toMatch(/version|verify|mismatch/i);
  });

  test('reports success only after the installed version matches exactly', () => {
    const receipt = executeUpdate(plan(), deps({ verifyInstalledVersion: () => '1.6.0' }));

    expect(receipt.success).toBe(true);
    expect(receipt.verifiedVersion).toBe('1.6.0');
    expect(receipt.targetVersion).toBe('1.6.0');
  });

  test('releases the owned lock in finally when the runner throws', () => {
    const events: string[] = [];

    expect(() =>
      executeUpdate(
        plan(),
        deps({
          acquireLock: () => {
            events.push('acquire');
            return handle();
          },
          run: () => {
            events.push('run');
            throw new Error('runner exploded');
          },
          releaseLock: () => {
            events.push('release');
          },
        })
      )
    ).toThrow(/runner exploded/i);

    expect(events).toEqual(['acquire', 'run', 'release']);
  });

  test('releases the owned lock in finally when verification throws', () => {
    const events: string[] = [];

    expect(() =>
      executeUpdate(
        plan(),
        deps({
          acquireLock: () => {
            events.push('acquire');
            return handle();
          },
          run: () => {
            events.push('run');
            return { status: 0, stdout: '', stderr: '' };
          },
          verifyInstalledVersion: () => {
            events.push('verify');
            throw new Error('verification exploded');
          },
          releaseLock: () => {
            events.push('release');
          },
        })
      )
    ).toThrow(/verification exploded/i);

    expect(events).toEqual(['acquire', 'run', 'verify', 'release']);
  });
});
