import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installAntigravityGlobal, installCodexGlobal } from '../src/installer.ts';

const tempDirs: string[] = [];

function freshDir(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('current platform plugin installers', () => {
  test('installs a complete Codex plugin root instead of a loose manifest', () => {
    const codexDir = freshDir('get-fable-codex-');
    installCodexGlobal(codexDir);

    const pluginDir = path.join(codexDir, 'plugins', 'get-fable');
    expect(fs.existsSync(path.join(pluginDir, '.codex-plugin', 'plugin.json'))).toBe(true);
    expect(fs.existsSync(path.join(pluginDir, 'skills', 'get-fable', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(pluginDir, 'hooks', 'hooks.codex.json'))).toBe(true);
    expect(fs.existsSync(path.join(pluginDir, 'assets', 'mascot.svg'))).toBe(true);
    expect(fs.existsSync(path.join(pluginDir, 'plugin.json'))).toBe(false);

    const manifest = JSON.parse(fs.readFileSync(path.join(pluginDir, '.codex-plugin', 'plugin.json'), 'utf-8'));
    expect(manifest.skills).toBe('./skills/');
    expect(manifest.hooks).toBe('./hooks/hooks.codex.json');
  });

  test('installs Antigravity hooks inside the plugin with absolute rendered commands', () => {
    const configDir = freshDir('get-fable-antigravity-');
    installAntigravityGlobal(configDir);

    const pluginDir = path.join(configDir, 'plugins', 'get-fable');
    const hooksPath = path.join(pluginDir, 'hooks.json');
    expect(fs.existsSync(path.join(pluginDir, 'plugin.json'))).toBe(true);
    expect(fs.existsSync(path.join(pluginDir, 'hooks', 'fable_hook_dispatch.py'))).toBe(true);
    expect(fs.existsSync(hooksPath)).toBe(true);

    const hooksText = fs.readFileSync(hooksPath, 'utf-8');
    expect(hooksText).not.toContain('__FABLE_PLUGIN_DIR__');
    expect(hooksText).toContain(pluginDir.replace(/\\/g, '\\\\'));

    const hooks = JSON.parse(hooksText);
    expect(hooks['get-fable-context'].PreInvocation).toBeArray();
    expect(hooks['get-fable-delegation'].PreToolUse[0].matcher).toContain('invoke_subagent');
    expect(hooks['get-fable-command-recovery'].PostToolUse[0].matcher).toBe('run_command');
    expect(hooks['get-fable-completion'].Stop).toBeArray();
  });
});
