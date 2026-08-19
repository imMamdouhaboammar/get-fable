import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  checkFableStatus,
  getFableStatus,
  initProjectFable,
  installGlobalFable,
  installAntigravityGlobal,
} from '../src/installer.ts';

const tempDirs: string[] = [];
const previousGeminiDir = process.env.FABLE_GEMINI_CONFIG_DIR;
const previousClaudeDir = process.env.CLAUDE_CONFIG_DIR;
const previousKernelDir = process.env.FABLE_AGENT_KERNEL_DIR;
const canonicalSkills = [
  'get-fable',
  'fable-discover',
  'fable-research',
  'fable-plan',
  'fable-tdd',
  'fable-delegate',
  'fable-execute',
  'fable-verify',
  'fable-review',
  'fable-security',
  'fable-release',
  'fable-handoff',
  'fable-eval',
  'fable-recover',
];

function makeTempDir(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  if (previousClaudeDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = previousClaudeDir;

  if (previousGeminiDir === undefined) delete process.env.FABLE_GEMINI_CONFIG_DIR;
  else process.env.FABLE_GEMINI_CONFIG_DIR = previousGeminiDir;

  if (previousKernelDir === undefined) delete process.env.FABLE_AGENT_KERNEL_DIR;
  else process.env.FABLE_AGENT_KERNEL_DIR = previousKernelDir;

  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('installGlobalFable', () => {
  test('installs both Claude Bash result events idempotently and preserves unrelated hooks', () => {
    const root = makeTempDir('get-fable-global-');
    const claude = path.join(root, 'claude');
    process.env.CLAUDE_CONFIG_DIR = claude;
    process.env.FABLE_GEMINI_CONFIG_DIR = path.join(root, 'gemini');
    process.env.FABLE_AGENT_KERNEL_DIR = path.join(root, 'missing-kernel');
    fs.mkdirSync(claude, { recursive: true });
    fs.writeFileSync(
      path.join(claude, 'settings.json'),
      JSON.stringify({
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              hooks: [{ type: 'command', command: 'echo unrelated' }],
            },
          ],
        },
      })
    );

    installGlobalFable();
    const first = fs.readFileSync(path.join(claude, 'settings.json'), 'utf-8');
    installGlobalFable();
    const second = fs.readFileSync(path.join(claude, 'settings.json'), 'utf-8');

    expect(second).toBe(first);
    const settings = JSON.parse(second);
    const fableEntries = (event: string) =>
      settings.hooks[event].filter((entry: any) =>
        entry.hooks?.some((hook: any) => hook.command.includes('fable_fail_streak.py'))
      );
    expect(fableEntries('PostToolUse')).toHaveLength(1);
    expect(fableEntries('PostToolUseFailure')).toHaveLength(1);
    expect(settings.hooks.PostToolUse.some((entry: any) => entry.matcher === 'Write')).toBe(true);
    expect(getFableStatus(root).claude.registeredHooks).toBe(6);
  });

  test('status rejects a Claude hook wired to the wrong script or matcher', () => {
    const root = makeTempDir('get-fable-global-status-');
    const claude = path.join(root, 'claude');
    process.env.CLAUDE_CONFIG_DIR = claude;
    process.env.FABLE_GEMINI_CONFIG_DIR = path.join(root, 'gemini');
    process.env.FABLE_AGENT_KERNEL_DIR = path.join(root, 'missing-kernel');

    installGlobalFable();
    const settingsPath = path.join(claude, 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    settings.hooks.PostToolUseFailure[0].hooks[0].command = 'python3 fable_close_guard.py';
    settings.hooks.PostToolUse[0].matcher = 'Write';
    fs.writeFileSync(settingsPath, JSON.stringify(settings));

    expect(getFableStatus(root).claude.registeredHooks).toBe(4);
  });
});

describe('initProjectFable', () => {
  test('creates canonical lifecycle state without replacing existing project-owned files', () => {
    const target = makeTempDir('get-fable-init-');
    const existingRule = path.join(target, '.agents', 'rules', 'fable5-mode.md');
    fs.mkdirSync(path.dirname(existingRule), { recursive: true });
    fs.writeFileSync(existingRule, 'project-owned rule\n');

    initProjectFable(target);

    expect(fs.existsSync(path.join(target, '.fable', 'LEDGER.md'))).toBe(true);
    expect(fs.existsSync(path.join(target, '.fable', 'state.json'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'docs', 'SPEC.md'))).toBe(true);
    expect(fs.existsSync(path.join(target, '.agents', 'skills', 'fable-mode', 'SKILL.md'))).toBe(true);
    expect(fs.readFileSync(existingRule, 'utf-8')).toBe('project-owned rule\n');

    for (const skill of canonicalSkills) {
      expect(fs.existsSync(path.join(target, '.agents', 'skills', skill, 'SKILL.md'))).toBe(true);
    }
    expect(fs.existsSync(path.join(target, '.agents', 'skills', 'get-fable', 'registry.json'))).toBe(true);
    expect(fs.existsSync(path.join(target, '.agents', 'skills', 'registry.json'))).toBe(false);

    const state = JSON.parse(fs.readFileSync(path.join(target, '.fable', 'state.json'), 'utf-8'));
    expect(state.schemaVersion).toBe(2);
    expect(state.phase).toBe('idle');
    expect(state.mutationGeneration).toBe(0);
    expect(state.verifiedGeneration).toBe(-1);
    expect(typeof state.workspaceId).toBe('string');
    expect(state.workspaceId.length).toBeGreaterThan(0);
  });
});

describe('installAntigravityGlobal', () => {
  test('installs canonical skills, owns lifecycle hooks, and remains idempotent', () => {
    const target = makeTempDir('get-fable-antigravity-');
    process.env.FABLE_GEMINI_CONFIG_DIR = target;

    installAntigravityGlobal();
    installAntigravityGlobal();

    const pluginRoot = path.join(target, 'plugins', 'get-fable');
    const pluginHooks = path.join(pluginRoot, 'hooks');
    expect(fs.existsSync(path.join(pluginHooks, 'fable_profile_inject.py'))).toBe(true);
    expect(fs.existsSync(path.join(pluginHooks, 'fable_mutation.py'))).toBe(true);
    expect(fs.existsSync(path.join(pluginHooks, 'fable_close_guard.py'))).toBe(true);

    for (const skill of canonicalSkills) {
      expect(fs.existsSync(path.join(pluginRoot, 'skills', skill, 'SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'skills', skill, 'SKILL.md'))).toBe(true);
    }
    expect(fs.existsSync(path.join(pluginRoot, 'skills', 'get-fable', 'registry.json'))).toBe(true);
    expect(fs.existsSync(path.join(pluginRoot, 'skills', 'registry.json'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'skills', 'get-fable', 'registry.json'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'skills', 'registry.json'))).toBe(false);

    const pluginManifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'plugin.json'), 'utf-8'));
    expect(pluginManifest.skills).toEqual([...canonicalSkills, 'fable-mode']);

    const hooksConfig = JSON.parse(fs.readFileSync(path.join(target, 'hooks.json'), 'utf-8'));
    const fableHooks = hooksConfig.hooks.filter((hook: any) => String(hook.name).startsWith('fable5-'));
    expect(fableHooks).toHaveLength(5);
    expect(fableHooks.some((hook: any) => hook.name === 'fable5-mutation')).toBe(true);
    expect(fableHooks.every((hook: any) => hook.command.includes(pluginHooks))).toBe(true);
  });

  test('status does not treat an unrelated hooks.json as configured', () => {
    const target = makeTempDir('get-fable-status-');
    process.env.FABLE_GEMINI_CONFIG_DIR = target;
    fs.writeFileSync(
      path.join(target, 'hooks.json'),
      JSON.stringify({ hooks: [{ name: 'other-hook', command: 'echo ok' }] })
    );

    const messages: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => messages.push(args.map(String).join(' '));

    try {
      checkFableStatus();
    } finally {
      console.log = originalLog;
    }

    expect(messages.some((message) => message.includes('Antigravity Registered Hooks: 0 / 5'))).toBe(true);
  });
});
