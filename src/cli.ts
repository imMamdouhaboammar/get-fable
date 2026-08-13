import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  installGlobalFable,
  installAntigravityGlobal,
  initProjectFable,
  checkFableStatus,
  getFableStatus,
  getRepoRootDir,
} from './installer.js';
import { runFableLint } from './fable-lint.js';
import { startMythosRouterServer } from './router/index.js';
import { readFableState } from './core/state.js';
import { routeTask } from './core/task-router.js';
import { runDoctor } from './core/doctor.js';
import { logHeader, logError, colors } from './utils.js';

export function getPackageVersion(): string {
  try {
    const packagePath = path.join(getRepoRootDir(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return typeof packageJson.version === 'string' ? packageJson.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

export function parsePort(value: string | undefined): number {
  if (value === undefined) return 8080;
  if (!/^\d+$/.test(value)) throw new Error('Port must be an integer between 1 and 65535');

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Port must be an integer between 1 and 65535');
  }
  return port;
}

function hasJsonFlag(args: string[]): boolean {
  return args.includes('--json');
}

function printRoute(task: string, json: boolean): number {
  const state = readFableState(process.cwd());
  const decision = routeTask(task, state || undefined);
  if (json) {
    console.log(JSON.stringify(decision));
    return 0;
  }

  logHeader('get-fable routing decision');
  console.log(`Selected skill: ${decision.selectedSkill}`);
  console.log(`Confidence: ${decision.confidence}`);
  console.log(`Requires plan: ${decision.requiresPlan ? 'YES' : 'NO'}`);
  console.log(`Reasons: ${decision.reasons.join('; ')}`);
  console.log(`Next skills: ${decision.nextSkills.join(', ')}`);
  return 0;
}

export function runCli(args: string[] = process.argv.slice(2)): number {
  const command = args[0] || 'help';

  switch (command) {
    case 'install':
      if (args[1] === '--antigravity' || args[1] === '-a') {
        logHeader('Installing get-fable for Antigravity');
        installAntigravityGlobal();
      } else {
        logHeader('Installing get-fable global integrations');
        installGlobalFable();
      }
      return 0;

    case 'install-antigravity':
      logHeader('Installing get-fable for Antigravity');
      installAntigravityGlobal();
      return 0;

    case 'init':
      logHeader('Initializing project workflow files (.fable/ & .agents/)');
      initProjectFable(process.cwd());
      return 0;

    case 'route': {
      const task = args.slice(1).filter((arg) => arg !== '--json').join(' ').trim();
      if (!task) {
        logError('route requires task text');
        return 1;
      }
      return printRoute(task, hasJsonFlag(args));
    }

    case 'doctor': {
      const report = runDoctor(process.cwd());
      if (hasJsonFlag(args)) {
        console.log(JSON.stringify(report));
      } else {
        logHeader('get-fable doctor');
        for (const item of report.checks) {
          console.log(`${item.status.toUpperCase()} ${item.id}: ${item.message}`);
        }
      }
      return report.ok ? 0 : 1;
    }

    case 'lint': {
      logHeader('Fable spec and ledger verification');
      return runFableLint(process.cwd()) ? 0 : 1;
    }

    case 'status':
      if (hasJsonFlag(args)) console.log(JSON.stringify(getFableStatus(process.cwd())));
      else {
        logHeader('get-fable installation status');
        checkFableStatus(process.cwd());
      }
      return 0;

    case 'serve':
    case 'router': {
      const port = parsePort(args[1]);
      logHeader(`Starting request-enrichment proxy on port ${port}`);
      startMythosRouterServer(port);
      return 0;
    }

    case 'assets':
      logHeader('Bundled get-fable assets');
      listAssets();
      return 0;

    case 'prompt': {
      logHeader('Bundled Fable prompt');
      const promptPath = path.join(getRepoRootDir(), 'prompts', 'claude-code-fable-5.md');
      if (!fs.existsSync(promptPath)) {
        logError('Prompt file not found.');
        return 1;
      }
      console.log(fs.readFileSync(promptPath, 'utf-8'));
      return 0;
    }

    case 'version':
    case '--version':
    case '-v':
      console.log(getPackageVersion());
      return 0;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      return 0;

    default:
      logError(`Unknown command: ${command}`);
      showHelp();
      return 1;
  }
}

function listAssets() {
  const assetsDir = path.join(getRepoRootDir(), 'assets');
  const countItems = (dir: string) => (fs.existsSync(dir) ? fs.readdirSync(dir).length : 0);

  console.log(`${colors.green}✔ System Prompts:${colors.reset} ${countItems(path.join(assetsDir, 'prompts'))} files`);
  console.log(`${colors.green}✔ Agent Definitions:${colors.reset} ${countItems(path.join(assetsDir, 'agents'))} agents`);
  console.log(`${colors.green}✔ Claude Code Skills:${colors.reset} ${countItems(path.join(assetsDir, 'skills', 'claude-code'))} skills`);
  console.log(`${colors.green}✔ Claude Design Skills:${colors.reset} ${countItems(path.join(assetsDir, 'skills', 'claude-design'))} skills`);
  console.log(`${colors.green}✔ Slash Commands:${colors.reset} ${countItems(path.join(assetsDir, 'slash-commands'))} commands`);
  console.log(`${colors.green}✔ Injected Reminders:${colors.reset} ${countItems(path.join(assetsDir, 'injected-reminders'))} reminders`);
  console.log(`${colors.green}✔ Starter Components:${colors.reset} ${countItems(path.join(assetsDir, 'starter-components'))} components`);
}

export function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}get-fable v${getPackageVersion()}${colors.reset} | Frontier-like execution discipline for AI coding agents

${colors.bright}USAGE:${colors.reset}
  $ ${colors.green}get-fable${colors.reset} [command]
  $ ${colors.green}bun ./bin/get-fable.js${colors.reset} [command]

${colors.bright}COMMANDS:${colors.reset}
  ${colors.yellow}install${colors.reset}              Install supported global integrations
  ${colors.yellow}install-antigravity${colors.reset}  Install the Antigravity / Gemini target
  ${colors.yellow}init${colors.reset}                 Create durable project state and canonical project skills
  ${colors.yellow}route <task>${colors.reset}         Explain which Fable skill should handle a task; add --json for machine output
  ${colors.yellow}doctor${colors.reset}               Validate registry, plugin, project state, skills, and hook runtime; add --json
  ${colors.yellow}serve [port]${colors.reset}         Start the local request-enrichment proxy, default port 8080
  ${colors.yellow}router [port]${colors.reset}        Alias for serve
  ${colors.yellow}lint${colors.reset}                 Verify ledger acceptance, evidence, and state consistency
  ${colors.yellow}status${colors.reset}               Report installation state; add --json for machine output
  ${colors.yellow}assets${colors.reset}               List historical bundled assets
  ${colors.yellow}prompt${colors.reset}               Print the legacy bundled Fable prompt
  ${colors.yellow}version${colors.reset}              Print the installed get-fable version
  ${colors.yellow}help${colors.reset}                 Display this help menu

Running get-fable without a command shows this help. Installation is always explicit.
`);
}

export function main() {
  try {
    process.exitCode = runCli();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(message);
    process.exitCode = 1;
  }
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) main();
