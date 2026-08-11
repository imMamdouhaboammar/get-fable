import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initProjectFable, installAntigravityGlobal } from '../src/installer.ts';

const tempDirs: string[] = [];
const previousGeminiDir = process.env.FABLE_GEMINI_CONFIG_DIR;

function makeTempDir(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  if (previousGeminiDir === undefined) delete process.env.FABLE_GEMINI_CONFIG_DIR;
  else process.env.FABLE_GEMINI_CONFIG_DIR = previousGeminiDir;

  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('initProjectFable', () => {
  test('creates missing workflow files without replacing existing project-owned files', () => {
    const target = makeTempDir('get-fable-init-');
    const existingRule = path.join(target, '.agents', 'rules', 'fable5-mode.md');
    fs.mkdirSync(path.dirname(existingRule), { recursive: true });
    fs.writeFileSync(existingRule, 'project-owned rule\n');

    initProjectFable(target);

    expect(fs.existsSync(path.join(target, '.fable', 'LEDGER.md'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'docs', 'SPEC.md'))).toBe(true);
    expect(fs.existsSync(path.join(target, '.agents', 'skills', 'fable-mode', 'SKILL.md'))).toBe(true);
    expect(fs.readFileSync(existingRule, 'utf-8')).toBe('project-owned rule\n');
  });
});

describe('installAntigravityGlobal', () => {
  test('installs its own hooks and remains idempotent', () => {
    const target = makeTempDir('get-fable-antigravity-');
    process.env.FABLE_GEMINI_CONFIG_DIR = target;

    installAntigravityGlobal();
    installAntigravityGlobal();

    const pluginHooks = path.join(target, 'plugins', 'get-fable', 'hooks');
    expect(fs.existsSync(path.join(pluginHooks, 'fable_profile_inject.py'))).toBe(true);
    expect(fs.existsSync(path.join(pluginHooks, 'fable_close_guard.py'))).toBe(true);

    const hooksConfig = JSON.parse(fs.readFileSync(path.join(target, 'hooks.json'), 'utf-8'));
    const fableHooks = hooksConfig.hooks.filter((hook: any) => String(hook.name).startsWith('fable5-'));
    expect(fableHooks).toHaveLength(4);
    expect(fableHooks.every((hook: any) => hook.command.includes(pluginHooks))).toBe(true);
  });
});
