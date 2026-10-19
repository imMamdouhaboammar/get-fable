/**
 * CLI Command Handler for `get-fable orchestrate`, `blackboard`, `sentinel`, and `heal`.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  FableOrchestratorKernel,
  coerceGoalToTaskSpec,
  parseTaskSpec,
} from '../../core/orchestrator/index.js';
import { colors, logHeader, logInfo, logSuccess, logWarn } from '../../utils.js';

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function hasJsonFlag(args: string[]): boolean {
  return hasFlag(args, '--json') || hasFlag(args, '--json-v1');
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    const val = args[idx + 1];
    if (val && !val.startsWith('--')) return val;
  }
  return undefined;
}

export function runOrchestrateCommand(args: string[]): number {
  const isJson = hasJsonFlag(args);
  const goalFlag = getFlagValue(args, '--goal');
  const fileArg = args.find((a) => !a.startsWith('--') && (a.endsWith('.yaml') || a.endsWith('.yml') || a.endsWith('.json')));

  let specYamlOrGoal: string;

  if (fileArg && fs.existsSync(fileArg)) {
    specYamlOrGoal = fs.readFileSync(fileArg, 'utf8');
  } else if (goalFlag) {
    specYamlOrGoal = goalFlag;
  } else {
    const remainingText = args.filter((a) => !a.startsWith('--')).join(' ');
    specYamlOrGoal = remainingText.trim() || 'Run automated engineering lifecycle verification';
  }

  const kernel = new FableOrchestratorKernel();
  let spec = specYamlOrGoal.includes('apiVersion:')
    ? parseTaskSpec(specYamlOrGoal)
    : coerceGoalToTaskSpec(specYamlOrGoal);

  const submission = kernel.submitTask(spec);
  const wave = kernel.scheduleNextWave();
  const status = kernel.getStatus();

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: 1,
          command: 'orchestrate',
          data: {
            task: submission,
            initialWave: wave,
            status,
          },
        },
        null,
        2
      )
    );
    return 0;
  }

  logHeader('Fable Maestro Orchestration Kernel');
  logInfo(`Task ID     : ${status.taskId}`);
  logInfo(`Goal        : ${spec.spec.goal}`);
  logInfo(`Phase       : ${status.phase}`);
  logInfo(`Wave        : #${wave.waveIndex} (${wave.dispatchedWorkers.length} workers dispatched)`);
  logInfo(`Audit Chain : ${status.auditChainValid ? `${colors.green}VALID (SHA-256 sealed)${colors.reset}` : `${colors.red}INVALID${colors.reset}`}`);

  for (const w of wave.dispatchedWorkers) {
    logSuccess(`Dispatched Lane [${w.role}] -> ${w.workerId} (${w.skills.join(', ')}) [Tier: ${w.tier}]`);
  }

  return 0;
}

export function runBlackboardCommand(args: string[]): number {
  const isJson = hasJsonFlag(args);
  const positionals = args.filter((a) => !a.startsWith('--'));
  const action = positionals[0] || 'status';
  const taskId = getFlagValue(args, '--task-id') || 'active';
  const typeFilter = getFlagValue(args, '--type');

  const kernel = new FableOrchestratorKernel();
  const artifacts = kernel.queryBlackboard(typeFilter);

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: 1,
          command: 'blackboard',
          data: {
            action,
            taskId,
            artifactCount: artifacts.length,
            artifacts,
          },
        },
        null,
        2
      )
    );
    return 0;
  }

  logHeader('Meridian Horizontal Blackboard');
  logInfo(`Active Artifacts: ${artifacts.length}`);

  for (const art of artifacts) {
    console.log(
      `  • [${art.status.toUpperCase()}] ${art.artifactId} (${art.artifactType}) by ${art.workerId}`
    );
  }

  return 0;
}

export function runSentinelCommand(args: string[]): number {
  const isJson = hasJsonFlag(args);
  const positionals = args.filter((a) => !a.startsWith('--'));
  const action = positionals[0] || 'status';

  const kernel = new FableOrchestratorKernel();
  const verification = kernel.verifyAuditChain();
  const records = kernel.ledger.getRecords(10);
  const activeWorkers = kernel.listActiveWorkers();

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: 1,
          command: 'sentinel',
          data: {
            action,
            chainVerification: verification,
            activeWorkers,
            recentRecords: records,
          },
        },
        null,
        2
      )
    );
    return 0;
  }

  logHeader('Sentinel Supervisor & Audit Ledger');
  logInfo(`Hash Chain Integrity : ${verification.valid ? `${colors.green}PASS (Tamper-evident)${colors.reset}` : `${colors.red}FAIL${colors.reset}`}`);
  logInfo(`Total Sealed Records : ${verification.recordCount}`);
  logInfo(`Active Worker Lanes  : ${activeWorkers.length}`);

  if (records.length > 0) {
    console.log(`${colors.cyan}\nRecent Audit Ledger Records:${colors.reset}`);
    for (const rec of records) {
      console.log(
        `  [${rec.timestamp.slice(11, 19)}] ${rec.eventType.padEnd(20)} by ${rec.actorId} (Hash: ${rec.recordHash.slice(0, 12)}...)`
      );
    }
  }

  return 0;
}

export function runHealCommand(args: string[]): number {
  const isJson = hasJsonFlag(args);
  const errorText = args.filter((a) => !a.startsWith('--')).slice(1).join(' ');

  const kernel = new FableOrchestratorKernel();
  const diagnosis = kernel.healflow.diagnose(
    'manual-heal',
    errorText || 'Diagnostic check on runtime environment',
    []
  );

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: 1,
          command: 'heal',
          data: {
            diagnosis,
          },
        },
        null,
        2
      )
    );
    return 0;
  }

  logHeader('HealFlow Causal Failure Diagnosis');
  logInfo(`Diagnosis ID : ${diagnosis.diagnosisId}`);
  logInfo(`Root Cause   : ${diagnosis.rootCause}`);
  logInfo(`Strategy     : ${diagnosis.smallestViableRepair.strategy}`);
  logSuccess(`Prescription : ${diagnosis.smallestViableRepair.remedialInstructions}`);

  return 0;
}
