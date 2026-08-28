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
const hostEnvKeys = [
  'CLAUDE_CONFIG_DIR', 'FABLE_GEMINI_CONFIG_DIR', 'FABLE_AGENT_KERNEL_DIR', 'FABLE_CODEX_CONFIG_DIR',
  'FABLE_CURSOR_CONFIG_DIR', 'FABLE_OPENCODE_CONFIG_DIR', 'FABLE_KIMI_CONFIG_DIR', 'FABLE_DEEPSEEK_CONFIG_DIR',
  'FABLE_KIRO_CONFIG_DIR', 'FABLE_PI_CONFIG_DIR', 'FABLE_GROK_CONFIG_DIR', 'FABLE_COPILOT_CONFIG_DIR',
  'FABLE_DEVIN_CONFIG_DIR', 'FABLE_WINDSURF_CONFIG_DIR', 'FABLE_REPLIT_CONFIG_DIR', 'FABLE_AMAZONQ_CONFIG_DIR',
  'FABLE_TRAE_CONFIG_DIR', 'FABLE_WARP_CONFIG_DIR', 'FABLE_ATLARIX_CONFIG_DIR', 'FABLE_VELLUM_CONFIG_DIR',
  'FABLE_CODEGEN_CONFIG_DIR', 'FABLE_MUSE_CONFIG_DIR', 'FABLE_JUNIE_CONFIG_DIR', 'FABLE_QODO_CONFIG_DIR',
  'FABLE_ROO_CONFIG_DIR', 'FABLE_AIDER_CONFIG_DIR', 'FABLE_CLINE_CONFIG_DIR', 'FABLE_OPENHANDS_CONFIG_DIR',
  'FABLE_CONTINUE_CONFIG_DIR', 'FABLE_KILO_CONFIG_DIR', 'FABLE_PLANDEX_CONFIG_DIR', 'FABLE_AUTOGPT_CONFIG_DIR',
  'FABLE_HERMES_CONFIG_DIR',
] as const;
const previousHostEnv = Object.fromEntries(hostEnvKeys.map((key) => [key, process.env[key]]));
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

function isolateAllHostDirs(root: string) {
  process.env.CLAUDE_CONFIG_DIR = path.join(root, 'claude');
  process.env.FABLE_GEMINI_CONFIG_DIR = path.join(root, 'gemini');
  process.env.FABLE_AGENT_KERNEL_DIR = path.join(root, 'missing-kernel');
  process.env.FABLE_CODEX_CONFIG_DIR = path.join(root, 'codex');
  process.env.FABLE_CURSOR_CONFIG_DIR = path.join(root, 'cursor');
  process.env.FABLE_OPENCODE_CONFIG_DIR = path.join(root, 'opencode');
  process.env.FABLE_KIMI_CONFIG_DIR = path.join(root, 'kimi');
  process.env.FABLE_DEEPSEEK_CONFIG_DIR = path.join(root, 'deepseek');
  process.env.FABLE_KIRO_CONFIG_DIR = path.join(root, 'kiro');
  process.env.FABLE_PI_CONFIG_DIR = path.join(root, 'pi');
  process.env.FABLE_GROK_CONFIG_DIR = path.join(root, 'grok');
  process.env.FABLE_COPILOT_CONFIG_DIR = path.join(root, 'copilot');
  process.env.FABLE_DEVIN_CONFIG_DIR = path.join(root, 'devin');
  process.env.FABLE_WINDSURF_CONFIG_DIR = path.join(root, 'windsurf');
  process.env.FABLE_REPLIT_CONFIG_DIR = path.join(root, 'replit');
  process.env.FABLE_AMAZONQ_CONFIG_DIR = path.join(root, 'amazonq');
  process.env.FABLE_TRAE_CONFIG_DIR = path.join(root, 'trae');
  process.env.FABLE_WARP_CONFIG_DIR = path.join(root, 'warp');
  process.env.FABLE_ATLARIX_CONFIG_DIR = path.join(root, 'atlarix');
  process.env.FABLE_VELLUM_CONFIG_DIR = path.join(root, 'vellum');
  process.env.FABLE_CODEGEN_CONFIG_DIR = path.join(root, 'codegen');
  process.env.FABLE_MUSE_CONFIG_DIR = path.join(root, 'muse');
  process.env.FABLE_JUNIE_CONFIG_DIR = path.join(root, 'junie');
  process.env.FABLE_QODO_CONFIG_DIR = path.join(root, 'qodo');
  process.env.FABLE_ROO_CONFIG_DIR = path.join(root, 'roocode');
  process.env.FABLE_AIDER_CONFIG_DIR = path.join(root, 'aider');
  process.env.FABLE_CLINE_CONFIG_DIR = path.join(root, 'cline');
  process.env.FABLE_OPENHANDS_CONFIG_DIR = path.join(root, 'openhands');
  process.env.FABLE_CONTINUE_CONFIG_DIR = path.join(root, 'continue');
  process.env.FABLE_KILO_CONFIG_DIR = path.join(root, 'kilo');
  process.env.FABLE_PLANDEX_CONFIG_DIR = path.join(root, 'plandex');
  process.env.FABLE_AUTOGPT_CONFIG_DIR = path.join(root, 'autogpt');
  process.env.FABLE_HERMES_CONFIG_DIR = path.join(root, 'hermes');
}

afterEach(() => {
  for (const key of hostEnvKeys) {
    const previous = previousHostEnv[key];
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('installGlobalFable', () => {
  test('installs both Claude Bash result events idempotently and preserves unrelated hooks', () => {
    const root = makeTempDir('get-fable-global-');
    isolateAllHostDirs(root);
    const claude = path.join(root, 'claude');
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
    const failureEntries = (event: string) =>
      settings.hooks[event].filter((entry: any) =>
        entry.hooks?.some((hook: any) =>
          hook.command.includes('--handler failure') || hook.command.includes('fable_fail_streak.py')
        )
      );
    const mutationEntries = (event: string) =>
      settings.hooks[event].filter((entry: any) =>
        entry.hooks?.some((hook: any) =>
          hook.command.includes('--handler mutation') || hook.command.includes('fable_mutation.py')
        )
      );
    expect(failureEntries('PostToolUse')).toHaveLength(1);
    expect(failureEntries('PostToolUseFailure')).toHaveLength(1);
    expect(mutationEntries('PostToolUse')).toHaveLength(1);
    expect(mutationEntries('PostToolUseFailure')).toHaveLength(1);
    expect(settings.hooks.PostToolUse.some((entry: any) => entry.matcher === 'Write')).toBe(true);
    expect(getFableStatus(root).claude.registeredHooks).toBe(12);
  });

  test('status rejects a Claude hook wired to the wrong script or matcher', () => {
    const root = makeTempDir('get-fable-global-status-');
    isolateAllHostDirs(root);
    const claude = path.join(root, 'claude');

    installGlobalFable();
    const settingsPath = path.join(claude, 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const failureTracker = settings.hooks.PostToolUseFailure.find((entry: any) =>
      entry.hooks?.some((hook: any) =>
        hook.command.includes('--handler failure') || hook.command.includes('fable_fail_streak.py')
      )
    );
    failureTracker.hooks[0].command = 'python3 fable_close_guard.py';
    settings.hooks.PostToolUse[0].matcher = 'Write';
    fs.writeFileSync(settingsPath, JSON.stringify(settings));

    expect(getFableStatus(root).claude.registeredHooks).toBeLessThan(11);
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
    expect(state.schemaVersion).toBe(3);
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

    const hooksConfig = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'hooks.json'), 'utf-8'));
    expect(hooksConfig['get-fable-context'].PreInvocation).toBeArray();
    expect(hooksConfig['get-fable-delegation'].PreToolUse[0].matcher).toContain('invoke_subagent');
    expect(hooksConfig['get-fable-command-recovery'].PostToolUse[0].matcher).toBe('run_command');
    expect(hooksConfig['get-fable-completion'].Stop).toBeArray();
  });

  test('status does not treat an unrelated hooks.json as configured', () => {
    const target = makeTempDir('get-fable-status-');
    isolateAllHostDirs(target);
    process.env.FABLE_GEMINI_CONFIG_DIR = target;
    const pluginDir = path.join(target, 'plugins', 'get-fable');
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, 'hooks.json'),
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

    expect(messages.some((message) => message.includes('Claude Code') && message.includes('Hooks=0/12'))).toBe(true);
    expect(messages.some((message) => message.includes('Google Antigravity & Gemini') && message.includes('Hooks=0/6'))).toBe(true);
  });
});
