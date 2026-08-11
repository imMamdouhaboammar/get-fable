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

export function getRepoRootDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..');
}

type HookEntry = {
  matcher?: string;
  hooks: Array<{ type: 'command'; command: string }>;
};

function registerClaudeHooks(settingsPath: string, hooksDest: string) {
  const pyProfileInject = path.join(hooksDest, 'fable_profile_inject.py');
  const pySpawnGuard = path.join(hooksDest, 'fable_spawn_guard.py');
  const pyFailStreak = path.join(hooksDest, 'fable_fail_streak.py');
  const pyCloseGuard = path.join(hooksDest, 'fable_close_guard.py');

  mergeJsonFile(settingsPath, (existing) => {
    const config = existing as any;
    const hooks = config.hooks && typeof config.hooks === 'object' ? config.hooks : {};

    const createHookObj = (cmd: string, matcher?: string): HookEntry => {
      const entry: HookEntry = {
        hooks: [{ type: 'command', command: cmd }],
      };
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

export function installGlobalFable() {
  const repoRoot = getRepoRootDir();
  const claudeDir = getClaudeDir();
  const fableSkillDir = path.join(claudeDir, 'skills', 'fable-mode');

  logInfo(`Installing Fable Mode skill and hooks to ${fableSkillDir}...`);
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

  copyDirSync(path.join(repoRoot, 'assets', 'skills'), path.join(pluginDir, 'skills'));
  fs.mkdirSync(path.join(pluginDir, 'rules'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'fable5-rules.md'),
    path.join(pluginDir, 'rules', 'fable5-mode.md')
  );

  const pluginHooksDir = path.join(pluginDir, 'hooks');
  copyDirSync(path.join(repoRoot, 'hooks'), pluginHooksDir);
  logSuccess('Installed Antigravity plugin: get-fable');

  const globalSkillsDir = path.join(geminiConfigDir, 'skills');
  const globalFableSkillDir = path.join(globalSkillsDir, 'fable-mode');
  fs.mkdirSync(globalFableSkillDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, 'prompts', 'fable-mode-skill.md'),
    path.join(globalFableSkillDir, 'SKILL.md')
  );
  logSuccess('Installed Antigravity skill: fable-mode');

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
  logSuccess('Registered Antigravity hooks in ~/.gemini/config/hooks.json');
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

  for (const item of filesToCopy) {
    copyIfMissing(item.src, item.dest, targetDir);
  }

  logSuccess(`Project initialized with get-fable workflow files at ${targetDir}`);
}

export function checkFableStatus() {
  const claudeDir = getClaudeDir();
  const fableSkillDir = path.join(claudeDir, 'skills', 'fable-mode');
  const settingsPath = path.join(claudeDir, 'settings.json');

  logInfo('--- get-fable status ---');
  console.log(`Claude Config Dir: ${claudeDir}`);
  console.log(`Skill Installed: ${fs.existsSync(fableSkillDir) ? 'YES' : 'NO'}`);

  let registeredHooksCount = 0;
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      const hooks = settings.hooks || {};
      for (const event of ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop']) {
        const list = Array.isArray(hooks[event]) ? hooks[event] : [];
        const found = list.some((entry: any) => {
          const subHooks = entry.hooks || (Array.isArray(entry) ? entry : [entry]);
          return subHooks.some(
            (hook: any) => typeof hook?.command === 'string' && hook.command.includes('fable_')
          );
        });
        if (found) registeredHooksCount++;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logWarn(`Claude settings.json is not valid JSON: ${reason}`);
    }
  }
  console.log(`Claude Registered Hooks: ${registeredHooksCount} / 4`);

  const geminiConfig = getGeminiConfigDir();
  const geminiRule = path.join(geminiConfig, 'rules', 'fable5-mode.md');
  const geminiPlugin = path.join(geminiConfig, 'plugins', 'get-fable', 'plugin.json');
  const geminiHooks = path.join(geminiConfig, 'hooks.json');
  console.log(`Antigravity/Gemini Rule Installed: ${fs.existsSync(geminiRule) ? 'YES' : 'NO'}`);
  console.log(`Antigravity Plugin Installed: ${fs.existsSync(geminiPlugin) ? 'YES' : 'NO'}`);
  console.log(`Antigravity Hooks Configured: ${fs.existsSync(geminiHooks) ? 'YES' : 'NO'}`);

  const kernelDir = getAgentKernelDir();
  const kernelRule = path.join(kernelDir, 'rules', 'fable5-mode.md');
  console.log(`Agent Kernel Rule Installed: ${fs.existsSync(kernelRule) ? 'YES' : 'NO'}`);

  const activeProjectFable = fs.existsSync(path.join(process.cwd(), '.fable'));
  console.log(`Current Project (.fable active): ${activeProjectFable ? 'YES' : 'NO'}`);
}
