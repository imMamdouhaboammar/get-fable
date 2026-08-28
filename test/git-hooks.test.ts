import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getFableStatus, installGitHooks, initProjectFable } from '../src/installer.ts';

const tempDirs: string[] = [];
const gitHookFiles = ['pre-commit', 'post-commit', 'post-checkout', 'pre-push'] as const;

function tempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-githooks-test-'));
  tempDirs.push(dir);
  return dir;
}

function git(cwd: string, ...args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' }).trim();
}

function linkedWorktreeFixture() {
  const root = tempRoot();
  const main = path.join(root, 'main');
  const linked = path.join(root, 'linked');
  fs.mkdirSync(main);
  git(main, 'init');
  git(main, 'config', 'user.name', 'get-fable test');
  git(main, 'config', 'user.email', 'test@get-fable.invalid');
  fs.writeFileSync(path.join(main, 'README.md'), '# fixture\n');
  git(main, 'add', 'README.md');
  git(main, 'commit', '-m', 'fixture');
  git(main, 'worktree', 'add', '-b', 'linked-test', linked);
  return { main, linked };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('Universal Git hooks installer', () => {
  test('installs pre-commit, post-commit, post-checkout, and pre-push into .git/hooks', () => {
    const root = tempRoot();
    const gitDir = path.join(root, '.git');
    fs.mkdirSync(gitDir, { recursive: true });

    const result = installGitHooks(root);
    expect(result).toBe(true);

    const hooksDir = path.join(gitDir, 'hooks');
    expect(fs.existsSync(path.join(hooksDir, 'pre-commit'))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, 'post-commit'))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, 'post-checkout'))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, 'pre-push'))).toBe(true);
  });

  test('keeps synthetic .git directory installation idempotent and complete', () => {
    const root = tempRoot();
    const hooksDir = path.join(root, '.git', 'hooks');
    fs.mkdirSync(path.join(root, '.git'), { recursive: true });

    expect(installGitHooks(root)).toBe(true);
    expect(getFableStatus(root).gitHooks.installed).toBe(true);
    expect(installGitHooks(root)).toBe(true);
    for (const hookFile of gitHookFiles) {
      expect(fs.existsSync(path.join(hooksDir, hookFile))).toBe(true);
    }
    expect(getFableStatus(root).gitHooks.installed).toBe(true);
  });

  test('pre-push finds Bun from ~/.bun/bin when PATH does not include Bun', () => {
    const root = tempRoot();
    fs.mkdirSync(path.join(root, '.git'), { recursive: true });
    fs.mkdirSync(path.join(root, '.fable'), { recursive: true });
    fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
    fs.writeFileSync(path.join(root, 'bin', 'get-fable.js'), '// test entrypoint\n');
    installGitHooks(root);

    const home = path.join(root, 'home');
    const bunDir = path.join(home, '.bun', 'bin');
    fs.mkdirSync(bunDir, { recursive: true });
    const marker = path.join(root, 'bun-args.txt');
    const fakeBun = path.join(bunDir, 'bun');
    fs.writeFileSync(fakeBun, `#!/bin/sh\nprintf '%s\n' "$*" > "${marker}"\nexit 0\n`);
    fs.chmodSync(fakeBun, 0o755);

    const result = Bun.spawnSync([path.join(root, '.git', 'hooks', 'pre-push')], {
      cwd: root,
      env: { ...process.env, HOME: home, BUN_INSTALL: '', PATH: '/usr/bin:/bin' },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    expect(result.exitCode).toBe(0);
    expect(fs.readFileSync(marker, 'utf8').trim()).toBe('./bin/get-fable.js lint');
  });

  test('skips installation gracefully if .git does not exist', () => {
    const root = tempRoot();
    const result = installGitHooks(root);
    expect(result).toBe(false);
  });

  test('initProjectFable automatically installs git hooks when .git is present', () => {
    const root = tempRoot();
    fs.mkdirSync(path.join(root, '.git'), { recursive: true });

    initProjectFable(root);

    const hooksDir = path.join(root, '.git', 'hooks');
    expect(fs.existsSync(path.join(hooksDir, 'pre-commit'))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, 'post-checkout'))).toBe(true);
  });

  test('installs hooks from a linked worktree into the Git-resolved hooks directory', () => {
    const { linked } = linkedWorktreeFixture();
    const hooksDir = git(linked, 'rev-parse', '--path-format=absolute', '--git-path', 'hooks');

    expect(fs.statSync(path.join(linked, '.git')).isFile()).toBe(true);
    expect(installGitHooks(linked)).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, 'pre-commit'))).toBe(true);
    expect(fs.existsSync(path.join(hooksDir, 'post-checkout'))).toBe(true);
    expect(getFableStatus(linked).gitHooks.installed).toBe(true);
  });

  test('status rejects a partial hook installation in a linked worktree', () => {
    const { linked } = linkedWorktreeFixture();
    const hooksDir = git(linked, 'rev-parse', '--path-format=absolute', '--git-path', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'pre-commit'), '#!/bin/sh\n');

    expect(getFableStatus(linked).gitHooks.installed).toBe(false);
  });

  test('honors a repository custom core.hooksPath', () => {
    const root = tempRoot();
    git(root, 'init');
    git(root, 'config', 'core.hooksPath', '.githooks');

    expect(installGitHooks(root)).toBe(true);
    expect(fs.existsSync(path.join(root, '.githooks', 'pre-commit'))).toBe(true);
    expect(getFableStatus(root).gitHooks.installed).toBe(true);
  });

  test('fails safely when core.hooksPath resolves to a non-directory', () => {
    if (process.platform === 'win32') return;
    const root = tempRoot();
    git(root, 'init');
    git(root, 'config', 'core.hooksPath', '/dev/null');

    expect(installGitHooks(root)).toBe(false);
    expect(getFableStatus(root).gitHooks.installed).toBe(false);
  });

  test('does not report success for a real repository when Git is unavailable', () => {
    const root = tempRoot();
    git(root, 'init');
    const previousPath = process.env.PATH;
    process.env.PATH = path.join(root, 'missing-bin');

    try {
      expect(installGitHooks(root)).toBe(false);
      expect(getFableStatus(root).gitHooks.installed).toBe(false);
      for (const hookFile of gitHookFiles) {
        expect(fs.existsSync(path.join(root, '.git', 'hooks', hookFile))).toBe(false);
      }
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });
});
