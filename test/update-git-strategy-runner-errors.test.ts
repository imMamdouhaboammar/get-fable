import { describe, expect, test } from 'bun:test';
import { executeGitUpdate, type GitUpdatePlan } from '../src/core/update/git-strategy.ts';
import type { ProcessRunner } from '../src/core/update/types.ts';

const previousSha = '1111111111111111111111111111111111111111';
const targetSha = '2222222222222222222222222222222222222222';

function plan(dependencyInputsChanged: boolean): GitUpdatePlan {
  return {
    repoRoot: '/workspace/get-fable',
    previousSha,
    upstreamRef: 'origin/master',
    targetSha,
    dependencyInputsChanged,
  };
}

function gitAwareRun(throwOn: 'install' | 'build'): ProcessRunner {
  return (executable, argv) => {
    if (executable === 'git') {
      if (argv[0] === 'rev-parse' && argv[1] === '--is-inside-work-tree') {
        return { status: 0, stdout: 'true\n', stderr: '' };
      }
      if (argv[0] === 'status') return { status: 0, stdout: '', stderr: '' };
      if (argv[0] === 'rev-parse' && argv.includes('--verify')) {
        return { status: 1, stdout: '', stderr: '' };
      }
      if (argv[0] === 'rev-parse' && argv[1] === 'HEAD') {
        return { status: 0, stdout: `${previousSha}\n`, stderr: '' };
      }
      if (argv[0] === 'merge') return { status: 0, stdout: '', stderr: '' };
      return { status: 1, stdout: '', stderr: 'unexpected git command' };
    }

    if (executable === 'bun' && argv[0] === 'install') {
      if (throwOn === 'install') throw new Error('install runner exploded with private detail');
      return { status: 0, stdout: '', stderr: '' };
    }
    if (executable === 'bun' && argv[0] === 'run' && argv[1] === 'build') {
      if (throwOn === 'build') throw new Error('build runner exploded with private detail');
      return { status: 0, stdout: '', stderr: '' };
    }

    return { status: 127, stdout: '', stderr: 'unexpected executable' };
  };
}

describe('Git post-move runner exceptions', () => {
  test('preserves previous SHA and recovery guidance when dependency runner throws', () => {
    const receipt = executeGitUpdate(plan(true), '1.6.0', {
      run: gitAwareRun('install'),
      verifyInstalledVersion: () => '1.6.0',
    });

    expect(receipt.success).toBe(false);
    expect(receipt.outcome).toBe('command-failure');
    expect(receipt.message).toContain(previousSha);
    expect(receipt.message).toMatch(/inspect|git .*diff|recovery/i);
    expect(receipt.message).not.toContain('private detail');
  });

  test('preserves previous SHA and recovery guidance when build runner throws', () => {
    const receipt = executeGitUpdate(plan(false), '1.6.0', {
      run: gitAwareRun('build'),
      verifyInstalledVersion: () => '1.6.0',
    });

    expect(receipt.success).toBe(false);
    expect(receipt.outcome).toBe('command-failure');
    expect(receipt.message).toContain(previousSha);
    expect(receipt.message).toMatch(/inspect|git .*diff|recovery/i);
    expect(receipt.message).not.toContain('private detail');
  });
});
