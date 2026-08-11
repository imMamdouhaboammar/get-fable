import fs from 'node:fs';
import path from 'node:path';
import {
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
  const currentFile = new URL(import.meta.url).pathname;
  return path.resolve(path.dirname(currentFile), '..');
}

export function installGlobalFable() {
  const repoRoot = getRepoRootDir();

  // 1. Claude Code Setup
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

  // Register hooks in ~/.claude/settings.json
  const settingsPath = path.join(claudeDir, 'settings.json');
  const pyProfileInject = path.join(hooksDest, 'fable_profile_inject.py');
  const pySpawnGuard = path.join(hooksDest, 'fable_spawn_guard.py');
  const pyFailStreak = path.join(hooksDest, 'fable_fail_streak.py');
  const pyCloseGuard = path.join(hooksDest, 'fable_close_guard.py');

  mergeJsonFile(settingsPath, (existing) => {
    const hooks = existing.hooks || {};

    const createHookObj = (cmd: string, matcher?: string) => {
      const obj: any = {
        hooks: [{ type: 'command', command: cmd }],
      };
      if (matcher) obj.matcher = matcher;
      return obj;
    };

    const isFableHook = (entry: any, pyName: string) => {
      if (!entry) return false;
      const subHooks = entry.hooks || (Array.isArray(entry) ? entry : [entry]);
      return subHooks.some(
        (h: any) => typeof h?.command === 'string' && h.command.includes(pyName)
      );
    };

    const registerOrUpdate = (event: string, cmd: string, pyName: string, matcher?: string) => {
      let list = hooks[event] || [];
      list = list.filter((item: any) => !isFableHook(item, pyName));
      list.push(createHookObj(`python3 ${cmd}`, matcher));
      hooks[event] = list;
    };

    registerOrUpdate('SessionStart', pyProfileInject, 'fable_profile_inject');
    registerOrUpdate('PreToolUse', pySpawnGuard, 'fable_spawn_guard', 'Agent|Task|Workflow');
    registerOrUpdate('PostToolUse', pyFailStreak, 'fable_fail_streak', 'Bash');
    registerOrUpdate('Stop', pyCloseGuard, 'fable_close_guard');

    existing.hooks = hooks;
    return existing;
  });

  logSuccess('Claude Code hooks registered in settings.json');

  // Update ~/.claude/CLAUDE.md
  const claudeMdPath = path.join(claudeDir, 'CLAUDE.md');
  const fableRuleText = fs.readFileSync(path.join(repoRoot, 'prompts', 'fable5-rules.md'), 'utf-8');
  let existingClaudeMd = fs.existsSync(claudeMdPath) ? fs.readFileSync(claudeMdPath, 'utf-8') : '';

  if (!existingClaudeMd.includes('Fable 5 Mythos System Directive')) {
    existingClaudeMd += `\n\n${fableRuleText}`;
    fs.writeFileSync(claudeMdPath, existingClaudeMd.trim() + '\n', 'utf-8');
    logSuccess('Updated ~/.claude/CLAUDE.md with Fable 5 System Prompt');
  }

  // 2. Gemini CLI / Antigravity Setup
  const geminiConfigDir = getGeminiConfigDir();
  if (fs.existsSync(geminiConfigDir)) {
    const geminiRulesDir = path.join(geminiConfigDir, 'rules');
    fs.mkdirSync(geminiRulesDir, { recursive: true });
    fs.copyFileSync(
      path.join(repoRoot, 'prompts', 'fable5-rules.md'),
      path.join(geminiRulesDir, 'fable5-mode.md')
    );

    const geminiSkillDir = path.join(geminiConfigDir, 'skills', 'fable-mode');
    fs.mkdirSync(geminiSkillDir, { recursive: true });
    fs.copyFileSync(
      path.join(repoRoot, 'prompts', 'fable-mode-skill.md'),
      path.join(geminiSkillDir, 'SKILL.md')
    );
    logSuccess('Updated Antigravity / Gemini CLI rules & skills');
  }

  // 3. Agent Kernel Setup
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

  logSuccess('Global Fable 5 Mythos System & Fable Mode successfully installed!');
}

export function initProjectFable(targetDir: string = process.cwd()) {
  const repoRoot = getRepoRootDir();
  const fableDir = path.join(targetDir, '.fable');
  const docsDir = path.join(targetDir, 'docs');

  fs.mkdirSync(fableDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });

  const templatesDir = path.join(repoRoot, 'templates');

  const filesToCopy = [
    { src: 'LEDGER.template.md', dest: path.join(fableDir, 'LEDGER.md') },
    { src: 'PROGRESS.template.md', dest: path.join(fableDir, 'PROGRESS.md') },
    { src: 'VERIFIER_PROMPT.md', dest: path.join(fableDir, 'VERIFIER_PROMPT.md') },
    { src: 'SPEC.template.md', dest: path.join(docsDir, 'SPEC.md') },
  ];

  for (const item of filesToCopy) {
    if (!fs.existsSync(item.dest)) {
      fs.copyFileSync(path.join(templatesDir, item.src), item.dest);
      logSuccess(`Created ${path.relative(targetDir, item.dest)}`);
    } else {
      logWarn(`Skipped existing file ${path.relative(targetDir, item.dest)}`);
    }
  }

  logSuccess(`Project initialized with Fable 5 discipline at ${targetDir}`);
}

export function checkFableStatus() {
  const claudeDir = getClaudeDir();
  const fableSkillDir = path.join(claudeDir, 'skills', 'fable-mode');
  const settingsPath = path.join(claudeDir, 'settings.json');

  logInfo('--- Fable 5 System Status ---');
  console.log(`Claude Config Dir: ${claudeDir}`);
  console.log(`Skill Installed: ${fs.existsSync(fableSkillDir) ? 'YES' : 'NO'}`);

  let registeredHooksCount = 0;
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      const hooks = settings.hooks || {};
      for (const event of ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop']) {
        const list = hooks[event] || [];
        const found = list.some((entry: any) => {
          const subHooks = entry.hooks || (Array.isArray(entry) ? entry : [entry]);
          return subHooks.some((h: any) => typeof h?.command === 'string' && h.command.includes('fable_'));
        });
        if (found) registeredHooksCount++;
      }
    } catch {}
  }
  console.log(`Registered Hooks: ${registeredHooksCount} / 4`);

  const geminiRule = path.join(getGeminiConfigDir(), 'rules', 'fable5-mode.md');
  console.log(`Antigravity/Gemini Rule Installed: ${fs.existsSync(geminiRule) ? 'YES' : 'NO'}`);

  const activeProjectFable = fs.existsSync(path.join(process.cwd(), '.fable'));
  console.log(`Current Project (.fable active): ${activeProjectFable ? 'YES' : 'NO'}`);
}
