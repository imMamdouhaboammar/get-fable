import {
  applyUpdatePlan,
  createUpdatePlan,
  detectCurrentInstallation,
  fetchLatestVersion,
  type UpdateRuntimeDeps,
} from '../updater.js';

export interface UpdateCliContext {
  currentVersion: string;
  repoRoot: string;
  deps?: UpdateRuntimeDeps;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function optionValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

function printMachine(args: string[], command: string, payload: unknown): void {
  const value = hasFlag(args, '--json-v1')
    ? { schemaVersion: 1, command, data: payload }
    : payload;
  console.log(JSON.stringify(value));
}

function machineMode(args: string[]): boolean {
  return hasFlag(args, '--json') || hasFlag(args, '--json-v1');
}

function printStatusHuman(status: {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}): void {
  console.log(`Current Version: v${status.currentVersion}`);
  console.log(`Latest Version:  v${status.latestVersion}`);
  console.log(`Update Available: ${status.updateAvailable ? 'YES' : 'NO'}`);
}

function printPlanHuman(plan: Awaited<ReturnType<typeof createUpdatePlan>>): void {
  console.log(`Current Version: v${plan.currentVersion}`);
  console.log(`Target Version:  v${plan.targetVersion}`);
  console.log(`Installation:    ${plan.installation.method}`);
  console.log(`Strategy:        ${plan.strategy}`);
  console.log(`Reason:          ${plan.reason}`);
}

export async function runUpdateCli(args: string[], context: UpdateCliContext): Promise<number> {
  const deps = context.deps ?? {};
  const json = machineMode(args);
  const force = hasFlag(args, '--force');
  const explicitVersion = optionValue(args, '--version');
  const subcommand = hasFlag(args, '--check')
    ? 'status'
    : args[0] && !args[0].startsWith('--')
      ? args[0].toLowerCase()
      : 'apply';

  if (subcommand === 'status') {
    const status = await fetchLatestVersion(
      context.currentVersion,
      deps.timeoutMs ?? 3000,
      deps
    );
    if (json) printMachine(args, 'update:status', status);
    else printStatusHuman(status);
    return 0;
  }

  if (subcommand === 'plan') {
    const plan = await createUpdatePlan(
      context.currentVersion,
      context.repoRoot,
      explicitVersion ? { targetVersion: explicitVersion, targetKind: 'explicit-version' } : {},
      deps
    );
    if (json) printMachine(args, 'update:plan', plan);
    else printPlanHuman(plan);
    return 0;
  }

  if (subcommand === 'doctor') {
    const installation = detectCurrentInstallation(context.repoRoot, deps);
    if (json) printMachine(args, 'update:doctor', installation);
    else {
      console.log(`Installation: ${installation.method}`);
      for (const evidence of installation.evidence) console.log(`Evidence: ${evidence}`);
    }
    return installation.method === 'unknown' ? 1 : 0;
  }

  if (subcommand !== 'apply') {
    if (json) {
      printMachine(args, 'update:error', {
        error: `Unknown update action: ${subcommand}`,
        supported: ['status', 'plan', 'apply', 'doctor'],
      });
    } else {
      console.error(`Unknown update action: ${subcommand}. Use status, plan, apply, or doctor.`);
    }
    return 1;
  }

  let plan;
  if (explicitVersion) {
    plan = await createUpdatePlan(
      context.currentVersion,
      context.repoRoot,
      { targetVersion: explicitVersion, targetKind: 'explicit-version' },
      deps
    );
  } else {
    const status = await fetchLatestVersion(
      context.currentVersion,
      deps.timeoutMs ?? 3000,
      deps
    );
    if (!status.updateAvailable && !force) {
      const result = {
        success: true,
        outcome: 'no-update',
        currentVersion: context.currentVersion,
        targetVersion: status.latestVersion,
        message: `Already up to date (v${context.currentVersion})`,
      };
      if (json) printMachine(args, 'update:apply', result);
      else console.log(result.message);
      return 0;
    }
    plan = await createUpdatePlan(
      context.currentVersion,
      context.repoRoot,
      { targetVersion: status.latestVersion, targetKind: 'latest-stable' },
      deps
    );
  }

  const receipt = applyUpdatePlan(plan, deps);
  if (json) printMachine(args, 'update:apply', receipt);
  else if (receipt.success) console.log(receipt.message);
  else console.error(receipt.message);
  return receipt.success ? 0 : 1;
}
