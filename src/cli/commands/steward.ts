/**
 * CLI Command Handler for `get-fable steward` / `get-fable auto-steward`.
 * Autonomous Perpetual Repository Steward & Innovation Engine.
 */

import path from 'node:path';
import {
  probeAndTriage,
  runStewardCycle,
  runStewardPerpetualLoop,
} from '../../core/steward/index.js';
import type { StewardOptions } from '../../core/steward/types.js';

export async function runStewardCommand(args: string[]): Promise<number> {
  const isHelp =
    args.includes('--help') || args.includes('-h') || args[0] === 'help';
  if (isHelp) {
    console.log(`
get-fable steward | Autonomous Perpetual Repository Steward & Innovation Engine

USAGE:
  $ get-fable steward [options]
  $ bun ./bin/get-fable.js steward [options]

OPTIONS:
  --dry-run             Probe repository & GitHub status and print triage decision without mutating workspace
  --loop                Run perpetual continuous loop across triage cycles
  --interval <seconds>  Cooldown interval between loop cycles (default: 60)
  --max-cycles <count>  Maximum autonomous cycles before pausing (default: 100)
  --allow-self-merge    Allow automatic merging of PRs where all checks pass
  --json                Output machine-readable JSON
  --json-v1             Wrap JSON output in standard Fable schema-v1 envelope
  --help, -h            Show this help message

PRIORITY MATRIX:
  Tier 1: Failing Mainline CI Runs        -> fable-tend (Repair broken builds)
  Tier 2: Pending Pull Requests           -> fable-review + fable-judge (Diff audit & test verification)
  Tier 3: Open GitHub Issues              -> fable-plan + fable-tdd (Reproduce, fix, & PR)
  Tier 4: Code Hygiene & Anti-Slop        -> fable-anti-slop-engineering (Clean active diffs)
  Tier 5: Autonomous Feature Innovation   -> fable-spark + fable-cowork (Package next capability)
`);
    return 0;
  }

  const dryRun = args.includes('--dry-run');
  const loop = args.includes('--loop');
  const allowSelfMerge = args.includes('--allow-self-merge');
  const json = args.includes('--json') || args.includes('--json-v1');
  const jsonV1 = args.includes('--json-v1');

  let intervalSeconds = loop ? 60 : 0;
  const intervalIdx = args.indexOf('--interval');
  if (intervalIdx !== -1 && args[intervalIdx + 1]) {
    intervalSeconds = Math.max(0, parseInt(args[intervalIdx + 1], 10));
  }

  let maxCycles = loop ? Infinity : 1;
  const maxCyclesIdx = args.indexOf('--max-cycles');
  if (maxCyclesIdx !== -1 && args[maxCyclesIdx + 1]) {
    maxCycles = Math.max(1, parseInt(args[maxCyclesIdx + 1], 10) || 100);
  }

  const noWatchdog = args.includes('--no-watchdog');
  const watchdog = !noWatchdog;

  const options: StewardOptions = {
    dryRun,
    loop,
    intervalSeconds,
    maxCycles,
    allowSelfMerge,
    watchdog,
    cwd: process.cwd(),
    json,
    jsonV1,
  };

  if (dryRun) {
    const { probe, decision } = probeAndTriage(options.cwd || process.cwd());
    const payload = {
      command: 'steward',
      mode: 'dry-run',
      timestamp: new Date().toISOString(),
      probe: {
        ghAvailable: probe.ghAvailable,
        ghAuthenticated: probe.ghAuthenticated,
        failingRunsCount: probe.runs.filter((r) => r.conclusion === 'failure').length,
        openPrsCount: probe.prs.length,
        openIssuesCount: probe.issues.length,
        localModifiedCount: probe.localAudit.modifiedFilesCount,
        localUntrackedCount: probe.localAudit.untrackedFilesCount,
      },
      decision,
    };

    if (jsonV1) {
      console.log(
        JSON.stringify({ schemaVersion: 1, command: 'steward', data: payload }, null, 2)
      );
    } else if (json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(`
=== Fable Autonomous Steward: Triage Analysis (Dry-Run) ===
GitHub Connected: ${probe.ghAvailable && probe.ghAuthenticated ? 'YES (Authenticated)' : 'NO / Offline'}
Failing Runs:     ${payload.probe.failingRunsCount}
Open PRs:         ${payload.probe.openPrsCount}
Open Issues:      ${payload.probe.openIssuesCount}
Modified Files:   ${payload.probe.localModifiedCount}
Untracked Files:  ${payload.probe.localUntrackedCount}

--- TRIAGE DECISION ---
Priority:         Tier ${decision.tier} [${decision.category.toUpperCase()}]
Confidence:       ${Math.round(decision.confidence * 100)}%
Recommended:      ${decision.recommendedSkill}
Action:           ${decision.title}
Task:             ${decision.suggestedTask}
Reasons:
${decision.reasons.map((r) => `  - ${r}`).join('\n')}
`);
    }
    return 0;
  }

  if (loop) {
    if (!json) {
      console.log(
        `[get-fable steward] Starting perpetual autonomous loop (interval: ${intervalSeconds}s, maxCycles: ${maxCycles}, watchdog: ${watchdog ? 'ENABLED' : 'DISABLED'})...`
      );
    }
    await runStewardPerpetualLoop(options, (cycleResult) => {
      if (jsonV1) {
        console.log(
          JSON.stringify(
            { schemaVersion: 1, command: 'steward-cycle', data: cycleResult },
            null,
            2
          )
        );
      } else if (json) {
        console.log(JSON.stringify(cycleResult, null, 2));
        console.log(
          `[Cycle ${cycleResult.cycleIndex}] Tier ${cycleResult.decision.tier} (${cycleResult.decision.category}): ${cycleResult.decision.title} -> ${cycleResult.status}`
        );
        if (cycleResult.artifactsCreated && cycleResult.artifactsCreated.length > 0) {
          console.log(
            `          └─ Created: ${cycleResult.artifactsCreated.map((a: string) => path.basename(a)).join(', ')}`
          );
        }
        if (cycleResult.workSummary) {
          console.log(`          └─ Work: ${cycleResult.workSummary}`);
        }
      }
    });
    return 0;
  }

  // Single cycle run
  const result = await runStewardCycle(options, 1);
  if (jsonV1) {
    console.log(
      JSON.stringify(
        { schemaVersion: 1, command: 'steward', data: result },
        null,
        2
      )
    );
  } else if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`
=== Fable Autonomous Steward Cycle ===
Status:           ${result.status.toUpperCase()}
Priority:         Tier ${result.decision.tier} (${result.decision.category})
Action:           ${result.decision.title}
Skill:            ${result.decision.recommendedSkill}
Message:          ${result.message}
`);
    if (result.delegationPlan) {
      console.log(
        `Orchestration:   ${result.delegationPlan.totalSubtasks} subtasks across ${result.delegationPlan.totalWaves} wave(s)`
      );
      if (result.delegationPlan.toonSummary) {
        console.log(`\n--- TOON Summary ---\n${result.delegationPlan.toonSummary}`);
      }
    }
  }

  return result.status === 'failed' ? 1 : 0;
}
