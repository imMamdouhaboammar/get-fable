import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  installGlobalFable,
  installClaudeGlobal,
  installAntigravityGlobal,
  installCodexGlobal,
  installCursorGlobal,
  installOpenCodeGlobal,
  installKimiGlobal,
  installDeepSeekGlobal,
  installKiroGlobal,
  installPiCodeGlobal,
  installGitHooks,
  initProjectFable,
  autoInstallSkills,
  checkFableStatus,
  getFableStatus,
  getRepoRootDir,
} from './installer.js';
import { runFableLint } from './fable-lint.js';
import { startMythosRouterServer } from './router/index.js';
import {
  addEvidence,
  applyRoutingDecision,
  createInitialState,
  isFablePhase,
  readFableState,
  recordMutation,
  setActiveCard,
  transitionState,
  writeFableState,
} from './core/state.js';
import { routeTask } from './core/task-router.js';
import { runDoctor, runDoctorFix } from './core/doctor.js';
import { evaluateFableSpark } from './core/spark.js';
import { renderInteractiveHelp, getHelpTopic } from './core/helper.js';
import { fetchLatestVersion, runAutoUpdate } from './core/updater.js';
import {
  recordTelemetry,
  loadTelemetryConfig,
  saveTelemetryConfig,
  getTelemetrySummary,
  clearTelemetryLogs,
} from './core/telemetry.js';
import { loadSkillFeed, searchSkillFeed, inspectSkillDetail } from './core/feed.js';
import {
  loadNeuralGraph,
  getNeuralConnections,
  renderNeuralGraphAscii,
} from './core/neural-linking.js';
import { listRecipes, getRecipe, renderRecipeAscii } from './core/recipes.js';
import type { EvidenceKind, EvidenceResult } from './core/types.js';
import { logHeader, logInfo, logError, logSuccess, logWarn, colors } from './utils.js';

const EVIDENCE_KINDS: EvidenceKind[] = [
  'test',
  'build',
  'runtime',
  'review',
  'observation',
  'security',
  'research',
  'receipt',
  'handoff',
];

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

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function hasJsonFlag(args: string[]): boolean {
  return hasFlag(args, '--json');
}

function requireState() {
  const state = readFableState(process.cwd());
  if (!state) throw new Error('No .fable/state.json found. Run get-fable init first.');
  return state;
}

function printJsonOrSummary(payload: unknown, json: boolean, summary: () => void): number {
  if (json) console.log(JSON.stringify(payload));
  else summary();
  return 0;
}

function runRoute(args: string[]): number {
  const json = hasJsonFlag(args);
  const apply = hasFlag(args, '--apply');
  const task = args.filter((arg) => arg !== '--json' && arg !== '--apply').join(' ').trim();
  if (!task) {
    logError('route requires task text');
    return 1;
  }

  const currentState = readFableState(process.cwd());
  const decision = routeTask(task, currentState || undefined);

  if (apply) {
    if (!currentState) {
      logError('route --apply requires an initialized project. Run get-fable init first.');
      return 1;
    }
    const nextState = applyRoutingDecision(currentState, decision);
    writeFableState(process.cwd(), nextState);
  }

  recordTelemetry({
    eventType: 'skill_routed',
    skillId: decision.selectedSkill,
    success: true,
  });

  return printJsonOrSummary(decision, json, () => {
    logHeader(`Routing result for: "${task}"`);
    console.log(`Selected Skill: ${decision.selectedSkill}`);
    console.log(`Pack: ${decision.selectedPack}`);
    console.log(`Task Shape: ${decision.taskShape}`);
    console.log(`Confidence: ${Math.round(decision.confidence * 100)}%`);
    console.log(`Requires Plan: ${decision.requiresPlan ? 'YES' : 'NO'}`);
    console.log('Reasons:');
    for (const reason of decision.reasons) console.log(`  - ${reason}`);
    if (decision.requiredGates.length > 0) {
      console.log('Required Gates:');
      for (const gate of decision.requiredGates) console.log(`  - ${gate}`);
    }
    if (decision.fallbackSkill) console.log(`Fallback: ${decision.fallbackSkill}`);
    if (decision.parallelCandidates.length > 0) {
      console.log(`Parallel Candidates: ${decision.parallelCandidates.join(', ')}`);
    }
    if (apply) logSuccess('Applied routing decision to .fable/state.json');
  });
}

function runStateCommand(args: string[]): number {
  const targetPhase = args[0];
  const substantial = hasFlag(args, '--substantial');
  if (!targetPhase || !isFablePhase(targetPhase)) {
    logError(
      'state requires a valid phase (idle, discovering, planned, executing, verifying, recovering, complete, blocked)'
    );
    return 1;
  }

  const state = requireState();
  const nextState = transitionState(
    substantial ? { ...state, substantial: true } : state,
    targetPhase
  );
  writeFableState(process.cwd(), nextState);

  recordTelemetry({
    eventType: 'command',
    commandName: `state:${targetPhase}`,
    phase: targetPhase,
    success: true,
  });

  return printJsonOrSummary(nextState, hasJsonFlag(args), () => {
    logHeader(`get-fable state transitioned to ${targetPhase}`);
    console.log(`Phase: ${nextState.phase}`);
    console.log(`Current skill: ${nextState.currentSkill || 'none'}`);
    console.log(`Substantial: ${nextState.substantial}`);
    console.log(`Mutation generation: ${nextState.mutationGeneration}`);
    console.log(`Verified generation: ${nextState.verifiedGeneration}`);
  });
}

function runMutationCommand(args: string[]): number {
  const source = args.filter((arg) => !arg.startsWith('--')).join(' ').trim() || undefined;
  const state = requireState();
  const nextState = recordMutation(state);
  writeFableState(process.cwd(), nextState);

  recordTelemetry({
    eventType: 'command',
    commandName: 'mutation',
    phase: nextState.phase,
    success: true,
  });

  return printJsonOrSummary(nextState, hasJsonFlag(args), () => {
    logHeader('get-fable workspace mutation recorded');
    if (source) console.log(`Source: ${source}`);
    console.log(`Mutation generation: ${nextState.mutationGeneration}`);
    console.log(`Verified generation: ${nextState.verifiedGeneration}`);
    console.log(`Substantial: ${nextState.substantial}`);
  });
}

function runCardCommand(args: string[]): number {
  const clear = hasFlag(args, '--clear');
  const cardText = args.filter((arg) => !arg.startsWith('--')).join(' ').trim();
  if (!clear && !cardText) {
    logError('card requires card text or --clear');
    return 1;
  }

  const state = requireState();
  const nextState = setActiveCard(state, clear ? null : cardText);
  writeFableState(process.cwd(), nextState);

  return printJsonOrSummary(nextState, hasJsonFlag(args), () => {
    logHeader(clear ? 'get-fable active card cleared' : 'get-fable active card updated');
    console.log(`Active card: ${nextState.activeCard || 'none'}`);
  });
}

function runEvidenceCommand(args: string[]): number {
  const positional = args.filter((arg) => !arg.startsWith('--'));
  const result = positional[0] as EvidenceResult;
  const kind = positional[1] as EvidenceKind;
  const source = positional[2];
  const detail = positional.slice(3).join(' ').trim();

  if (result !== 'pass' && result !== 'fail') {
    logError('evidence result must be pass or fail');
    return 1;
  }
  if (!kind || !EVIDENCE_KINDS.includes(kind)) {
    logError(`evidence kind must be one of: ${EVIDENCE_KINDS.join(', ')}`);
    return 1;
  }
  if (!source || !detail) {
    logError('evidence requires a source and concrete detail');
    return 1;
  }

  const state = requireState();
  const nextState = addEvidence(state, { kind, source, result, detail });
  writeFableState(process.cwd(), nextState);

  recordTelemetry({
    eventType: 'evidence_added',
    phase: nextState.phase,
    success: result === 'pass',
  });

  const latest = nextState.evidence[nextState.evidence.length - 1];
  return printJsonOrSummary(nextState, hasJsonFlag(args), () => {
    logHeader('get-fable evidence recorded');
    console.log(`Result: ${result}`);
    console.log(`Kind: ${kind}`);
    console.log(`Source: ${source}`);
    console.log(`Generation: ${latest.generation}`);
    console.log(`Phase: ${nextState.phase}`);
    console.log(`Failure streak: ${nextState.failureStreak}`);
    console.log(`Verified generation: ${nextState.verifiedGeneration}`);
  });
}

function runSparkCommand(args: string[]): number {
  const json = hasJsonFlag(args);
  const userIntent =
    args.filter((arg) => arg !== '--json').join(' ').trim() || undefined;
  const state =
    readFableState(process.cwd()) ||
    createInitialState(new Date().toISOString(), process.cwd());

  let openCards: string[] = [];
  const ledgerPath = path.join(process.cwd(), '.fable', 'LEDGER.md');
  if (fs.existsSync(ledgerPath)) {
    const text = fs.readFileSync(ledgerPath, 'utf-8');
    openCards = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('- [ ]'));
  }

  const result = evaluateFableSpark({
    state,
    userIntent,
    openCards,
  });

  recordTelemetry({
    eventType: 'spark_evaluated',
    phase: state.phase,
    success: true,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.suggestion) {
    console.log(result.suggestion);
  }
  return 0;
}

function runShellCommand(args: string[]): number {
  const shellType = (
    args[0] || (process.env.SHELL?.includes('zsh') ? 'zsh' : process.env.SHELL?.includes('fish') ? 'fish' : 'bash')
  ).toLowerCase();
  const repoRoot = getRepoRootDir();

  let scriptFile = 'fable.zsh';
  if (shellType === 'bash') scriptFile = 'fable.bash';
  else if (shellType === 'fish') scriptFile = 'fable.fish';

  const scriptPath = path.join(repoRoot, 'shell', scriptFile);
  if (fs.existsSync(scriptPath)) {
    console.log(fs.readFileSync(scriptPath, 'utf-8'));
    return 0;
  }
  logError(`Shell integration for ${shellType} not found at ${scriptPath}`);
  return 1;
}

function runInstallCommand(args: string[]): number {
  const target = (args[0] || 'all').toLowerCase();

  switch (target) {
    case 'all':
      installGlobalFable();
      return 0;
    case 'claude':
      installClaudeGlobal();
      return 0;
    case 'antigravity':
    case '--antigravity':
    case '-a':
      installAntigravityGlobal();
      return 0;
    case 'codex':
    case '--codex':
      installCodexGlobal();
      return 0;
    case 'cursor':
    case '--cursor':
      installCursorGlobal();
      return 0;
    case 'opencode':
      installOpenCodeGlobal();
      return 0;
    case 'kimi':
      installKimiGlobal();
      return 0;
    case 'deepseek':
      installDeepSeekGlobal();
      return 0;
    case 'kiro':
      installKiroGlobal();
      return 0;
    case 'pi':
      installPiCodeGlobal();
      return 0;
    case 'git':
    case 'git-hooks':
      installGitHooks();
      return 0;
    case 'shell': {
      logHeader('Installing get-fable shell integration');
      const home = os.homedir();
      const zshrc = path.join(home, '.zshrc');
      const bashrc = path.join(home, '.bashrc');
      const line = 'eval "$(get-fable shell init)"';
      if (fs.existsSync(zshrc)) {
        const content = fs.readFileSync(zshrc, 'utf-8');
        if (!content.includes('get-fable shell')) {
          fs.appendFileSync(zshrc, `\n# get-fable shell integration\n${line}\n`);
          logSuccess('Added get-fable shell integration to ~/.zshrc');
        }
      }
      if (fs.existsSync(bashrc)) {
        const content = fs.readFileSync(bashrc, 'utf-8');
        if (!content.includes('get-fable shell')) {
          fs.appendFileSync(bashrc, `\n# get-fable shell integration\n${line}\n`);
          logSuccess('Added get-fable shell integration to ~/.bashrc');
        }
      }
      return 0;
    }
    default:
      logError(
        `Unknown install target: ${target}. Valid targets: all, claude, antigravity, codex, cursor, opencode, kimi, deepseek, kiro, pi, git, shell`
      );
      return 1;
  }
}

async function runUpdateCommand(args: string[]): Promise<number> {
  const currentVersion = getPackageVersion();
  const repoRoot = getRepoRootDir();
  const checkOnly = hasFlag(args, '--check');
  const force = hasFlag(args, '--force');

  if (checkOnly) {
    logInfo(`Checking latest get-fable version...`);
    const check = await fetchLatestVersion(currentVersion);
    console.log(`Current Version: v${check.currentVersion}`);
    console.log(`Latest Version:  v${check.latestVersion}`);
    console.log(`Update Available: ${check.updateAvailable ? 'YES' : 'NO'}`);
    if (check.updateAvailable) {
      console.log(`Run ${colors.green}get-fable update${colors.reset} to upgrade.`);
    }
    return 0;
  }

  const result = await runAutoUpdate(currentVersion, repoRoot, force);
  return result.success ? 0 : 1;
}

function runTelemetryCommand(args: string[]): number {
  const sub = (args[0] || 'status').toLowerCase();

  switch (sub) {
    case 'status': {
      const summary = getTelemetrySummary();
      logHeader('get-fable telemetry status');
      console.log(`Enabled: ${summary.config.enabled ? 'YES' : 'NO'}`);
      console.log(`Anonymous ID: ${summary.config.anonymousId}`);
      console.log(`Total Events Recorded: ${summary.config.totalEvents}`);
      console.log(`Last Event At: ${summary.config.lastEventAt || 'never'}`);
      console.log(`Event Counts by Type:`);
      for (const [k, v] of Object.entries(summary.eventCountsByType)) {
        console.log(`  - ${k}: ${v}`);
      }
      return 0;
    }
    case 'enable': {
      const config = loadTelemetryConfig();
      config.enabled = true;
      saveTelemetryConfig(config);
      logSuccess('Telemetry enabled.');
      return 0;
    }
    case 'disable': {
      const config = loadTelemetryConfig();
      config.enabled = false;
      saveTelemetryConfig(config);
      logSuccess('Telemetry disabled.');
      return 0;
    }
    case 'export': {
      const summary = getTelemetrySummary();
      console.log(JSON.stringify(summary, null, 2));
      return 0;
    }
    case 'clear': {
      clearTelemetryLogs();
      logSuccess('Cleared local telemetry logs.');
      return 0;
    }
    default:
      logError(`Unknown telemetry action: ${sub}. Use: status, enable, disable, export, clear`);
      return 1;
  }
}

function runFeedCommand(args: string[]): number {
  const json = hasJsonFlag(args);
  const sub = (args[0] || 'list').toLowerCase();

  switch (sub) {
    case 'list': {
      const feed = loadSkillFeed();
      if (json) {
        console.log(JSON.stringify(feed, null, 2));
      } else {
        logHeader(`get-fable Skill Feed (${feed.length} skills available)`);
        for (const item of feed) {
          const packCol = `[${item.pack}]`.padEnd(16);
          console.log(
            `  ${colors.green}${item.id.padEnd(16)}${colors.reset} ${colors.yellow}${packCol}${colors.reset} ${item.description}`
          );
        }
      }
      return 0;
    }
    case 'search': {
      const query = args.filter((a) => a !== '--json' && a !== 'search').join(' ').trim();
      const results = searchSkillFeed(query);
      if (json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        logHeader(`Search results for "${query}" (${results.length} skills matched)`);
        for (const item of results) {
          console.log(
            `  ${colors.green}${item.id.padEnd(16)}${colors.reset} ${colors.yellow}[${item.pack}]${colors.reset} ${item.description}`
          );
        }
      }
      return 0;
    }
    case 'inspect': {
      const id = args[1];
      if (!id) {
        logError('feed inspect requires a skill ID');
        return 1;
      }
      const detail = inspectSkillDetail(id);
      if (!detail.item) {
        logError(`Skill "${id}" not found in feed`);
        return 1;
      }
      if (json) {
        console.log(JSON.stringify(detail, null, 2));
      } else {
        logHeader(`Skill Detail: ${detail.item.id}`);
        console.log(`Pack: ${detail.item.pack}`);
        console.log(`Description: ${detail.item.description}`);
        console.log(`Intents: ${detail.item.intents.join(', ')}`);
        console.log(`Produces: ${detail.item.produces.join(', ')}`);
        console.log(`Gates: ${detail.item.gates.join(', ')}`);
        console.log(`Mutates Workspace: ${detail.item.mutatesWorkspace ? 'YES' : 'NO'}`);
        console.log(`Installed: ${detail.item.isInstalled ? 'YES' : 'NO'}`);
      }
      return 0;
    }
    default:
      logError(`Unknown feed action: ${sub}. Use: list, search <query>, inspect <skill-id>`);
      return 1;
  }
}

function runSkillsCommand(args: string[]): number {
  const sub = (args[0] || 'list').toLowerCase();

  switch (sub) {
    case 'install': {
      const packOrSkill = args[1] || 'all';
      const isGlobal = !hasFlag(args, '--project');
      const force = hasFlag(args, '--force');
      logHeader(`Auto-installing Fable skills (${packOrSkill})`);
      const result = autoInstallSkills({
        packOrSkill,
        global: isGlobal,
        overwrite: force,
      });

      if (result.success) {
        logSuccess(
          `Installed ${result.totalInstalled} skills (${result.installedSkills.join(', ')}) across ${
            result.targetPaths.length
          } target directories.`
        );
        return 0;
      } else {
        logError('Failed to install skills.');
        return 1;
      }
    }
    case 'list': {
      return runFeedCommand(['list', ...args.slice(1)]);
    }
    case 'inspect':
    case 'info': {
      return runFeedCommand(['inspect', ...args.slice(1)]);
    }
    default:
      logError(`Unknown skills action: ${sub}. Use: install [pack|all], list, inspect <skill-id>`);
      return 1;
  }
}

function runGraphCommand(args: string[]): number {
  const json = hasJsonFlag(args);
  const targetSkill = args.find((a) => a !== '--json');

  try {
    const graph = loadNeuralGraph();
    if (json) {
      if (targetSkill) {
        const conn = getNeuralConnections(targetSkill, graph);
        console.log(JSON.stringify(conn, null, 2));
      } else {
        console.log(JSON.stringify(graph, null, 2));
      }
    } else {
      console.log(renderNeuralGraphAscii(targetSkill, graph));
    }
    return 0;
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function runRecipesCommand(args: string[]): number {
  const json = hasJsonFlag(args);
  const sub = (args[0] || 'list').toLowerCase();

  switch (sub) {
    case 'list': {
      const recipes = listRecipes();
      if (json) {
        console.log(JSON.stringify(recipes, null, 2));
      } else {
        logHeader(`Fable Lifecycle Recipes (${recipes.length} available)`);
        for (const r of recipes) {
          console.log(
            `  ${colors.green}${r.id.padEnd(20)}${colors.reset} ${colors.yellow}[${(r.targetShape || 'general').padEnd(12)}]${colors.reset} ${r.description}`
          );
        }
      }
      return 0;
    }
    case 'run':
    case 'inspect': {
      const id = args[1];
      if (!id) {
        logError('Recipe command requires a recipe ID (e.g. bug-fix, build-feature)');
        return 1;
      }
      try {
        if (json) {
          const recipe = getRecipe(id);
          if (!recipe) {
            logError(`Recipe '${id}' not found`);
            return 1;
          }
          console.log(JSON.stringify(recipe, null, 2));
        } else {
          console.log(renderRecipeAscii(id));
        }
        return 0;
      } catch (error) {
        logError(error instanceof Error ? error.message : String(error));
        return 1;
      }
    }
    default:
      logError(`Unknown recipes action: ${sub}. Use: list, inspect <recipe-id>`);
      return 1;
  }
}

function runPacksCommand(args: string[]): number {
  const json = hasJsonFlag(args);
  const sub = (args[0] || 'list').toLowerCase();
  const repoRoot = getRepoRootDir();
  const packsDir = path.join(repoRoot, 'packs');

  if (!fs.existsSync(packsDir)) {
    logError('Packs directory not found');
    return 1;
  }

  switch (sub) {
    case 'list': {
      const files = fs.readdirSync(packsDir).filter((f) => f.endsWith('.json'));
      const packs = files.map((f) => {
        const content = JSON.parse(fs.readFileSync(path.join(packsDir, f), 'utf-8'));
        return {
          name: content.name,
          version: content.version,
          description: content.description,
          skillCount: content.skills?.length || 0,
        };
      });

      if (json) {
        console.log(JSON.stringify(packs, null, 2));
      } else {
        logHeader(`Fable Skill Packs (${packs.length} available)`);
        for (const p of packs) {
          console.log(
            `  ${colors.green}${p.name.padEnd(16)}${colors.reset} ${colors.yellow}(${p.skillCount} skills)${colors.reset} ${p.description}`
          );
        }
      }
      return 0;
    }
    case 'inspect': {
      const name = args[1];
      if (!name) {
        logError('packs inspect requires a pack name (e.g. core, build, creator)');
        return 1;
      }
      const packFile = path.join(packsDir, `${name}.json`);
      if (!fs.existsSync(packFile)) {
        logError(`Pack '${name}' not found at ${packFile}`);
        return 1;
      }
      const content = JSON.parse(fs.readFileSync(packFile, 'utf-8'));
      if (json) {
        console.log(JSON.stringify(content, null, 2));
      } else {
        logHeader(`Pack: ${content.name} (v${content.version})`);
        console.log(`Description: ${content.description}`);
        console.log(`Skills: ${content.skills?.join(', ')}`);
      }
      return 0;
    }
    default:
      logError(`Unknown packs action: ${sub}. Use: list, inspect <pack-name>`);
      return 1;
  }
}

export function runCli(args: string[] = process.argv.slice(2)): number | Promise<number> {
  const command = args[0] || 'help';

  switch (command) {
    case 'graph':
      return runGraphCommand(args.slice(1));

    case 'recipes':
    case 'recipe':
      return runRecipesCommand(args.slice(1));

    case 'packs':
    case 'pack':
      return runPacksCommand(args.slice(1));

    case 'install':
      return runInstallCommand(args.slice(1));

    case 'skills':
      return runSkillsCommand(args.slice(1));

    case 'install-antigravity':
      logHeader('Installing get-fable for Antigravity');
      installAntigravityGlobal();
      return 0;

    case 'install-codex':
      logHeader('Installing get-fable for Codex');
      installCodexGlobal();
      return 0;

    case 'install-cursor':
      logHeader('Installing get-fable for Cursor');
      installCursorGlobal();
      return 0;

    case 'install-git-hooks':
      logHeader('Installing universal get-fable git hooks');
      installGitHooks();
      return 0;

    case 'init':
      logHeader('Initializing project workflow files (.fable/ & .agents/)');
      initProjectFable(process.cwd());
      return 0;

    case 'route':
      return runRoute(args.slice(1));

    case 'spark':
      return runSparkCommand(args.slice(1));

    case 'state':
      return runStateCommand(args.slice(1));

    case 'mutation':
      return runMutationCommand(args.slice(1));

    case 'card':
      return runCardCommand(args.slice(1));

    case 'evidence':
      return runEvidenceCommand(args.slice(1));

    case 'shell':
      return runShellCommand(args.slice(1));

    case 'update':
      return runUpdateCommand(args.slice(1));

    case 'telemetry':
      return runTelemetryCommand(args.slice(1));

    case 'feed':
      return runFeedCommand(args.slice(1));

    case 'guide':
    case 'help':
      if (args[1]) {
        console.log(renderInteractiveHelp(args[1]));
        return 0;
      }
      showHelp();
      return 0;

    case 'doctor': {
      const fix = hasFlag(args, '--fix');
      if (fix) {
        logHeader('get-fable doctor --fix (Auto-Repair)');
        const fixResult = runDoctorFix(process.cwd());
        for (const item of fixResult.repaired) {
          logSuccess(`Repaired: ${item}`);
        }
        for (const err of fixResult.errors) {
          logError(`Repair error: ${err}`);
        }
      }

      const report = runDoctor(process.cwd());
      recordTelemetry({
        eventType: 'doctor_run',
        success: report.ok,
      });

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
${colors.bright}${colors.cyan}get-fable v${getPackageVersion()}${colors.reset} | Coding lifecycle discipline for AI agents

${colors.bright}USAGE:${colors.reset}
  $ ${colors.green}get-fable${colors.reset} [command]
  $ ${colors.green}bun ./bin/get-fable.js${colors.reset} [command]

${colors.bright}CORE WORKFLOW COMMANDS:${colors.reset}
  ${colors.yellow}init${colors.reset}                 Create durable project state and canonical project skills
  ${colors.yellow}route <task>${colors.reset}         Explain workflow selection; add --apply to persist it and --json for machine output
  ${colors.yellow}spark [intent]${colors.reset}       Predict the atomic next move from current state; add --json
  ${colors.yellow}state <phase>${colors.reset}        Transition durable workflow state; add --substantial and/or --json
  ${colors.yellow}mutation [source]${colors.reset}    Record a workspace mutation and invalidate older verification
  ${colors.yellow}card <text>${colors.reset}          Set the active work card; use --clear to remove it
  ${colors.yellow}evidence ...${colors.reset}         Record typed evidence: <result> <kind> <source> <detail>
  ${colors.yellow}lint${colors.reset}                 Verify ledger acceptance, evidence, and state consistency
  ${colors.yellow}doctor [--fix]${colors.reset}       Validate and auto-repair installation, registry, state, and hooks

${colors.bright}EXTENSIBILITY & PLATFORMS:${colors.reset}
  ${colors.yellow}graph [skill-id]${colors.reset}     Inspect neural linking and knowledge graph topology; add --json
  ${colors.yellow}recipes [list|inspect]${colors.reset}List and view lifecycle workflow recipes; add --json
  ${colors.yellow}packs [list|inspect]${colors.reset}  List and view grouped skill packs; add --json
  ${colors.yellow}install [target]${colors.reset}    Install global agent integrations (all, claude, antigravity, codex, cursor, opencode, kimi, deepseek, kiro, pi, git, shell)
  ${colors.yellow}feed [list|search]${colors.reset}  Discover, search, and inspect available skills in the catalog
  ${colors.yellow}shell [zsh|bash|fish]${colors.reset}Print shell integration script for your terminal
  ${colors.yellow}update [--check]${colors.reset}     Check and apply automatic updates
  ${colors.yellow}telemetry [status|..]${colors.reset}Manage privacy-preserving local telemetry
  ${colors.yellow}status${colors.reset}               Report installation state; add --json for machine output

${colors.bright}HELP & GUIDANCE:${colors.reset}
  ${colors.yellow}help [topic]${colors.reset}         Display interactive help on: lifecycle, skills, spark, evidence, platforms, hooks, commands
  ${colors.yellow}version${colors.reset}              Print the installed get-fable version

Evidence kinds: ${EVIDENCE_KINDS.join(', ')}

Running get-fable without a command shows this help. Installation is always explicit.
`);
}

export async function main() {
  try {
    const res = runCli();
    process.exitCode = res instanceof Promise ? await res : res;
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
