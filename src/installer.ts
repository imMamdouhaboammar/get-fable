import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  atomicWriteFileSync,
  getClaudeDir,
  getGeminiConfigDir,
  getAgentKernelDir,
  copyDirSync,
  mergeJsonFile,
  logInfo,
  logSuccess,
  logWarn,
} from './utils.js';
import { canonicalSkillIds } from './core/skill-registry.js';
import { createInitialState, readFableState, writeFableState } from './core/state.js';

export function getRepoRootDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..');
}

type HookEntry = {
  matcher?: string;
  hooks: Array<{ type: 'command'; command: string }>;
};

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
  agentKernel: {
    configDir: string;
    ruleInstalled: boolean;
  };
  project: {
    active: boolean;
    stateSchemaVersion: number | null;
    phase: string | null;
  };
}

function registerClaudeHooks(settingsPath: string, hooksDest: string) {
  const pyProfileInject = path.join(hooksDest, 'fable_profile_inject.py');
  const pySpawnGuard = path.join(hooksDest, 'fable_spawn_guard.py');
  const pyFailStreak = path.join(hooksDest, 'fable_fail_streak.py');
  const pyCloseGuard = path.join(hooksDest, 'fable_close_guard.py');

  mergeJsonFile(settingsPath, (existing) => {
    const config = existing as any;
    const hooks = config.hooks && typeof config.hooks === 'object' ? config.hooks : {};

    const createHookObj = (cmd: string, matcher?: string): HookEntry => {
      const entry: HookEntry = { hooks: [{ type: 'command', command: cmd }] };
      if (matcher) entry.matcher = matcher;
      return entry;
    };

    const isFableHook = (entry: any, pyName: string) => {
      if (!entry) return false;
      const subHooks = entry.hooks || (Array.isArray(entry) ? entry : [entry]);
      return subHooks.some(
        (hook: any) => typeof hook?.command === 'string' && hook.command.includes(pyName)
      );
    };

    const registerOrUpdate = (event: string, cmd: string, pyName: string, matcher?: string) => {
      const existingList = Array.isArray(hooks[event]) ? hooks[event] : [];
      const list = existingList.filter((item: any) => !isFableHook(item, pyName));
      list.push(createHookObj(`python3 ${cmd}`, matcher));
      hooks[event] = list;
    };

    registerOrUpdate('SessionStart', pyProfileInject, 'fable_profile_inject');
    registerOrUpdate('PreToolUse', pySpawnGuard, 'fable_spawn_guard', 'Agent|Task|Workflow');
    registerOrUpdate('PostToolUse', pyFailStreak, 'fable_fail_streak', 'Bash');
    registerOrUpdate('Stop', pyCloseGuard, 'fable_close_guard');

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
    const src = path.join(repoRoot, 'skills', skillId, 'SKILL.md');
    const dest = path.join(targetSkillsDir, skillId, 'SKILL.md');
    if (skipExisting && fs.existsSync(dest)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  const registrySrc = path.join(repoRoot, 'skills', 'get-fable', 'registry.json');
  const registryDest = path.join(targetSkillsDir, 'get-fable', 'registry.json');
  if (!skipExisting || !fs.existsSync(registryDest)) {
    fs.mkdirSync(path.dirname(registryDest), { recursive: true });
    fs.copyFileSync(registrySrc, registryDest);
  }
}

export function installGlobalFable() {
  const repoRoot = getRepoRootDir();
  const claudeDir = getClaudeDir();
  const fableSkillDir = path.join(claudeDir, 'skills', 'fable-mode');

  logInfo(`Installing get-fable into ${claudeDir}...`);
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
  logSuccess('Claude Code hooks registered in settings.json');

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

  installAntigravityGlobal();

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

  logSuccess('Installed the supported get-fable global integrations');
}

export function installAntigravityGlobal() {
  const repoRoot = getRepoRootDir();
  const geminiConfigDir = getGeminiConfigDir();

  logInfo(`Installing get-fable into the Antigravity config target (${geminiConfigDir})...`);
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
  logSuccess('Installed Antigravity plugin: get-fable');

  const globalSkillsDir = path.join(geminiConfigDir, 'skills');
  installCanonicalSkillPack(repoRoot, globalSkillsDir, false);

  const globalFableSkillDir = path.join(globalSkillsDir, 'fable-mode');
  fs.mkdirSync(globalFableSkillDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'fable-mode-skill.md'),
    path.join(globalFableSkillDir, 'SKILL.md')
  );
  logSuccess('Installed canonical Antigravity skills and legacy fable-mode compatibility skill');

  const hooksJsonPath = path.join(geminiConfigDir, 'hooks.json');
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
        events: ['PostToolUse'],
        command: `python3 ${path.join(pluginHooksDir, 'fable_fail_streak.py')}`,
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
  logSuccess('Registered Antigravity hooks in hooks.json');
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
  const templatesDir = path.join(repoRoot, 'templates');

  fs.mkdirSync(fableDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });

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
  ];

  for (const item of filesToCopy) copyIfMissing(item.src, item.dest, targetDir);
  installCanonicalSkillPack(repoRoot, path.join(agentsDir, 'skills'), true);

  const projectStatePath = path.join(fableDir, 'state.json');
  if (!fs.existsSync(projectStatePath)) {
    writeFableState(targetDir, createInitialState());
    logSuccess('Created .fable/state.json');
  } else {
    logWarn('Skipped existing file .fable/state.json');
  }

  logSuccess(`Project initialized with get-fable workflow files at ${targetDir}`);
}

function countClaudeHookRegistrations(settingsPath: string): number {
  if (!fs.existsSync(settingsPath)) return 0;
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const hooks = settings.hooks || {};
    let count = 0;
    for (const event of ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop']) {
      const list = Array.isArray(hooks[event]) ? hooks[event] : [];
      const found = list.some((entry: any) => {
        const subHooks = entry.hooks || (Array.isArray(entry) ? entry : [entry]);
        return subHooks.some(
          (hook: any) => typeof hook?.command === 'string' && hook.command.includes('fable_')
        );
      });
      if (found) count++;
    }
    return count;
  } catch {
    return 0;
  }
}

function countAntigravityHookRegistrations(hooksJsonPath: string): number {
  if (!fs.existsSync(hooksJsonPath)) return 0;
  try {
    const config = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf-8'));
    const hooks = Array.isArray(config.hooks) ? config.hooks : [];
    const expected = [
      { name: 'fable5-profile-inject', file: 'fable_profile_inject.py' },
      { name: 'fable5-spawn-guard', file: 'fable_spawn_guard.py' },
      { name: 'fable5-fail-streak', file: 'fable_fail_streak.py' },
      { name: 'fable5-close-guard', file: 'fable_close_guard.py' },
    ];
    return expected.filter(({ name, file }) =>
      hooks.some(
        (hook: any) =>
          hook?.name === name &&
          typeof hook?.command === 'string' &&
          hook.command.includes(file)
      )
    ).length;
  } catch {
    return 0;
  }
}

export function getFableStatus(targetDir: string = process.cwd()): FableStatus {
  const claudeDir = getClaudeDir();
  const settingsPath = path.join(claudeDir, 'settings.json');
  const geminiConfig = getGeminiConfigDir();
  const geminiHooks = path.join(geminiConfig, 'hooks.json');
  const kernelDir = getAgentKernelDir();
  const active = fs.existsSync(path.join(targetDir, '.fable'));

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
      pluginInstalled: fs.existsSync(path.join(geminiConfig, 'plugins', 'get-fable', 'plugin.json')),
      canonicalSkillInstalled: fs.existsSync(path.join(geminiConfig, 'skills', 'get-fable', 'SKILL.md')),
      registeredHooks: countAntigravityHookRegistrations(geminiHooks),
    },
    agentKernel: {
      configDir: kernelDir,
      ruleInstalled: fs.existsSync(path.join(kernelDir, 'rules', 'fable5-mode.md')),
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
  console.log(`Claude Registered Hooks: ${status.claude.registeredHooks} / 4`);
  console.log(`Antigravity/Gemini Rule Installed: ${status.antigravity.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Antigravity Plugin Installed: ${status.antigravity.pluginInstalled ? 'YES' : 'NO'}`);
  console.log(`Antigravity Registered Hooks: ${status.antigravity.registeredHooks} / 4`);
  console.log(`Agent Kernel Rule Installed: ${status.agentKernel.ruleInstalled ? 'YES' : 'NO'}`);
  console.log(`Current Project (.fable active): ${status.project.active ? 'YES' : 'NO'}`);
  if (status.project.active) {
    console.log(`Project State: schema=${status.project.stateSchemaVersion ?? 'missing'} phase=${status.project.phase ?? 'missing'}`);
  }
}
