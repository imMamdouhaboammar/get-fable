import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installGitHooks, initProjectFable } from '../src/installer.ts';

const tempDirs: string[] = [];

function tempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-githooks-test-'));
  tempDirs.push(dir);
  return dir;
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
});
