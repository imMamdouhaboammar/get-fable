import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runDoctorFix, runDoctor } from '../src/core/doctor.ts';

const tempDirs: string[] = [];
const gitHookFiles = ['pre-commit', 'post-commit', 'post-checkout', 'pre-push'] as const;

function tempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-doctor-fix-'));
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
  git(main, 'worktree', 'add', '-b', 'doctor-linked-test', linked);
  return { linked };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('Doctor Auto-Repair Engine', () => {
  test('automatically repairs missing .fable files and healthy state', () => {
    const root = tempRoot();
    const result = runDoctorFix(root);

    expect(result.repaired.length).toBeGreaterThanOrEqual(3);
    expect(fs.existsSync(path.join(root, '.fable', 'state.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.fable', 'LEDGER.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.fable', 'PROGRESS.md'))).toBe(true);

    const report = runDoctor(root);
    expect(report.checks.some((c) => c.id === 'project-state' && c.status === 'PASS')).toBe(true);
  });

  test('reports Git hooks installed in a real linked worktree', () => {
    const { linked } = linkedWorktreeFixture();
    const hooksDir = git(linked, 'rev-parse', '--path-format=absolute', '--git-path', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    for (const hookFile of gitHookFiles) {
      fs.writeFileSync(path.join(hooksDir, hookFile), '#!/bin/sh\n');
    }

    const gitHooks = runDoctor(linked).checks.find((check) => check.id === 'git-hooks');
    expect(gitHooks?.status).toBe('PASS');
  }, 30_000);

  test('warns when a linked worktree has only part of the required hook set', () => {
    const { linked } = linkedWorktreeFixture();
    const hooksDir = git(linked, 'rev-parse', '--path-format=absolute', '--git-path', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, 'pre-commit'), '#!/bin/sh\n');

    const gitHooks = runDoctor(linked).checks.find((check) => check.id === 'git-hooks');
    expect(gitHooks?.status).toBe('WARN');
  }, 30_000);

  test('doctor fix installs missing hooks for a real linked worktree', () => {
    const { linked } = linkedWorktreeFixture();
    const hooksDir = git(linked, 'rev-parse', '--path-format=absolute', '--git-path', 'hooks');
    fs.rmSync(path.join(hooksDir, 'pre-commit'), { force: true });

    const result = runDoctorFix(linked);

    expect(result.errors).toEqual([]);
    expect(result.repaired).toContain('Installed missing git hook: pre-commit');
    expect(fs.existsSync(path.join(hooksDir, 'pre-commit'))).toBe(true);
  });

  test('doctor fix reports an unsafe core.hooksPath without throwing', () => {
    if (process.platform === 'win32') return;
    const root = tempRoot();
    git(root, 'init');
    git(root, 'config', 'core.hooksPath', '/dev/null');

    const result = runDoctorFix(root);
    expect(result.repaired.some((item) => item.includes('git hook'))).toBe(false);
    expect(result.errors.some((error) => error.includes('/dev/null'))).toBe(true);
  });
});
