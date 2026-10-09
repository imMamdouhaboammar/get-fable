/**
 * CLI Command Handler for `get-fable ui-polish`.
 */

import { runUiPolishLoop } from '../../core/ui-polish/index.js';
import { withFableStateTransaction, addEvidence } from '../../core/state.js';
import { getRepoRootDir } from '../../installer.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

export async function runUiPolishCommand(args: string[]): Promise<number> {
  const jsonMode = hasFlag(args, '--json') || hasFlag(args, '--json-v1');
  const dryRun = hasFlag(args, '--dry-run');
  const headed = hasFlag(args, '--headed');
  const noInstall = hasFlag(args, '--no-install');
  const loopsVal = getFlagValue(args, '--loops') || getFlagValue(args, '--max-loops');
  const maxLoops = loopsVal ? parseInt(loopsVal, 10) : 5;

  // Extract URL: first non-flag argument
  const targetUrl = args.find((a) => !a.startsWith('-')) || 'http://127.0.0.1:3000';

  if (!jsonMode) {
    console.log(`\n${colors.cyan}${colors.bright}=== Fable Autonomous UI/UX Polish Round ===${colors.reset}`);
    console.log(`${colors.dim}Target URL:${colors.reset} ${targetUrl}`);
    console.log(`${colors.dim}Headless:${colors.reset}   ${!headed}`);
    console.log(`${colors.dim}Max Loops:${colors.reset}  ${maxLoops}`);
    console.log(`${colors.dim}Dry Run:${colors.reset}    ${dryRun}\n`);
    console.log(`${colors.yellow}▶ Stage 0: Checking and auto-provisioning browser tools...${colors.reset}`);
    console.log(`${colors.yellow}▶ Stage 1-2: Harvesting visual, interaction, and accessibility defects...${colors.reset}`);
  }

  const report = await runUiPolishLoop({
    targetUrl,
    headed,
    dryRun,
    maxLoops,
    autoInstall: !noInstall,
    projectDir: process.cwd(),
  });

  if (jsonMode) {
    console.log(JSON.stringify({ schemaVersion: 1, command: 'ui-polish', data: report }, null, 2));
    return report.circuitBreakerTripped ? 1 : 0;
  }

  console.log(`\n${colors.bright}UI/UX Polish Round Results:${colors.reset}`);
  console.log(`  Total Defects Detected: ${colors.yellow}${report.totalDefects}${colors.reset}`);
  console.log(`  Surgically Resolved:    ${colors.green}${report.resolvedDefects}${colors.reset}`);
  console.log(`  Remaining Defects:      ${report.remainingDefects > 0 ? colors.red : colors.green}${report.remainingDefects}${colors.reset}`);
  console.log(`  Duration:               ${report.durationMs}ms`);

  if (report.circuitBreakerTripped) {
    console.log(`\n${colors.red}${colors.bright}⚠ Fable Circuit Breaker Tripped!${colors.reset}`);
    console.log(`${colors.yellow}Two consecutive repairs failed. Halting automated edits to prevent code churn.${colors.reset}`);
    console.log(`Recommended next action: route to ${colors.cyan}fable-recover${colors.reset}.`);
    return 1;
  }

  // Attempt to record Fable evidence if in a Fable workspace
  try {
    const fableRoot = getRepoRootDir();
    if (fableRoot) {
      withFableStateTransaction(process.cwd(), (state) =>
        addEvidence(state, {
          kind: 'review',
          source: `fable ui-polish ${targetUrl}`,
          result: 'pass',
          detail: `Autonomous UI/UX polish round verified: ${report.resolvedDefects}/${report.totalDefects} defects resolved`,
        })
      );
      console.log(`\n${colors.green}✔ Fable review evidence stamp recorded successfully.${colors.reset}`);
    }
  } catch {
    // Non-fatal outside a fable repo
  }

  console.log(`\n${colors.green}${colors.bright}✔ UI/UX Polish round complete!${colors.reset}\n`);
  return 0;
}
