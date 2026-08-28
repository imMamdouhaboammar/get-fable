import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  installClaudeGlobal,
  installAntigravityGlobal,
  installCodexGlobal,
  installCursorGlobal,
  installOpenCodeGlobal,
  installKimiGlobal,
  installDeepSeekGlobal,
  installKiroGlobal,
  installPiCodeGlobal,
  installGlobalFable,
  getFableStatus,
} from '../src/installer.ts';

const tempDirs: string[] = [];

function tempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-platform-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('Multi-agent platform installers', () => {
  test('installs Codex rules, skills, and plugins', () => {
    const root = tempRoot();
    const codexDir = path.join(root, 'codex');
    installCodexGlobal(codexDir);

    expect(fs.existsSync(path.join(codexDir, 'rules', 'fable5-mode.md'))).toBe(true);
    expect(fs.existsSync(path.join(codexDir, 'skills', 'fable-tdd', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(codexDir, 'plugins', 'get-fable', '.codex-plugin', 'plugin.json'))).toBe(true);
  });

  test('installs Cursor rules', () => {
    const root = tempRoot();
    const cursorDir = path.join(root, 'cursor');
    installCursorGlobal(cursorDir);

    expect(fs.existsSync(path.join(cursorDir, 'rules', 'fable-lifecycle.mdc'))).toBe(true);
  });

  test('installs OpenCode rules and skills', () => {
    const root = tempRoot();
    const opencodeDir = path.join(root, 'opencode');
    installOpenCodeGlobal(opencodeDir);

    expect(fs.existsSync(path.join(opencodeDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(opencodeDir, 'skills', 'get-fable', 'SKILL.md'))).toBe(true);
  });

  test('installs Kimi, DeepSeek, Kiro, and Pi Code rules', () => {
    const root = tempRoot();
    const kimiDir = path.join(root, 'kimi');
    const deepseekDir = path.join(root, 'deepseek');
    const kiroDir = path.join(root, 'kiro');
    const piDir = path.join(root, 'pi');

    installKimiGlobal(kimiDir);
    installDeepSeekGlobal(deepseekDir);
    installKiroGlobal(kiroDir);
    installPiCodeGlobal(piDir);

    expect(fs.existsSync(path.join(kimiDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(deepseekDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiroDir, 'rules', 'fable.md'))).toBe(true);
    expect(fs.existsSync(path.join(kiroDir, 'hooks', 'fable_profile_inject.py'))).toBe(true);
    expect(fs.existsSync(path.join(piDir, 'rules', 'fable.md'))).toBe(true);
  });

  test('reports complete status for all platforms', () => {
    const root = tempRoot();
    const status = getFableStatus(root);

    expect(status.claude).toBeDefined();
    expect(status.antigravity).toBeDefined();
    expect(status.codex).toBeDefined();
    expect(status.cursor).toBeDefined();
    expect(status.opencode).toBeDefined();
    expect(status.kimi).toBeDefined();
    expect(status.deepseek).toBeDefined();
    expect(status.kiro).toBeDefined();
    expect(status.pi).toBeDefined();
    expect(status.agentKernel).toBeDefined();
    expect(status.gitHooks).toBeDefined();
    expect(status.project).toBeDefined();
  });
});
