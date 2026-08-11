import fs from 'node:fs';
import path from 'node:path';
import { installGlobalFable, installAntigravityGlobal, initProjectFable, checkFableStatus, getRepoRootDir } from './installer.js';
import { runFableLint } from './fable-lint.js';
import { startMythosRouterServer } from './router/index.js';
import { logHeader, logInfo, colors } from './utils.js';

export function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'install';

  switch (command) {
    case 'install':
      if (args[1] === '--antigravity' || args[1] === '-a') {
        logHeader('Installing Fable 5 Mythos Suite for Antigravity');
        installAntigravityGlobal();
      } else {
        logHeader('Installing Fable 5 Mythos System & Fable Mode (All Platforms)');
        installGlobalFable();
      }
      break;

    case 'install-antigravity':
      logHeader('Installing Fable 5 Mythos Suite for Antigravity');
      installAntigravityGlobal();
      break;

    case 'init':
      logHeader('Initializing Project Fable Discipline (.fable/ & .agents/)');
      initProjectFable(process.cwd());
      break;

    case 'lint':
      logHeader('Fable Spec & Ledger Verification');
      const pass = runFableLint(process.cwd());
      process.exit(pass ? 0 : 1);
      break;

    case 'status':
      logHeader('Fable System Installation Status');
      checkFableStatus();
      break;

    case 'serve':
    case 'router':
      const port = parseInt(args[1] || '8080', 10);
      logHeader(`Starting Mythos Router Server on Port ${port}`);
      startMythosRouterServer(port);
      break;

    case 'assets':
      logHeader('Bundled Claude Fable Assets');
      listAssets();
      break;

    case 'prompt':
      logHeader('Claude Code Fable 5 System Prompt');
      const repoRoot = getRepoRootDir();
      const promptPath = path.join(repoRoot, 'prompts', 'claude-code-fable-5.md');
      if (fs.existsSync(promptPath)) {
        console.log(fs.readFileSync(promptPath, 'utf-8'));
      } else {
        console.log('Prompt file not found.');
      }
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

function listAssets() {
  const repoRoot = getRepoRootDir();
  const assetsDir = path.join(repoRoot, 'assets');

  const countItems = (dir: string) => {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).length;
  };

  console.log(`${colors.green}✔ System Prompts:${colors.reset} ${countItems(path.join(assetsDir, 'prompts'))} files`);
  console.log(`${colors.green}✔ Leaked Agents:${colors.reset} ${countItems(path.join(assetsDir, 'agents'))} agents`);
  console.log(`${colors.green}✔ Claude Code Skills:${colors.reset} ${countItems(path.join(assetsDir, 'skills', 'claude-code'))} skills`);
  console.log(`${colors.green}✔ Claude Design Skills:${colors.reset} ${countItems(path.join(assetsDir, 'skills', 'claude-design'))} skills`);
  console.log(`${colors.green}✔ Slash Commands:${colors.reset} ${countItems(path.join(assetsDir, 'slash-commands'))} commands`);
  console.log(`${colors.green}✔ Injected Reminders:${colors.reset} ${countItems(path.join(assetsDir, 'injected-reminders'))} reminders`);
  console.log(`${colors.green}✔ Starter Components:${colors.reset} ${countItems(path.join(assetsDir, 'starter-components'))} components`);
}

function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}get-fable v1.2.0${colors.reset} — Fable 5 Mythos System & Multi-Model Upgrade Suite

${colors.bright}USAGE:${colors.reset}
  $ ${colors.green}npx get-fable${colors.reset} [command]
  $ ${colors.green}bunx get-fable${colors.reset} [command]

${colors.bright}COMMANDS:${colors.reset}
  ${colors.yellow}install${colors.reset}              Installs Fable 5 Mode & System Prompt globally across Claude Code, Antigravity, & Agent Kernel
  ${colors.yellow}install-antigravity${colors.reset}  Installs Fable 5 Plugin, Rules, Skills, and Hooks specifically into Antigravity (~/.gemini/config)
  ${colors.yellow}init${colors.reset}                 Initializes .fable/ ledger, .agents/ rules/skills, and SPEC.md in current project
  ${colors.yellow}serve${colors.reset}                Starts the Mythos Router proxy server to wrap any LLM provider (OpenAI, Gemini, Ollama)
  ${colors.yellow}lint${colors.reset}                 Verifies .fable/LEDGER.md for acceptance criteria and evidence annotations
  ${colors.yellow}status${colors.reset}               Displays current installation status across Claude Code & Antigravity
  ${colors.yellow}assets${colors.reset}               Lists all bundled Anthropic Claude Code & Design agents, skills, and prompts
  ${colors.yellow}prompt${colors.reset}               Outputs the complete Anthropic Claude Code Fable 5 System Prompt
  ${colors.yellow}help${colors.reset}                 Displays the help menu
`);
}

main();
