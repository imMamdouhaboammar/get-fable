import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, test } from 'bun:test';
import {
  executeGitUpdate,
  preflightGitUpdate,
  type GitUpdatePlan,
} from '../src/core/update/git-strategy.ts';
import type { ProcessRunner } from '../src/core/update/types.ts';

const tempDirs: string[] = [];

const runProcess: ProcessRunner = (executable, argv, options = {}) => {
  const result = spawnSync(executable, argv, {
    cwd: options.cwd,
    encoding: 'utf-8',
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
};

function mustRun(executable: string, argv: string[], cwd?: string): string {
  const result = runProcess(executable, argv, { cwd });
  if (result.status !== 0) {
    throw new Error(`${executable} ${argv.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

interface GitFixture {
  root: string;
  remote: string;
  publisher: string;
  checkout: string;
}

function write(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

function commitAll(cwd: string, message: string): string {
  mustRun('git', ['add', '-A'], cwd);
  mustRun('git', ['commit', '-m', message], cwd);
  return mustRun('git', ['rev-parse', 'HEAD'], cwd);
}

function createFixture(): GitFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-git-update-'));
  tempDirs.push(root);
  const remote = path.join(root, 'remote.git');
  const publisher = path.join(root, 'publisher');
  const checkout = path.join(root, 'checkout');

  mustRun('git', ['init', '--bare', remote]);
  mustRun('git', ['symbolic-ref', 'HEAD', 'refs/heads/master'], remote);
  mustRun('git', ['init', publisher]);
  mustRun('git', ['config', 'user.email', 'tests@example.com'], publisher);
  mustRun('git', ['config', 'user.name', 'Updater Tests'], publisher);
  write(path.join(publisher, 'package.json'), '{"name":"get-fable","version":"1.5.1"}\n');
  write(path.join(publisher, 'bun.lock'), 'lock-v1\n');
  write(path.join(publisher, 'README.md'), 'initial\n');
  commitAll(publisher, 'initial');
  mustRun('git', ['branch', '-M', 'master'], publisher);
  mustRun('git', ['remote', 'add', 'origin', remote], publisher);
  mustRun('git', ['push', '-u', 'origin', 'master'], publisher);
  mustRun('git', ['clone', remote, checkout]);
  mustRun('git', ['config', 'user.email', 'tests@example.com'], checkout);
  mustRun('git', ['config', 'user.name', 'Updater Tests'], checkout);

  return { root, remote, publisher, checkout };
}

function publishChange(
  fixture: GitFixture,
  files: Record<string, string>,
  message = 'remote update'
): string {
  for (const [name, content] of Object.entries(files)) {
    write(path.join(fixture.publisher, name), content);
  }
  const sha = commitAll(fixture.publisher, message);
  mustRun('git', ['push', 'origin', 'master'], fixture.publisher);
  return sha;
}

function interceptBun(calls: string[][], overrides: { buildStatus?: number; installStatus?: number } = {}): ProcessRunner {
  return (executable, argv, options) => {
    if (executable === 'git') return runProcess(executable, argv, options);
    calls.push([executable, ...argv]);
    if (executable !== 'bun') return { status: 127, stdout: '', stderr: 'unexpected executable' };
    if (argv[0] === 'install') {
      return { status: overrides.installStatus ?? 0, stdout: '', stderr: '' };
    }
    if (argv[0] === 'run' && argv[1] === 'build') {
      return { status: overrides.buildStatus ?? 0, stdout: '', stderr: '' };
    }
    return { status: 127, stdout: '', stderr: 'unexpected bun command' };
  };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('guarded Git checkout update strategy', () => {
  test('rejects tracked dirt before network fetch or checkout movement', () => {
    const fixture = createFixture();
    publishChange(fixture, { 'README.md': 'remote\n' });
    write(path.join(fixture.checkout, 'README.md'), 'local dirty\n');
    const calls: string[][] = [];
    const run: ProcessRunner = (executable, argv, options) => {
      calls.push([executable, ...argv]);
      return runProcess(executable, argv, options);
    };
    const before = mustRun('git', ['rev-parse', 'HEAD'], fixture.checkout);

    expect(() => preflightGitUpdate(fixture.checkout, run)).toThrow(/clean|dirty|worktree/i);
    expect(calls.some((call) => call[0] === 'git' && call[1] === 'fetch')).toBe(false);
    expect(mustRun('git', ['rev-parse', 'HEAD'], fixture.checkout)).toBe(before);
  });

  test('rejects untracked files before network fetch', () => {
    const fixture = createFixture();
    write(path.join(fixture.checkout, 'local-only.txt'), 'do not overwrite\n');
    const calls: string[][] = [];
    const run: ProcessRunner = (executable, argv, options) => {
      calls.push([executable, ...argv]);
      return runProcess(executable, argv, options);
    };

    expect(() => preflightGitUpdate(fixture.checkout, run)).toThrow(/clean|dirty|untracked|worktree/i);
    expect(calls.some((call) => call[0] === 'git' && call[1] === 'fetch')).toBe(false);
  });

  test('rejects a checkout without an upstream', () => {
    const fixture = createFixture();
    mustRun('git', ['branch', '--unset-upstream'], fixture.checkout);

    expect(() => preflightGitUpdate(fixture.checkout, runProcess)).toThrow(/upstream/i);
  });

  test('rejects detached HEAD before mutation', () => {
    const fixture = createFixture();
    const before = mustRun('git', ['rev-parse', 'HEAD'], fixture.checkout);
    mustRun('git', ['checkout', '--detach', before], fixture.checkout);

    expect(() => preflightGitUpdate(fixture.checkout, runProcess)).toThrow(/branch|detached|upstream/i);
    expect(mustRun('git', ['rev-parse', 'HEAD'], fixture.checkout)).toBe(before);
  });

  test('fetches before resolving the target and rejects a diverged history', () => {
    const fixture = createFixture();
    write(path.join(fixture.checkout, 'local.txt'), 'local\n');
    commitAll(fixture.checkout, 'local divergence');
    publishChange(fixture, { 'remote.txt': 'remote\n' }, 'remote divergence');
    const calls: string[][] = [];
    const run: ProcessRunner = (executable, argv, options) => {
      calls.push([executable, ...argv]);
      return runProcess(executable, argv, options);
    };

    expect(() => preflightGitUpdate(fixture.checkout, run)).toThrow(/fast-forward|diverg/i);
    const fetchIndex = calls.findIndex((call) => call[0] === 'git' && call[1] === 'fetch');
    const upstreamResolveIndex = calls.findIndex(
      (call) => call[0] === 'git' && call[1] === 'rev-parse' && call.includes('@{u}')
    );
    expect(fetchIndex).toBeGreaterThanOrEqual(0);
    expect(upstreamResolveIndex).toBeGreaterThan(fetchIndex);
  });

  test('plans a clean fast-forward and detects dependency input changes', () => {
    const fixture = createFixture();
    const previousSha = mustRun('git', ['rev-parse', 'HEAD'], fixture.checkout);
    const targetSha = publishChange(fixture, {
      'package.json': '{"name":"get-fable","version":"1.6.0"}\n',
      'bun.lock': 'lock-v2\n',
    });

    const plan = preflightGitUpdate(fixture.checkout, runProcess);

    expect(plan.previousSha).toBe(previousSha);
    expect(plan.targetSha).toBe(targetSha);
    expect(plan.upstreamRef).toMatch(/origin\/master/);
    expect(plan.dependencyInputsChanged).toBe(true);
    expect(mustRun('git', ['rev-parse', 'HEAD'], fixture.checkout)).toBe(previousSha);
  });

  test('does not mark a documentation-only fast-forward as dependency-changing', () => {
    const fixture = createFixture();
    publishChange(fixture, { 'README.md': 'docs only\n' });

    const plan = preflightGitUpdate(fixture.checkout, runProcess);

    expect(plan.dependencyInputsChanged).toBe(false);
  });

  test('moves only by fast-forward, reconciles dependencies when needed, builds, then verifies', () => {
    const fixture = createFixture();
    publishChange(fixture, {
      'package.json': '{"name":"get-fable","version":"1.6.0"}\n',
      'bun.lock': 'lock-v2\n',
    });
    const plan = preflightGitUpdate(fixture.checkout, runProcess);
    const calls: string[][] = [];

    const receipt = executeGitUpdate(plan, '1.6.0', {
      run: interceptBun(calls),
      verifyInstalledVersion: () => '1.6.0',
    });

    expect(receipt.success).toBe(true);
    expect(receipt.verifiedVersion).toBe('1.6.0');
    expect(calls).toEqual([
      ['bun', 'install', '--frozen-lockfile'],
      ['bun', 'run', 'build'],
    ]);
    expect(mustRun('git', ['rev-parse', 'HEAD'], fixture.checkout)).toBe(plan.targetSha);
  });

  test('skips dependency installation when dependency inputs did not change', () => {
    const fixture = createFixture();
    publishChange(fixture, { 'README.md': 'docs-only update\n' });
    const plan = preflightGitUpdate(fixture.checkout, runProcess);
    const calls: string[][] = [];

    const receipt = executeGitUpdate(plan, '1.5.1', {
      run: interceptBun(calls),
      verifyInstalledVersion: () => '1.5.1',
    });

    expect(receipt.success).toBe(true);
    expect(plan.dependencyInputsChanged).toBe(false);
    expect(calls).toEqual([['bun', 'run', 'build']]);
  });

  test('revalidates the checkout immediately before movement', () => {
    const fixture = createFixture();
    publishChange(fixture, { 'README.md': 'remote\n' });
    const plan = preflightGitUpdate(fixture.checkout, runProcess);
    write(path.join(fixture.checkout, 'late-local.txt'), 'appeared after planning\n');

    const receipt = executeGitUpdate(plan, '1.6.0', {
      run: runProcess,
      verifyInstalledVersion: () => '1.6.0',
    });

    expect(receipt.success).toBe(false);
    expect(receipt.message).toMatch(/changed|clean|worktree|preflight/i);
    expect(mustRun('git', ['rev-parse', 'HEAD'], fixture.checkout)).toBe(plan.previousSha);
  });

  test('reports the previous revision and non-destructive recovery guidance after a post-move build failure', () => {
    const fixture = createFixture();
    publishChange(fixture, {
      'package.json': '{"name":"get-fable","version":"1.6.0"}\n',
      'README.md': 'release\n',
    });
    const plan = preflightGitUpdate(fixture.checkout, runProcess);
    const calls: string[][] = [];

    const receipt = executeGitUpdate(plan, '1.6.0', {
      run: interceptBun(calls, { buildStatus: 9 }),
      verifyInstalledVersion: () => '1.6.0',
    });

    expect(receipt.success).toBe(false);
    expect(receipt.message).toContain(plan.previousSha);
    expect(receipt.message).toMatch(/git .*diff|inspect|recovery/i);
    expect(receipt.message).not.toMatch(/reset\s+--hard/i);
    expect(mustRun('git', ['rev-parse', 'HEAD'], fixture.checkout)).toBe(plan.targetSha);
  });

  test('reports recovery context when version verification fails after movement', () => {
    const fixture = createFixture();
    publishChange(fixture, {
      'package.json': '{"name":"get-fable","version":"1.6.0"}\n',
      'README.md': 'release\n',
    });
    const plan = preflightGitUpdate(fixture.checkout, runProcess);

    const receipt = executeGitUpdate(plan, '1.6.0', {
      run: interceptBun([]),
      verifyInstalledVersion: () => '1.5.1',
    });

    expect(receipt.success).toBe(false);
    expect(receipt.outcome).toBe('verification-failure');
    expect(receipt.verifiedVersion).toBe('1.5.1');
    expect(receipt.message).toContain(plan.previousSha);
  });

  test('never requires a destructive reset command to apply or recover', () => {
    const fixture = createFixture();
    publishChange(fixture, { 'README.md': 'remote\n' });
    const plan: GitUpdatePlan = preflightGitUpdate(fixture.checkout, runProcess);
    const gitCalls: string[][] = [];
    const run: ProcessRunner = (executable, argv, options) => {
      if (executable === 'git') gitCalls.push([...argv]);
      if (executable === 'bun') return { status: 0, stdout: '', stderr: '' };
      return runProcess(executable, argv, options);
    };

    executeGitUpdate(plan, '1.5.1', {
      run,
      verifyInstalledVersion: () => '1.5.1',
    });

    expect(gitCalls.some((argv) => argv[0] === 'reset' && argv.includes('--hard'))).toBe(false);
  });
});
