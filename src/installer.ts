import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  atomicWriteFileSync,
  getClaudeDir,
  getGeminiConfigDir,
  getAgentKernelDir,
  getCodexDir,
  getCursorDir,
  getOpenCodeDir,
  getKimiDir,
  getDeepSeekDir,
  getKiroDir,
  getPiDir,
  copyDirSync,
  mergeJsonFile,
  logInfo,
  logSuccess,
  logWarn,
} from './utils.js';
import { canonicalSkillIds } from './core/skill-registry.js';
import { createInitialState, readFableState, writeFableState } from './core/state.js';
import { autoInstallSkills, resolveSkillsToInstall, getPlatformSkillsDirs, copySkillDirectory } from './core/skill-installer.js';
import {
  CANONICAL_GIT_HOOKS,
  areCanonicalGitHooksInstalled,
  resolveGitHooksPath,
} from './core/git-hooks-path.js';

export { autoInstallSkills, resolveSkillsToInstall, getPlatformSkillsDirs };

export function getRepoRootDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..');
}

type HookEntry = {
  matcher?: string;
  hooks: Array<{ type: 'command'; command: string }>;
};

const FABLE_HOOK_MARKERS = [
  'fable_hook_dispatch.py',
  'fable_profile_inject.py',
  'fable_spawn_guard.py',
  'fable_fail_streak.py',
  'fable_mutation.py',
  'fable_close_guard.py',
  'fable_event_observer.py',
];

export interface FableStatus {
  claude: {
    configDir: string;
    legacySkillInstalled: boolean;
    canonicalSkillInstalled: boolean;
    registeredHooks: number;
  };
  antigravity: {
    configDir: string;
    ruleInstalled: boolean;
    pluginInstalled: boolean;
    canonicalSkillInstalled: boolean;
    registeredHooks: number;
  };
  codex: {
    configDir: string;
    ruleInstalled: boolean;
    canonicalSkillInstalled: boolean;
    pluginInstalled: boolean;
    hooksInstalled: boolean;
  };
  cursor: {
    configDir: string;
    ruleInstalled: boolean;
  };
  opencode: {
    configDir: string;
    ruleInstalled: boolean;
    canonicalSkillInstalled: boolean;
  };
  kimi: {
    configDir: string;
    ruleInstalled: boolean;
  };
  deepseek: {
    configDir: string;
    ruleInstalled: boolean;
  };
  kiro: {
    configDir: string;
    ruleInstalled: boolean;
  };
  pi: {
    configDir: string;
    ruleInstalled: boolean;
  };
  agentKernel: {
    configDir: string;
    ruleInstalled: boolean;
  };
  gitHooks: {
    installed: boolean;
  };
  project: {
    active: boolean;
    stateSchemaVersion: number | null;
    phase: string | null;
  };
}

function hookEntry(command: string, matcher?: string): HookEntry {
  const entry: HookEntry = { hooks: [{ type: 'command', command }] };
  if (matcher) entry.matcher = matcher;
  return entry;
}

function entryHasFableHook(entry: any): boolean {
  if (!entry) return false;
  const subHooks = entry.hooks || (Array.isArray(entry) ? entry : [entry]);
  return subHooks.some((hook: any) => {
    const command = hook?.command;
    return typeof command === 'string' && FABLE_HOOK_MARKERS.some((marker) => command.includes(marker));
  });
}

function registerClaudeHooks(settingsPath: string, hooksDest: string) {
  const dispatcher = path.join(hooksDest, 'fable_hook_dispatch.py');
  const command = (event: string, handler: string) =>
    `python3 "${dispatcher}" --host claude --event ${event} --handler ${handler}`;

  const desired: Record<string, HookEntry[]> = {
    SessionStart: [
      hookEntry(command('SessionStart', 'profile')),
      hookEntry(command('SessionStart', 'event')),
    ],
    PreToolUse: [
      hookEntry(command('PreToolUse', 'spawn'), 'Agent|Task|Workflow'),
      hookEntry(command('PreToolUse', 'event')),
    ],
    PostToolUse: [
      hookEntry(command('PostToolUse', 'failure'), 'Bash'),
      hookEntry(command('PostToolUse', 'mutation'), 'Edit|Write|MultiEdit|NotebookEdit|apply_patch'),
      hookEntry(command('PostToolUse', 'event')),
    ],
    PostToolUseFailure: [
      hookEntry(command('PostToolUseFailure', 'failure'), 'Bash'),
      hookEntry(command('PostToolUseFailure', 'mutation'), 'Edit|Write|MultiEdit|NotebookEdit|apply_patch'),
      hookEntry(command('PostToolUseFailure', 'event')),
    ],
    Stop: [
      hookEntry(command('Stop', 'close')),
      hookEntry(command('Stop', 'event')),
    ],
  };

  mergeJsonFile(settingsPath, (existing) => {
    const config = existing as any;
    const hooks = config.hooks && typeof config.hooks === 'object' ? config.hooks : {};

    for (const [event, entries] of Object.entries(desired)) {
      const existingList = Array.isArray(hooks[event]) ? hooks[event] : [];
      hooks[event] = [...existingList.filter((item: any) => !entryHasFableHook(item)), ...entries];
    }

    config.hooks = hooks;
    return config;
  });
}

function installCanonicalSkillPack(
  repoRoot: string,
  targetSkillsDir: string,
  skipExisting: boolean
) {
  for (const skillId of canonicalSkillIds()) {
    const src = path.join(repoRoot, 'skills', skillId);
    const dest = path.join(targetSkillsDir, skillId);
    copySkillDirectory(skillId, src, dest, !skipExisting);
  }
}

export function installClaudeGlobal(claudeDir: string = getClaudeDir()) {
  const repoRoot = getRepoRootDir();
  const fableSkillDir = path.join(claudeDir, 'skills', 'fable-mode');

  logInfo(`Installing get-fable into Claude Code (${claudeDir})...`);
  installCanonicalSkillPack(repoRoot, path.join(claudeDir, 'skills'), false);
  logSuccess('Installed canonical get-fable skills for Claude Code');

  fs.mkdirSync(fableSkillDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'fable-mode-skill.md'),
    path.join(fableSkillDir, 'SKILL.md')
  );

  const hooksSrc = path.join(repoRoot, 'hooks');
  const hooksDest = path.join(fableSkillDir, 'hooks');
  copyDirSync(hooksSrc, hooksDest);

  const settingsPath = path.join(claudeDir, 'settings.json');
  registerClaudeHooks(settingsPath, hooksDest);
  logSuccess('Claude Code lifecycle hooks registered through the canonical dispatcher');

  const claudeMdPath = path.join(claudeDir, 'CLAUDE.md');
  const fableRuleText = fs.readFileSync(path.join(repoRoot, 'prompts', 'fable5-rules.md'), 'utf-8');
  const existingClaudeMd = fs.existsSync(claudeMdPath)
    ? fs.readFileSync(claudeMdPath, 'utf-8')
    : '';

  if (!existingClaudeMd.includes('Fable 5 Mythos System Directive')) {
    const updated = `${existingClaudeMd.trim()}\n\n${fableRuleText}`.trim() + '\n';
    atomicWriteFileSync(claudeMdPath, updated);
    logSuccess('Updated ~/.claude/CLAUDE.md with Fable workflow rules');
  }
}

function renderAntigravityHooks(repoRoot: string, pluginDir: string): string {
  const template = fs.readFileSync(
    path.join(repoRoot, 'assets', 'antigravity', 'hooks.json'),
    'utf-8'
  );
  const escapedPluginDir = pluginDir.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return template.replaceAll('__FABLE_PLUGIN_DIR__', escapedPluginDir);
}

export function installAntigravityGlobal(geminiConfigDir: string = getGeminiConfigDir()) {
  const repoRoot = getRepoRootDir();

  logInfo(`Installing get-fable into Antigravity (${geminiConfigDir})...`);
  fs.mkdirSync(geminiConfigDir, { recursive: true });

  const rulesDir = path.join(geminiConfigDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'fable5-rules.md'),
    path.join(rulesDir, 'fable5-mode.md')
  );
  logSuccess('Installed Antigravity rule: fable5-mode.md');

  const pluginDir = path.join(geminiConfigDir, 'plugins', 'get-fable');
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'assets', 'antigravity', 'plugin.json'),
    path.join(pluginDir, 'plugin.json')
  );

  copyDirSync(path.join(repoRoot, 'skills'), path.join(pluginDir, 'skills'));
  fs.mkdirSync(path.join(pluginDir, 'rules'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'fable5-rules.md'),
    path.join(pluginDir, 'rules', 'fable5-mode.md')
  );

  const pluginHooksDir = path.join(pluginDir, 'hooks');
  copyDirSync(path.join(repoRoot, 'hooks'), pluginHooksDir);
  atomicWriteFileSync(path.join(pluginDir, 'hooks.json'), renderAntigravityHooks(repoRoot, pluginDir));
  logSuccess('Installed Antigravity plugin with native Pre/Post tool, invocation, and Stop hooks');

  const globalSkillsDir = path.join(geminiConfigDir, 'skills');
  installCanonicalSkillPack(repoRoot, globalSkillsDir, false);

  const globalFableSkillDir = path.join(globalSkillsDir, 'fable-mode');
  fs.mkdirSync(globalFableSkillDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'fable-mode-skill.md'),
    path.join(globalFableSkillDir, 'SKILL.md')
  );
  logSuccess('Installed canonical Antigravity skills and legacy fable-mode compatibility skill');
}

export function installCodexGlobal(codexDir: string = getCodexDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Codex (${codexDir})...`);

  const rulesDir = path.join(codexDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'codex-fable-rules.md'),
    path.join(rulesDir, 'fable5-mode.md')
  );

  const skillsDir = path.join(codexDir, 'skills');
  installCanonicalSkillPack(repoRoot, skillsDir, false);

  const pluginDir = path.join(codexDir, 'plugins', 'get-fable');
  fs.mkdirSync(path.join(pluginDir, '.codex-plugin'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, '.codex-plugin', 'plugin.json'),
    path.join(pluginDir, '.codex-plugin', 'plugin.json')
  );
  copyDirSync(path.join(repoRoot, 'skills'), path.join(pluginDir, 'skills'));
  copyDirSync(path.join(repoRoot, 'hooks'), path.join(pluginDir, 'hooks'));
  copyDirSync(path.join(repoRoot, 'assets'), path.join(pluginDir, 'assets'));

  const legacyManifest = path.join(pluginDir, 'plugin.json');
  if (fs.existsSync(legacyManifest)) {
    fs.rmSync(legacyManifest, { force: true });
  }

  logSuccess('Installed Codex rules, skills, and universal plugin package with lifecycle hooks');
}

export function installCursorGlobal(cursorDir: string = getCursorDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Cursor (${cursorDir})...`);

  const rulesDir = path.join(cursorDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'cursor-fable-rules.mdc'),
    path.join(rulesDir, 'fable-lifecycle.mdc')
  );

  logSuccess('Installed Cursor rules in ~/.cursor/rules/fable-lifecycle.mdc');
}

export function installOpenCodeGlobal(opencodeDir: string = getOpenCodeDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for OpenCode (${opencodeDir})...`);

  const rulesDir = path.join(opencodeDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'opencode-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );

  const skillsDir = path.join(opencodeDir, 'skills');
  installCanonicalSkillPack(repoRoot, skillsDir, false);

  logSuccess('Installed OpenCode rules and canonical skills');
}

export function installKimiGlobal(kimiDir: string = getKimiDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Kimi (${kimiDir})...`);

  const rulesDir = path.join(kimiDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'kimi-fable-directive.md'),
    path.join(rulesDir, 'fable.md')
  );

  logSuccess('Installed Kimi rules in ~/.kimi/rules/fable.md');
}

export function installDeepSeekGlobal(deepseekDir: string = getDeepSeekDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for DeepSeek (${deepseekDir})...`);

  const rulesDir = path.join(deepseekDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'deepseek-fable-directive.md'),
    path.join(rulesDir, 'fable.md')
  );

  logSuccess('Installed DeepSeek rules in ~/.deepseek/rules/fable.md');
}

export function installKiroGlobal(kiroDir: string = getKiroDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Kiro (${kiroDir})...`);

  const rulesDir = path.join(kiroDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'kiro-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );

  const hooksDir = path.join(kiroDir, 'hooks');
  copyDirSync(path.join(repoRoot, 'hooks'), hooksDir);

  logSuccess('Installed Kiro rules and lifecycle hooks');
}

export function installPiCodeGlobal(piDir: string = getPiDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Pi Code (${piDir})...`);

  const rulesDir = path.join(piDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'pi-code-fable-directive.md'),
    path.join(rulesDir, 'fable.md')
  );

  logSuccess('Installed Pi Code rules in ~/.pi/rules/fable.md');
}

export function installGitHooks(targetDir: string = process.cwd()) {
  const repoRoot = getRepoRootDir();
  const hooksPath = resolveGitHooksPath(targetDir);
  if (hooksPath.kind === 'none') {
    logWarn(`No .git directory found at ${targetDir}. Skipped git hooks installation.`);
    return false;
  }
  if (hooksPath.kind === 'error') {
    logWarn(`${hooksPath.message}. Skipped git hooks installation.`);
    return false;
  }

  const gitHooksDir = hooksPath.hooksDir;
  try {
    fs.mkdirSync(gitHooksDir, { recursive: true });

    for (const hookFile of CANONICAL_GIT_HOOKS) {
      const src = path.join(repoRoot, 'hooks', 'git', hookFile);
      const dest = path.join(gitHooksDir, hookFile);
      if (!fs.existsSync(src)) {
        logWarn(`Missing get-fable git hook source: ${src}. Git hooks installation is incomplete.`);
        return false;
      }
      fs.copyFileSync(src, dest);
      try {
        fs.chmodSync(dest, 0o755);
      } catch {
        // Executability is best-effort on non-POSIX filesystems.
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logWarn(`Failed to install git hooks in ${gitHooksDir}: ${message}`);
    return false;
  }

  logSuccess(`Installed universal get-fable git hooks in ${gitHooksDir}`);
  return true;
}

export function installGlobalFable() {
  installClaudeGlobal();
  installAntigravityGlobal();
  installCodexGlobal();
  installCursorGlobal();
  installOpenCodeGlobal();
  installKimiGlobal();
  installDeepSeekGlobal();
  installKiroGlobal();
  installPiCodeGlobal();

  const repoRoot = getRepoRootDir();
  const kernelDir = getAgentKernelDir();
  if (fs.existsSync(kernelDir)) {
    const kernelRulesDir = path.join(kernelDir, 'rules');
    fs.mkdirSync(kernelRulesDir, { recursive: true });
    fs.copyFileSync(
      path.join(repoRoot, 'prompts', 'fable5-rules.md'),
      path.join(kernelRulesDir, 'fable5-mode.md')
    );
    logSuccess('Updated Agent Kernel rules');
  }

  logSuccess('Installed get-fable across all supported AI coding platforms');
}

function copyIfMissing(src: string, dest: string, targetDir: string) {
  if (fs.existsSync(dest)) {
    logWarn(`Skipped existing file ${path.relative(targetDir, dest)}`);
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  logSuccess(`Created ${path.relative(targetDir, dest)}`);
}

export function initProjectFable(targetDir: string = process.cwd()) {
  const repoRoot = getRepoRootDir();
  const fableDir = path.join(targetDir, '.fable');
  const docsDir = path.join(targetDir, 'docs');
  const agentsDir = path.join(targetDir, '.agents');
  const cursorRulesDir = path.join(targetDir, '.cursor', 'rules');
  const templatesDir = path.join(repoRoot, 'templates');

  fs.mkdirSync(fableDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(cursorRulesDir, { recursive: true });

  const filesToCopy = [
    { src: path.join(templatesDir, 'LEDGER.template.md'), dest: path.join(fableDir, 'LEDGER.md') },
    { src: path.join(templatesDir, 'PROGRESS.template.md'), dest: path.join(fableDir, 'PROGRESS.md') },
    { src: path.join(templatesDir, 'VERIFIER_PROMPT.md'), dest: path.join(fableDir, 'VERIFIER_PROMPT.md') },
    { src: path.join(templatesDir, 'SPEC.template.md'), dest: path.join(docsDir, 'SPEC.md') },
    {
      src: path.join(repoRoot, 'prompts', 'fable-mode-skill.md'),
      dest: path.join(agentsDir, 'skills', 'fable-mode', 'SKILL.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'fable5-rules.md'),
      dest: path.join(agentsDir, 'rules', 'fable5-mode.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'cursor-fable-rules.mdc'),
      dest: path.join(cursorRulesDir, 'fable-lifecycle.mdc'),
    },
  ];

  for (const item of filesToCopy) copyIfMissing(item.src, item.dest, targetDir);
  installCanonicalSkillPack(repoRoot, path.join(agentsDir, 'skills'), true);

  const projectStatePath = path.join(fableDir, 'state.json');
  if (!fs.existsSync(projectStatePath)) {
    writeFableState(targetDir, createInitialState(new Date().toISOString(), targetDir));
    logSuccess('Created .fable/state.json');
  } else {
    logWarn('Skipped existing file .fable/state.json');
  }

  installGitHooks(targetDir);

  logSuccess(`Project initialized with get-fable workflow files at ${targetDir}`);
}

function hookCommandPresent(
  settingsPath: string,
  event: string,
  commandFragment: string,
  matcher?: string
): boolean {
  if (!fs.existsSync(settingsPath)) return false;
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const hooks = settings.hooks || {};
    const list = Array.isArray(hooks[event]) ? hooks[event] : [];
    return list.some((entry: any) => {
      if (matcher && entry?.matcher !== matcher) return false;
      const subHooks = entry.hooks || (Array.isArray(entry) ? entry : [entry]);
      return subHooks.some(
        (hook: any) => typeof hook?.command === 'string' && hook.command.includes(commandFragment)
      );
    });
  } catch {
    return false;
  }
}

function countClaudeHookRegistrations(settingsPath: string): number {
  const expected = [
    { event: 'SessionStart', fragment: '--handler profile' },
    { event: 'SessionStart', fragment: '--handler event' },
    { event: 'PreToolUse', fragment: '--handler spawn', matcher: 'Agent|Task|Workflow' },
    { event: 'PreToolUse', fragment: '--handler event' },
    { event: 'PostToolUse', fragment: '--handler failure', matcher: 'Bash' },
    {
      event: 'PostToolUse',
      fragment: '--handler mutation',
      matcher: 'Edit|Write|MultiEdit|NotebookEdit|apply_patch',
    },
    { event: 'PostToolUse', fragment: '--handler event' },
    { event: 'PostToolUseFailure', fragment: '--handler failure', matcher: 'Bash' },
    {
      event: 'PostToolUseFailure',
      fragment: '--handler mutation',
      matcher: 'Edit|Write|MultiEdit|NotebookEdit|apply_patch',
    },
    { event: 'PostToolUseFailure', fragment: '--handler event' },
    { event: 'Stop', fragment: '--handler close' },
    { event: 'Stop', fragment: '--handler event' },
  ];
  return expected.filter(({ event, fragment, matcher }) =>
    hookCommandPresent(settingsPath, event, fragment, matcher)
  ).length;
}

function jsonContainsCommand(value: unknown, fragment: string): boolean {
  if (Array.isArray(value)) return value.some((item) => jsonContainsCommand(item, fragment));
  if (!value || typeof value !== 'object') return false;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'command' && typeof item === 'string' && item.includes(fragment)) return true;
    if (jsonContainsCommand(item, fragment)) return true;
  }
  return false;
}

function countAntigravityHookRegistrations(pluginHooksPath: string): number {
  if (!fs.existsSync(pluginHooksPath)) return 0;
  try {
    const config = JSON.parse(fs.readFileSync(pluginHooksPath, 'utf-8'));
    return [
      '--handler profile',
      '--handler spawn',
      '--handler failure',
      '--handler mutation',
      '--handler event',
      '--handler close',
    ].filter((fragment) => jsonContainsCommand(config, fragment)).length;
  } catch {
    return 0;
  }
}

export function getFableStatus(targetDir: string = process.cwd()): FableStatus {
  const claudeDir = getClaudeDir();
  const settingsPath = path.join(claudeDir, 'settings.json');
  const geminiConfig = getGeminiConfigDir();
  const antigravityPluginDir = path.join(geminiConfig, 'plugins', 'get-fable');
  const antigravityHooks = path.join(antigravityPluginDir, 'hooks.json');
  const codexDir = getCodexDir();
  const codexPluginDir = path.join(codexDir, 'plugins', 'get-fable');
  const cursorDir = getCursorDir();
  const opencodeDir = getOpenCodeDir();
  const kimiDir = getKimiDir();
  const deepseekDir = getDeepSeekDir();
  const kiroDir = getKiroDir();
  const piDir = getPiDir();
  const kernelDir = getAgentKernelDir();
  const active = fs.existsSync(path.join(targetDir, '.fable'));
  const hooksPath = resolveGitHooksPath(targetDir);
  const gitHooksInstalled = hooksPath.kind === 'resolved' &&
    areCanonicalGitHooksInstalled(hooksPath.hooksDir);

  let stateSchemaVersion: number | null = null;
  let phase: string | null = null;
  if (active) {
    try {
      const state = readFableState(targetDir);
      stateSchemaVersion = state?.schemaVersion ?? null;
      phase = state?.phase ?? null;
    } catch {
      stateSchemaVersion = null;
      phase = 'invalid';
    }
  }

  return {
    claude: {
      configDir: claudeDir,
      legacySkillInstalled: fs.existsSync(path.join(claudeDir, 'skills', 'fable-mode', 'SKILL.md')),
      canonicalSkillInstalled: fs.existsSync(path.join(claudeDir, 'skills', 'get-fable', 'SKILL.md')),
      registeredHooks: countClaudeHookRegistrations(settingsPath),
    },
    antigravity: {
      configDir: geminiConfig,
      ruleInstalled: fs.existsSync(path.join(geminiConfig, 'rules', 'fable5-mode.md')),
      pluginInstalled: fs.existsSync(path.join(antigravityPluginDir, 'plugin.json')),
      canonicalSkillInstalled: fs.existsSync(path.join(geminiConfig, 'skills', 'get-fable', 'SKILL.md')),
      registeredHooks: countAntigravityHookRegistrations(antigravityHooks),
    },
    codex: {
      configDir: codexDir,
      ruleInstalled: fs.existsSync(path.join(codexDir, 'rules', 'fable5-mode.md')),
      canonicalSkillInstalled: fs.existsSync(path.join(codexDir, 'skills', 'get-fable', 'SKILL.md')),
      pluginInstalled: fs.existsSync(path.join(codexPluginDir, '.codex-plugin', 'plugin.json')),
      hooksInstalled: fs.existsSync(path.join(codexPluginDir, 'hooks', 'hooks.codex.json')),
    },
    cursor: {
      configDir: cursorDir,
      ruleInstalled: fs.existsSync(path.join(cursorDir, 'rules', 'fable-lifecycle.mdc')),
    },
    opencode: {
      configDir: opencodeDir,
      ruleInstalled: fs.existsSync(path.join(opencodeDir, 'rules', 'fable.md')),
      canonicalSkillInstalled: fs.existsSync(path.join(opencodeDir, 'skills', 'get-fable', 'SKILL.md')),
    },
    kimi: {
      configDir: kimiDir,
      ruleInstalled: fs.existsSync(path.join(kimiDir, 'rules', 'fable.md')),
    },
    deepseek: {
      configDir: deepseekDir,
      ruleInstalled: fs.existsSync(path.join(deepseekDir, 'rules', 'fable.md')),
    },
    kiro: {
      configDir: kiroDir,
      ruleInstalled: fs.existsSync(path.join(kiroDir, 'rules', 'fable.md')),
    },
    pi: {
      configDir: piDir,
      ruleInstalled: fs.existsSync(path.join(piDir, 'rules', 'fable.md')),
    },
    agentKernel: {
      configDir: kernelDir,
      ruleInstalled: fs.existsSync(path.join(kernelDir, 'rules', 'fable5-mode.md')),
    },
    gitHooks: {
      installed: gitHooksInstalled,
    },
    project: {
      active,
      stateSchemaVersion,
      phase,
    },
  };
}

export function checkFableStatus(targetDir: string = process.cwd()) {
  const status = getFableStatus(targetDir);
  logInfo('--- get-fable status ---');
  console.log(`Claude Config Dir: ${status.claude.configDir}`);
  console.log(`Skill Installed: ${status.claude.legacySkillInstalled ? 'YES' : 'NO'}`);
  console.log(`Canonical Skill Installed: ${status.claude.canonicalSkillInstalled ? 'YES' : 'NO'}`);
  console.log(`Claude Registered Hooks: ${status.claude.registeredHooks} / 12`);
  console.log(`Antigravity Rule Installed: ${status.antigravity.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Antigravity Plugin Installed: ${status.antigravity.pluginInstalled ? 'YES' : 'NO'}`);
  console.log(`Antigravity Hook Capabilities: ${status.antigravity.registeredHooks} / 6`);
  console.log(`Codex Rule Installed: ${status.codex.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Codex Plugin Installed: ${status.codex.pluginInstalled ? 'YES' : 'NO'}`);
  console.log(`Codex Plugin Hooks Installed: ${status.codex.hooksInstalled ? 'YES' : 'NO'}`);
  console.log(`Cursor Rule Installed: ${status.cursor.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`OpenCode Rule Installed: ${status.opencode.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Kimi Rule Installed: ${status.kimi.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`DeepSeek Rule Installed: ${status.deepseek.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Kiro Rule Installed: ${status.kiro.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Pi Code Rule Installed: ${status.pi.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Agent Kernel Rule Installed: ${status.agentKernel.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Universal Git Hooks: ${status.gitHooks.installed ? 'YES' : 'NO'}`);
  console.log(`Current Project (.fable active): ${status.project.active ? 'YES' : 'NO'}`);
  if (status.project.active) {
    console.log(
      `Project State: schema=${status.project.stateSchemaVersion ?? 'missing'} phase=${
        status.project.phase ?? 'missing'
      }`
    );
  }
}
