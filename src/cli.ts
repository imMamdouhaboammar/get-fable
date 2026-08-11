import fs from 'node:fs';
import path from 'node:path';
import { installGlobalFable, initProjectFable, checkFableStatus, getRepoRootDir } from './installer.js';
import { runFableLint } from './fable-lint.js';
import { logHeader, logInfo, colors } from './utils.js';

export function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'install';

  switch (command) {
    case 'install':
      logHeader('Installing Fable 5 Mythos System & Fable Mode');
      installGlobalFable();
      break;

    case 'init':
      logHeader('Initializing Project Fable Discipline (.fable/)');
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

function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}get-fable v1.0.0${colors.reset} — Fable 5 Mythos System & Fable Mode Discipline Installer

${colors.bright}USAGE:${colors.reset}
  $ ${colors.green}npx get-fable${colors.reset} [command]
  $ ${colors.green}bunx get-fable${colors.reset} [command]

${colors.bright}COMMANDS:${colors.reset}
  ${colors.yellow}install${colors.reset}   (Default) Installs Fable 5 Mode & System Prompt globally across Claude Code & Antigravity/Gemini CLI
  ${colors.yellow}init${colors.reset}      Initializes .fable/ ledger, SPEC.md, and VERIFIER templates in the current project
  ${colors.yellow}lint${colors.reset}      Verifies .fable/LEDGER.md for acceptance criteria and evidence annotations
  ${colors.yellow}status${colors.reset}    Displays current installation status and registered hooks
  ${colors.yellow}prompt${colors.reset}    Outputs the complete Anthropic Claude Code Fable 5 System Prompt
  ${colors.yellow}help${colors.reset}      Displays this help menu
`);
}

main();
