import fs from 'node:fs';
import path from 'node:path';
import { installGlobalFable, installAntigravityGlobal, initProjectFable, checkFableStatus, getRepoRootDir } from './installer.js';
import { runFableLint } from './fable-lint.js';
import { startMythosRouterServer } from './router/index.js';
import { logHeader, colors } from './utils.js';

export function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'install';

  switch (command) {
    case 'install':
      if (args[1] === '--antigravity' || args[1] === '-a') {
        logHeader('Installing get-fable for Antigravity');
        installAntigravityGlobal();
      } else {
        logHeader('Installing get-fable global integrations');
        installGlobalFable();
      }
      break;

    case 'install-antigravity':
      logHeader('Installing get-fable for Antigravity');
      installAntigravityGlobal();
      break;

    case 'init':
      logHeader('Initializing project workflow files (.fable/ & .agents/)');
      initProjectFable(process.cwd());
      break;

    case 'lint':
      logHeader('Fable spec and ledger verification');
      const pass = runFableLint(process.cwd());
      process.exit(pass ? 0 : 1);
      break;

    case 'status':
      logHeader('get-fable installation status');
      checkFableStatus();
      break;

    case 'serve':
    case 'router':
      const port = parseInt(args[1] || '8080', 10);
      logHeader(`Starting request-enrichment proxy on port ${port}`);
      startMythosRouterServer(port);
      break;

    case 'assets':
      logHeader('Bundled get-fable assets');
      listAssets();
      break;

    case 'prompt':
      logHeader('Bundled Fable prompt');
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
  console.log(`${colors.green}✔ Agent Definitions:${colors.reset} ${countItems(path.join(assetsDir, 'agents'))} agents`);
  console.log(`${colors.green}✔ Claude Code Skills:${colors.reset} ${countItems(path.join(assetsDir, 'skills', 'claude-code'))} skills`);
  console.log(`${colors.green}✔ Claude Design Skills:${colors.reset} ${countItems(path.join(assetsDir, 'skills', 'claude-design'))} skills`);
  console.log(`${colors.green}✔ Slash Commands:${colors.reset} ${countItems(path.join(assetsDir, 'slash-commands'))} commands`);
  console.log(`${colors.green}✔ Injected Reminders:${colors.reset} ${countItems(path.join(assetsDir, 'injected-reminders'))} reminders`);
  console.log(`${colors.green}✔ Starter Components:${colors.reset} ${countItems(path.join(assetsDir, 'starter-components'))} components`);
}

function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}get-fable v1.0.0${colors.reset} | Process discipline toolkit for AI coding agents

${colors.bright}USAGE:${colors.reset}
  $ ${colors.green}get-fable${colors.reset} [command]
  $ ${colors.green}bun ./bin/get-fable.js${colors.reset} [command]

${colors.bright}COMMANDS:${colors.reset}
  ${colors.yellow}install${colors.reset}              Install supported global integrations for Claude Code, Antigravity, and Agent Kernel when present
  ${colors.yellow}install-antigravity${colors.reset}  Install the repository's Antigravity / Gemini config target
  ${colors.yellow}init${colors.reset}                 Create .fable/, .agents/, and docs/SPEC.md in the current project
  ${colors.yellow}serve${colors.reset}                Start the OpenAI-compatible request-enrichment proxy
  ${colors.yellow}router${colors.reset}               Alias for serve
  ${colors.yellow}lint${colors.reset}                 Verify .fable/LEDGER.md acceptance criteria and evidence annotations
  ${colors.yellow}status${colors.reset}               Report selected installation state
  ${colors.yellow}assets${colors.reset}               List bundled prompts, agent definitions, skills, and supporting assets
  ${colors.yellow}prompt${colors.reset}               Print the bundled Fable prompt used by this command
  ${colors.yellow}help${colors.reset}                 Display this help menu
`);
}

main();
