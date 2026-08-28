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
  getGrokDir,
  getCopilotDir,
  getDevinDir,
  getWindsurfDir,
  getReplitDir,
  getAmazonQDir,
  getTraeDir,
  getWarpDir,
  getAtlarixDir,
  getVellumDir,
  getCodegenDir,
  getMuseDir,
  getJunieDir,
  getQodoDir,
  getRooDir,
  getAiderDir,
  getClineDir,
  getOpenHandsDir,
  getContinueDir,
  getKiloDir,
  getPlandexDir,
  getAutoGPTDir,
  getHermesDir,
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
  copilot: {
    configDir: string;
    ruleInstalled: boolean;
  };
  devin: {
    configDir: string;
    ruleInstalled: boolean;
    canonicalSkillInstalled: boolean;
  };
  windsurf: {
    configDir: string;
    ruleInstalled: boolean;
  };
  replit: {
    configDir: string;
    ruleInstalled: boolean;
  };
  amazonq: {
    configDir: string;
    ruleInstalled: boolean;
  };
  trae: {
    configDir: string;
    ruleInstalled: boolean;
  };
  warp: {
    configDir: string;
    ruleInstalled: boolean;
  };
  grok: {
    configDir: string;
    ruleInstalled: boolean;
    pluginInstalled: boolean;
    canonicalSkillInstalled: boolean;
    registeredHooks: number;
  };
  kimi: {
    configDir: string;
    ruleInstalled: boolean;
  };
  atlarix: {
    configDir: string;
    ruleInstalled: boolean;
  };
  vellum: {
    configDir: string;
    ruleInstalled: boolean;
  };
  codegen: {
    configDir: string;
    ruleInstalled: boolean;
  };
  muse: {
    configDir: string;
    ruleInstalled: boolean;
  };
  junie: {
    configDir: string;
    ruleInstalled: boolean;
  };
  qodo: {
    configDir: string;
    ruleInstalled: boolean;
  };
  roocode: {
    configDir: string;
    ruleInstalled: boolean;
    canonicalSkillInstalled: boolean;
  };
  aider: {
    configDir: string;
    ruleInstalled: boolean;
  };
  cline: {
    configDir: string;
    ruleInstalled: boolean;
    canonicalSkillInstalled: boolean;
  };
  openhands: {
    configDir: string;
    ruleInstalled: boolean;
    canonicalSkillInstalled: boolean;
  };
  opencode: {
    configDir: string;
    ruleInstalled: boolean;
    canonicalSkillInstalled: boolean;
  };
  continue: {
    configDir: string;
    ruleInstalled: boolean;
  };
  kilo: {
    configDir: string;
    ruleInstalled: boolean;
    canonicalSkillInstalled: boolean;
  };
  plandex: {
    configDir: string;
    ruleInstalled: boolean;
  };
  autogpt: {
    configDir: string;
    ruleInstalled: boolean;
  };
  hermes: {
    configDir: string;
    ruleInstalled: boolean;
    canonicalSkillInstalled: boolean;
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

export function installGrokGlobal(grokDir: string = getGrokDir()) {
  const repoRoot = getRepoRootDir();

  logInfo(`Installing get-fable into Grok & Grok Bot (${grokDir})...`);
  fs.mkdirSync(grokDir, { recursive: true });

  const rulesDir = path.join(grokDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'grok-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'grok-fable-rules.md'),
    path.join(rulesDir, 'fable5-mode.md')
  );
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'grok-bot-directive.md'),
    path.join(rulesDir, 'grok-bot.md')
  );
  logSuccess('Installed Grok rules: fable.md, fable5-mode.md, and grok-bot.md');

  const pluginDir = path.join(grokDir, 'plugins', 'get-fable');
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, '.grok-plugin', 'plugin.json'),
    path.join(pluginDir, 'plugin.json')
  );

  copyDirSync(path.join(repoRoot, 'skills'), path.join(pluginDir, 'skills'));
  fs.mkdirSync(path.join(pluginDir, 'rules'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'grok-fable-rules.md'),
    path.join(pluginDir, 'rules', 'fable5-mode.md')
  );

  const pluginHooksDir = path.join(pluginDir, 'hooks');
  copyDirSync(path.join(repoRoot, 'hooks'), pluginHooksDir);

  const hostHooksDir = path.join(grokDir, 'hooks');
  copyDirSync(path.join(repoRoot, 'hooks'), hostHooksDir);
  logSuccess('Installed Grok plugin and lifecycle hooks: get-fable');

  const globalSkillsDir = path.join(grokDir, 'skills');
  installCanonicalSkillPack(repoRoot, globalSkillsDir, false);

  const globalFableSkillDir = path.join(globalSkillsDir, 'fable-mode');
  fs.mkdirSync(globalFableSkillDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'fable-mode-skill.md'),
    path.join(globalFableSkillDir, 'SKILL.md')
  );

  const grokBotSkillDir = path.join(globalSkillsDir, 'grok-bot');
  fs.mkdirSync(grokBotSkillDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'grok-bot-directive.md'),
    path.join(grokBotSkillDir, 'SKILL.md')
  );
  logSuccess('Installed canonical Grok skills and grok-bot agent skill');

  const hooksJsonPath = path.join(grokDir, 'hooks.json');
  mergeJsonFile(hooksJsonPath, (existing) => {
    const config = existing as any;
    const hooksList: any[] = Array.isArray(config.hooks) ? config.hooks : [];

    const fableHooks = [
      {
        name: 'fable5-profile-inject',
        events: ['SessionStart'],
        command: `python3 ${path.join(pluginHooksDir, 'fable_profile_inject.py')}`,
      },
      {
        name: 'fable5-spawn-guard',
        events: ['PreToolUse'],
        command: `python3 ${path.join(pluginHooksDir, 'fable_spawn_guard.py')}`,
      },
      {
        name: 'fable5-fail-streak',
        events: ['PostToolUse', 'PostToolUseFailure'],
        command: `python3 ${path.join(pluginHooksDir, 'fable_fail_streak.py')}`,
      },
      {
        name: 'fable5-mutation',
        events: ['PostToolUse', 'PostToolUseFailure'],
        command: `python3 ${path.join(pluginHooksDir, 'fable_mutation.py')}`,
      },
      {
        name: 'fable5-close-guard',
        events: ['Stop', 'SessionEnd'],
        command: `python3 ${path.join(pluginHooksDir, 'fable_close_guard.py')}`,
      },
    ];

    for (const fableHook of fableHooks) {
      const index = hooksList.findIndex((hook: any) => hook?.name === fableHook.name);
      if (index >= 0) hooksList[index] = fableHook;
      else hooksList.push(fableHook);
    }

    config.hooks = hooksList;
    return config;
  });

  const settingsPath = path.join(grokDir, 'settings.json');
  registerClaudeHooks(settingsPath, pluginHooksDir);

  logSuccess('Registered Grok lifecycle hooks in hooks.json and settings.json');
}

export function installCopilotGlobal(copilotDir: string = getCopilotDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for GitHub Copilot (${copilotDir})...`);
  const rulesDir = path.join(copilotDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'copilot-fable-instructions.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed GitHub Copilot rules in ~/.copilot/rules/fable.md');
}

export function installDevinGlobal(devinDir: string = getDevinDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Devin (${devinDir})...`);
  const rulesDir = path.join(devinDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'devin-fable-instructions.md'),
    path.join(rulesDir, 'fable.md')
  );
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'devin-fable-instructions.md'),
    path.join(devinDir, 'instructions.md')
  );
  const skillsDir = path.join(devinDir, 'skills');
  installCanonicalSkillPack(repoRoot, skillsDir, false);
  logSuccess('Installed Devin instructions, rules, and canonical skills');
}

export function installWindsurfGlobal(windsurfDir: string = getWindsurfDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Windsurf (${windsurfDir})...`);
  const rulesDir = path.join(windsurfDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'windsurf-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'windsurf-fable-rules.md'),
    path.join(windsurfDir, 'rules.md')
  );
  logSuccess('Installed Windsurf rules in ~/.codeium/windsurf/rules.md');
}

export function installReplitGlobal(replitDir: string = getReplitDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Replit (${replitDir})...`);
  const rulesDir = path.join(replitDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'replit-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed Replit rules in ~/.replit/rules/fable.md');
}

export function installAmazonQGlobal(amazonqDir: string = getAmazonQDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Amazon Q Dev (${amazonqDir})...`);
  const rulesDir = path.join(amazonqDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'amazon-q-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed Amazon Q Dev rules in ~/.aws/amazon-q/rules/fable.md');
}

export function installTraeGlobal(traeDir: string = getTraeDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Trae (${traeDir})...`);
  const rulesDir = path.join(traeDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'trae-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed Trae rules in ~/.trae/rules/fable.md');
}

export function installWarpGlobal(warpDir: string = getWarpDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Warp AI (${warpDir})...`);
  const rulesDir = path.join(warpDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'warp-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed Warp rules in ~/.warp/rules/fable.md');
}

export function installAtlarixGlobal(atlarixDir: string = getAtlarixDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Atlarix (${atlarixDir})...`);
  const rulesDir = path.join(atlarixDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'atlarix-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed Atlarix rules in ~/.atlarix/rules/fable.md');
}

export function installVellumGlobal(vellumDir: string = getVellumDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Vellum (${vellumDir})...`);
  const rulesDir = path.join(vellumDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'vellum-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed Vellum rules in ~/.vellum/rules/fable.md');
}

export function installCodegenGlobal(codegenDir: string = getCodegenDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Codegen (${codegenDir})...`);
  const rulesDir = path.join(codegenDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'codegen-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed Codegen rules in ~/.codegen/rules/fable.md');
}

export function installMuseGlobal(museDir: string = getMuseDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Muse Code (${museDir})...`);
  const rulesDir = path.join(museDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'muse-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed Muse Code rules in ~/.muse/rules/fable.md');
}

export function installJunieGlobal(junieDir: string = getJunieDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Junie (${junieDir})...`);
  const rulesDir = path.join(junieDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'junie-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed JetBrains Junie rules in ~/.junie/rules/fable.md');
}

export function installQodoGlobal(qodoDir: string = getQodoDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Qodo (${qodoDir})...`);
  const rulesDir = path.join(qodoDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'qodo-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed Qodo rules in ~/.qodo/rules/fable.md');
}

export function installRooCodeGlobal(rooDir: string = getRooDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Roo Code (${rooDir})...`);
  const rulesDir = path.join(rooDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'roocode-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  const skillsDir = path.join(rooDir, 'skills');
  installCanonicalSkillPack(repoRoot, skillsDir, false);
  logSuccess('Installed Roo Code rules and canonical skills in ~/.roo/');
}

export function installAiderGlobal(aiderDir: string = getAiderDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Aider (${aiderDir})...`);
  const rulesDir = path.join(aiderDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'aider-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed Aider rules in ~/.aider/rules/fable.md');
}

export function installClineGlobal(clineDir: string = getClineDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Cline (${clineDir})...`);
  const rulesDir = path.join(clineDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'cline-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  const skillsDir = path.join(clineDir, 'skills');
  installCanonicalSkillPack(repoRoot, skillsDir, false);
  logSuccess('Installed Cline rules and canonical skills in ~/.cline/');
}

export function installOpenHandsGlobal(openhandsDir: string = getOpenHandsDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for OpenHands (${openhandsDir})...`);
  const rulesDir = path.join(openhandsDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'openhands-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  const microagentsDir = path.join(openhandsDir, 'microagents');
  fs.mkdirSync(microagentsDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'openhands-fable-rules.md'),
    path.join(microagentsDir, 'fable.md')
  );
  const skillsDir = path.join(openhandsDir, 'skills');
  installCanonicalSkillPack(repoRoot, skillsDir, false);
  logSuccess('Installed OpenHands rules and canonical skills in ~/.openhands/');
}

export function installContinueGlobal(continueDir: string = getContinueDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Continue (${continueDir})...`);
  const rulesDir = path.join(continueDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'continue-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed Continue rules in ~/.continue/rules/fable.md');
}

export function installKiloGlobal(kiloDir: string = getKiloDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Kilo Code (${kiloDir})...`);
  const rulesDir = path.join(kiloDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'kilo-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  const skillsDir = path.join(kiloDir, 'skills');
  installCanonicalSkillPack(repoRoot, skillsDir, false);
  logSuccess('Installed Kilo Code rules and canonical skills in ~/.kilo/');
}

export function installPlandexGlobal(plandexDir: string = getPlandexDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Plandex (${plandexDir})...`);
  const rulesDir = path.join(plandexDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'plandex-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed Plandex rules in ~/.plandex/rules/fable.md');
}

export function installAutoGPTGlobal(autogptDir: string = getAutoGPTDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for AutoGPT (${autogptDir})...`);
  const rulesDir = path.join(autogptDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'autogpt-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  logSuccess('Installed AutoGPT rules in ~/.autogpt/rules/fable.md');
}

export function installHermesGlobal(hermesDir: string = getHermesDir()) {
  const repoRoot = getRepoRootDir();
  logInfo(`Installing get-fable for Hermes Agent (${hermesDir})...`);
  const rulesDir = path.join(hermesDir, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'hermes-fable-rules.md'),
    path.join(rulesDir, 'fable.md')
  );
  const skillsDir = path.join(hermesDir, 'skills');
  installCanonicalSkillPack(repoRoot, skillsDir, false);
  logSuccess('Installed Hermes Agent rules and canonical skills in ~/.hermes/');
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
  installCopilotGlobal();
  installDevinGlobal();
  installWindsurfGlobal();
  installReplitGlobal();
  installAmazonQGlobal();
  installTraeGlobal();
  installWarpGlobal();
  installGrokGlobal();
  installKimiGlobal();
  installAtlarixGlobal();
  installVellumGlobal();
  installCodegenGlobal();
  installMuseGlobal();
  installJunieGlobal();
  installQodoGlobal();
  installRooCodeGlobal();
  installAiderGlobal();
  installClineGlobal();
  installOpenHandsGlobal();
  installOpenCodeGlobal();
  installContinueGlobal();
  installKiloGlobal();
  installPlandexGlobal();
  installAutoGPTGlobal();
  installHermesGlobal();
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
  const githubDir = path.join(targetDir, '.github');
  const devinDir = path.join(targetDir, '.devin');
  const traeDir = path.join(targetDir, '.trae', 'rules');
  const continueDir = path.join(targetDir, '.continue', 'rules');
  const junieDir = path.join(targetDir, '.junie', 'rules');
  const qodoDir = path.join(targetDir, '.qodo', 'rules');
  const amazonqDir = path.join(targetDir, '.amazonq');
  const openhandsDir = path.join(targetDir, '.openhands', 'microagents');
  const kiloDir = path.join(targetDir, '.kilo', 'rules');
  const plandexDir = path.join(targetDir, '.plandex');
  const templatesDir = path.join(repoRoot, 'templates');

  fs.mkdirSync(fableDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(cursorRulesDir, { recursive: true });
  fs.mkdirSync(githubDir, { recursive: true });
  fs.mkdirSync(devinDir, { recursive: true });
  fs.mkdirSync(traeDir, { recursive: true });
  fs.mkdirSync(continueDir, { recursive: true });
  fs.mkdirSync(junieDir, { recursive: true });
  fs.mkdirSync(qodoDir, { recursive: true });
  fs.mkdirSync(amazonqDir, { recursive: true });
  fs.mkdirSync(openhandsDir, { recursive: true });
  fs.mkdirSync(kiloDir, { recursive: true });
  fs.mkdirSync(plandexDir, { recursive: true });

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
    {
      src: path.join(repoRoot, 'prompts', 'copilot-fable-instructions.md'),
      dest: path.join(githubDir, 'copilot-instructions.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'cline-fable-rules.md'),
      dest: path.join(targetDir, '.clinerules'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'windsurf-fable-rules.md'),
      dest: path.join(targetDir, '.windsurfrules'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'roocode-fable-rules.md'),
      dest: path.join(targetDir, '.roomodes'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'devin-fable-instructions.md'),
      dest: path.join(devinDir, 'instructions.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'aider-fable-rules.md'),
      dest: path.join(targetDir, '.aider.prompt.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'trae-fable-rules.md'),
      dest: path.join(traeDir, 'fable.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'continue-fable-rules.md'),
      dest: path.join(continueDir, 'fable.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'junie-fable-rules.md'),
      dest: path.join(junieDir, 'fable.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'qodo-fable-rules.md'),
      dest: path.join(qodoDir, 'fable.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'replit-fable-rules.md'),
      dest: path.join(targetDir, '.replit.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'amazon-q-fable-rules.md'),
      dest: path.join(amazonqDir, 'rules.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'openhands-fable-rules.md'),
      dest: path.join(openhandsDir, 'fable.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'kilo-fable-rules.md'),
      dest: path.join(kiloDir, 'fable.md'),
    },
    {
      src: path.join(repoRoot, 'prompts', 'plandex-fable-rules.md'),
      dest: path.join(plandexDir, 'context.md'),
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

function countGrokHookRegistrations(hooksJsonPath: string, settingsPath?: string): number {
  let count = 0;
  if (fs.existsSync(hooksJsonPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf-8'));
      const hooks = Array.isArray(config.hooks) ? config.hooks : [];
      const expected = [
        { name: 'fable5-profile-inject', file: 'fable_profile_inject.py' },
        { name: 'fable5-spawn-guard', file: 'fable_spawn_guard.py' },
        { name: 'fable5-fail-streak', file: 'fable_fail_streak.py' },
        { name: 'fable5-mutation', file: 'fable_mutation.py' },
        { name: 'fable5-close-guard', file: 'fable_close_guard.py' },
      ];
      count = expected.filter(({ name, file }) =>
        hooks.some(
          (hook: any) =>
            hook?.name === name &&
            typeof hook?.command === 'string' &&
            hook.command.includes(file)
        )
      ).length;
    } catch {
      count = 0;
    }
  }
  if (count === 0 && settingsPath && fs.existsSync(settingsPath)) {
    count = countClaudeHookRegistrations(settingsPath);
  }
  return count;
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
  const copilotDir = getCopilotDir();
  const devinDir = getDevinDir();
  const windsurfDir = getWindsurfDir();
  const replitDir = getReplitDir();
  const amazonqDir = getAmazonQDir();
  const traeDir = getTraeDir();
  const warpDir = getWarpDir();
  const grokDir = getGrokDir();
  const grokHooks = path.join(grokDir, 'hooks.json');
  const grokSettings = path.join(grokDir, 'settings.json');
  const kimiDir = getKimiDir();
  const atlarixDir = getAtlarixDir();
  const vellumDir = getVellumDir();
  const codegenDir = getCodegenDir();
  const museDir = getMuseDir();
  const junieDir = getJunieDir();
  const qodoDir = getQodoDir();
  const rooDir = getRooDir();
  const aiderDir = getAiderDir();
  const clineDir = getClineDir();
  const openhandsDir = getOpenHandsDir();
  const opencodeDir = getOpenCodeDir();
  const continueDir = getContinueDir();
  const kiloDir = getKiloDir();
  const plandexDir = getPlandexDir();
  const autogptDir = getAutoGPTDir();
  const hermesDir = getHermesDir();
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
    copilot: {
      configDir: copilotDir,
      ruleInstalled: fs.existsSync(path.join(copilotDir, 'rules', 'fable.md')),
    },
    devin: {
      configDir: devinDir,
      ruleInstalled: fs.existsSync(path.join(devinDir, 'rules', 'fable.md')) || fs.existsSync(path.join(devinDir, 'instructions.md')),
      canonicalSkillInstalled: fs.existsSync(path.join(devinDir, 'skills', 'get-fable', 'SKILL.md')),
    },
    windsurf: {
      configDir: windsurfDir,
      ruleInstalled: fs.existsSync(path.join(windsurfDir, 'rules', 'fable.md')) || fs.existsSync(path.join(windsurfDir, 'rules.md')),
    },
    replit: {
      configDir: replitDir,
      ruleInstalled: fs.existsSync(path.join(replitDir, 'rules', 'fable.md')),
    },
    amazonq: {
      configDir: amazonqDir,
      ruleInstalled: fs.existsSync(path.join(amazonqDir, 'rules', 'fable.md')),
    },
    trae: {
      configDir: traeDir,
      ruleInstalled: fs.existsSync(path.join(traeDir, 'rules', 'fable.md')),
    },
    warp: {
      configDir: warpDir,
      ruleInstalled: fs.existsSync(path.join(warpDir, 'rules', 'fable.md')),
    },
    grok: {
      configDir: grokDir,
      ruleInstalled: fs.existsSync(path.join(grokDir, 'rules', 'fable.md')) || fs.existsSync(path.join(grokDir, 'rules', 'fable5-mode.md')),
      pluginInstalled: fs.existsSync(path.join(grokDir, 'plugins', 'get-fable', 'plugin.json')),
      canonicalSkillInstalled: fs.existsSync(path.join(grokDir, 'skills', 'get-fable', 'SKILL.md')),
      registeredHooks: countGrokHookRegistrations(grokHooks, grokSettings),
    },
    kimi: {
      configDir: kimiDir,
      ruleInstalled: fs.existsSync(path.join(kimiDir, 'rules', 'fable.md')),
    },
    atlarix: {
      configDir: atlarixDir,
      ruleInstalled: fs.existsSync(path.join(atlarixDir, 'rules', 'fable.md')),
    },
    vellum: {
      configDir: vellumDir,
      ruleInstalled: fs.existsSync(path.join(vellumDir, 'rules', 'fable.md')),
    },
    codegen: {
      configDir: codegenDir,
      ruleInstalled: fs.existsSync(path.join(codegenDir, 'rules', 'fable.md')),
    },
    muse: {
      configDir: museDir,
      ruleInstalled: fs.existsSync(path.join(museDir, 'rules', 'fable.md')),
    },
    junie: {
      configDir: junieDir,
      ruleInstalled: fs.existsSync(path.join(junieDir, 'rules', 'fable.md')),
    },
    qodo: {
      configDir: qodoDir,
      ruleInstalled: fs.existsSync(path.join(qodoDir, 'rules', 'fable.md')),
    },
    roocode: {
      configDir: rooDir,
      ruleInstalled: fs.existsSync(path.join(rooDir, 'rules', 'fable.md')),
      canonicalSkillInstalled: fs.existsSync(path.join(rooDir, 'skills', 'get-fable', 'SKILL.md')),
    },
    aider: {
      configDir: aiderDir,
      ruleInstalled: fs.existsSync(path.join(aiderDir, 'rules', 'fable.md')),
    },
    cline: {
      configDir: clineDir,
      ruleInstalled: fs.existsSync(path.join(clineDir, 'rules', 'fable.md')),
      canonicalSkillInstalled: fs.existsSync(path.join(clineDir, 'skills', 'get-fable', 'SKILL.md')),
    },
    openhands: {
      configDir: openhandsDir,
      ruleInstalled: fs.existsSync(path.join(openhandsDir, 'rules', 'fable.md')),
      canonicalSkillInstalled: fs.existsSync(path.join(openhandsDir, 'skills', 'get-fable', 'SKILL.md')),
    },
    opencode: {
      configDir: opencodeDir,
      ruleInstalled: fs.existsSync(path.join(opencodeDir, 'rules', 'fable.md')),
      canonicalSkillInstalled: fs.existsSync(path.join(opencodeDir, 'skills', 'get-fable', 'SKILL.md')),
    },
    continue: {
      configDir: continueDir,
      ruleInstalled: fs.existsSync(path.join(continueDir, 'rules', 'fable.md')),
    },
    kilo: {
      configDir: kiloDir,
      ruleInstalled: fs.existsSync(path.join(kiloDir, 'rules', 'fable.md')),
      canonicalSkillInstalled: fs.existsSync(path.join(kiloDir, 'skills', 'get-fable', 'SKILL.md')),
    },
    plandex: {
      configDir: plandexDir,
      ruleInstalled: fs.existsSync(path.join(plandexDir, 'rules', 'fable.md')),
    },
    autogpt: {
      configDir: autogptDir,
      ruleInstalled: fs.existsSync(path.join(autogptDir, 'rules', 'fable.md')),
    },
    hermes: {
      configDir: hermesDir,
      ruleInstalled: fs.existsSync(path.join(hermesDir, 'rules', 'fable.md')),
      canonicalSkillInstalled: fs.existsSync(path.join(hermesDir, 'skills', 'get-fable', 'SKILL.md')),
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
  logInfo('--- get-fable status across 30 supported platforms ---');
  console.log(`Claude Code (${status.claude.configDir}): Skills=${status.claude.canonicalSkillInstalled ? 'YES' : 'NO'}, Hooks=${status.claude.registeredHooks}/12`);
  console.log(`Google Antigravity & Gemini (${status.antigravity.configDir}): Rule=${status.antigravity.ruleInstalled ? 'YES' : 'NO'}, Skills=${status.antigravity.canonicalSkillInstalled ? 'YES' : 'NO'}, Hooks=${status.antigravity.registeredHooks}/6`);
  console.log(`OpenAI Codex (${status.codex.configDir}): Rule=${status.codex.ruleInstalled ? 'YES' : 'NO'}, Skills=${status.codex.canonicalSkillInstalled ? 'YES' : 'NO'}, Plugin=${status.codex.pluginInstalled ? 'YES' : 'NO'}`);
  console.log(`Cursor IDE (${status.cursor.configDir}): Rule=${status.cursor.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`GitHub Copilot (${status.copilot.configDir}): Rule=${status.copilot.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Devin (${status.devin.configDir}): Rule=${status.devin.ruleInstalled ? 'YES' : 'NO'}, Skills=${status.devin.canonicalSkillInstalled ? 'YES' : 'NO'}`);
  console.log(`Windsurf (${status.windsurf.configDir}): Rule=${status.windsurf.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Replit Agent (${status.replit.configDir}): Rule=${status.replit.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Amazon Q Dev (${status.amazonq.configDir}): Rule=${status.amazonq.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Trae (${status.trae.configDir}): Rule=${status.trae.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Warp AI (${status.warp.configDir}): Rule=${status.warp.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Grok Build (${status.grok.configDir}): Rule=${status.grok.ruleInstalled ? 'YES' : 'NO'}, Skills=${status.grok.canonicalSkillInstalled ? 'YES' : 'NO'}, Hooks=${status.grok.registeredHooks}/5`);
  console.log(`Moonshot Kimi (${status.kimi.configDir}): Rule=${status.kimi.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Atlarix (${status.atlarix.configDir}): Rule=${status.atlarix.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Vellum (${status.vellum.configDir}): Rule=${status.vellum.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Codegen (${status.codegen.configDir}): Rule=${status.codegen.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Muse Code (${status.muse.configDir}): Rule=${status.muse.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`JetBrains Junie (${status.junie.configDir}): Rule=${status.junie.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Qodo (${status.qodo.configDir}): Rule=${status.qodo.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Roo Code (${status.roocode.configDir}): Rule=${status.roocode.ruleInstalled ? 'YES' : 'NO'}, Skills=${status.roocode.canonicalSkillInstalled ? 'YES' : 'NO'}`);
  console.log(`Aider (${status.aider.configDir}): Rule=${status.aider.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Cline (${status.cline.configDir}): Rule=${status.cline.ruleInstalled ? 'YES' : 'NO'}, Skills=${status.cline.canonicalSkillInstalled ? 'YES' : 'NO'}`);
  console.log(`OpenHands (${status.openhands.configDir}): Rule=${status.openhands.ruleInstalled ? 'YES' : 'NO'}, Skills=${status.openhands.canonicalSkillInstalled ? 'YES' : 'NO'}`);
  console.log(`OpenCode (${status.opencode.configDir}): Rule=${status.opencode.ruleInstalled ? 'YES' : 'NO'}, Skills=${status.opencode.canonicalSkillInstalled ? 'YES' : 'NO'}`);
  console.log(`Continue (${status.continue.configDir}): Rule=${status.continue.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Kilo Code (${status.kilo.configDir}): Rule=${status.kilo.ruleInstalled ? 'YES' : 'NO'}, Skills=${status.kilo.canonicalSkillInstalled ? 'YES' : 'NO'}`);
  console.log(`Plandex (${status.plandex.configDir}): Rule=${status.plandex.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`AutoGPT (${status.autogpt.configDir}): Rule=${status.autogpt.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Hermes Agent (${status.hermes.configDir}): Rule=${status.hermes.ruleInstalled ? 'YES' : 'NO'}, Skills=${status.hermes.canonicalSkillInstalled ? 'YES' : 'NO'}`);
  console.log(`DeepSeek (${status.deepseek.configDir}): Rule=${status.deepseek.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Kiro (${status.kiro.configDir}): Rule=${status.kiro.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Pi Code (${status.pi.configDir}): Rule=${status.pi.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Agent Kernel (${status.agentKernel.configDir}): Rule=${status.agentKernel.ruleInstalled ? 'YES' : 'NO'}`);
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


