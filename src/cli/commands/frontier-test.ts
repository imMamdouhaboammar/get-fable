/**
 * Fable Frontier Testing Engine — CLI Command Handler
 *
 * Implements: `get-fable test-engine [action]`
 *
 * Actions:
 * - status: Displays supported tools, categories, and installation status
 * - scan: Inspects project topology and recommends best-fit testing engines
 * - plan: Synthesizes a multi-tool verification plan
 * - install: Provisions and scaffolds configuration for a testing engine
 * - run: Executes tests via the super-agentic orchestrator
 * - repro: Scaffolds a minimal reproducer harness (cypress-test-tiny pattern)
 * - provenance: Displays the cryptographic REA evidence ledger
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FrontierTestOrchestrator,
  FRONTIER_TEST_REA_EVIDENCE_LEDGER,
  synthesizeFrontierEvidence,
  type FrontierToolId
} from '../../core/frontier-test/index.js';

interface CliEnvelope<T> {
  schemaVersion: 1;
  command: string;
  data: T;
}

function printOutput<T>(args: string[], command: string, data: T, humanPrinter: () => void): void {
  if (args.includes('--json-v1')) {
    const envelope: CliEnvelope<T> = {
      schemaVersion: 1,
      command,
      data
    };
    console.log(JSON.stringify(envelope, null, 2));
    return;
  }
  humanPrinter();
}

export async function runFrontierTestCommand(args: string[]): Promise<number> {
  const orchestrator = new FrontierTestOrchestrator();
  const projectRoot = process.cwd();
  const firstArg = args[0];
  const isAuto = !firstArg || firstArg === 'auto' || firstArg.startsWith('--');
  const action = isAuto ? 'auto' : firstArg;
  const rest = isAuto && firstArg === 'auto' ? args.slice(1) : isAuto ? args : args.slice(1);

  if (action === 'auto') {
    const targetDir = rest.find((a) => !a.startsWith('--')) || projectRoot;
    const isDryRun = rest.includes('--dry-run');
    const recordEvidence = !rest.includes('--no-evidence');
    const autoProvision = !rest.includes('--no-provision');
    const autoRemediate = !rest.includes('--no-remediate');

    let maxTools = 3;
    const maxToolsIdx = rest.indexOf('--max-tools');
    if (maxToolsIdx !== -1 && rest[maxToolsIdx + 1]) {
      const parsed = parseInt(rest[maxToolsIdx + 1], 10);
      if (!isNaN(parsed) && parsed > 0) maxTools = parsed;
    }

    const autoResult = await orchestrator.autoExecute(targetDir, {
      mode: isDryRun ? 'dry-run' : 'run',
      recordEvidence,
      autoProvision,
      autoRemediate,
      maxTools
    });

    printOutput(rest, 'test-engine:auto', autoResult, () => {
      console.log('\n===============================================================');
      console.log('    Fable Frontier Testing Engine — Autonomous Auto-Pilot     ');
      console.log('===============================================================\n');
      console.log('Zero-Decision Principle: The system autonomously discovers, selects,');
      console.log('provisions, executes, and stamps test evidence without manual friction.\n');

      const verdictBadge = autoResult.overallPassed
        ? '\x1b[32m✔ PASS\x1b[0m'
        : '\x1b[31m✖ FAIL\x1b[0m';

      console.log(`Autonomous Verdict: ${verdictBadge}`);
      console.log(`Target Workspace:   ${autoResult.projectRoot}`);
      console.log(`Classified Shape:   ${autoResult.scan.projectType} (${autoResult.scan.detectedLanguages.join(', ') || 'polyglot'})`);
      console.log(`Executed Toolchain: \x1b[36m${autoResult.executedTools.join(' -> ')}\x1b[0m`);
      console.log(`Test Assertions:    \x1b[1m${autoResult.totalPassedTests} passed\x1b[0m, ${autoResult.totalFailedTests} failed (total ${autoResult.totalTests})`);
      console.log(`Execution Duration: ${autoResult.durationMs}ms`);
      console.log(`Lifecycle Evidence: ${autoResult.evidenceStamped ? '\x1b[32mSTAMPED (.fable/state.json)\x1b[0m' : 'SKIPPED'}\n`);

      console.log('Autonomous Decisions & Actions:');
      for (const act of autoResult.autonomousActions) {
        console.log(`  ✓ ${act}`);
      }
      console.log('');

      console.log('Multi-Tool Execution Breakdown:');
      for (const res of autoResult.results) {
        const status = res.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
        console.log(`• [${status}] \x1b[1m${res.toolId}\x1b[0m: ${res.passedTests}/${res.totalTests} passed in ${res.durationMs}ms`);
        if (res.diagnosis && res.diagnosis.kind !== 'NONE') {
          console.log(`  ↳ Triage: [${res.diagnosis.kind}] ${res.diagnosis.explanation}`);
        }
      }
      console.log('');
    });

    return autoResult.overallPassed ? 0 : 1;
  }


  if (action === 'status') {
    const capabilities = orchestrator.listCapabilities(projectRoot);
    printOutput(rest, 'test-engine:status', capabilities, () => {
      console.log('\n===============================================================');
      console.log('       Fable Frontier Testing Engine — Supported Tools         ');
      console.log('===============================================================\n');
      console.log('Super-Agentic Testing Worker leveraging world-class testing engines:\n');
      for (const cap of capabilities) {
        const statusBadge = cap.installed ? '[\x1b[32mINSTALLED\x1b[0m]' : '[\x1b[33mAVAILABLE\x1b[0m]';
        console.log(`• ${cap.id.padEnd(16)} ${statusBadge} ${cap.name}`);
        console.log(`  Category:    ${cap.category}`);
        console.log(`  Description: ${cap.description}`);
        console.log(`  Upstream:    ${cap.upstreamRepo}\n`);
      }
    });
    return 0;
  }

  if (action === 'scan') {
    const targetDir = rest.find((a) => !a.startsWith('--')) || projectRoot;
    const scanResult = orchestrator.scan(targetDir);

    printOutput(rest, 'test-engine:scan', scanResult, () => {
      console.log('\n===============================================================');
      console.log('          Frontier Test Repository Scan & Readiness            ');
      console.log('===============================================================\n');
      console.log(`Project Root:       ${scanResult.projectRoot}`);
      console.log(`Classified Type:    ${scanResult.projectType}`);
      console.log(`Languages:          ${scanResult.detectedLanguages.join(', ') || 'none'}`);
      console.log(`Frameworks:         ${scanResult.detectedFrameworks.join(', ') || 'none'}`);
      console.log(`Package Manager:    ${scanResult.packageManager}`);
      console.log(`Has Docker/Compose: ${scanResult.hasDocker || scanResult.hasCompose ? 'YES' : 'NO'}`);
      console.log(`Existing Test Files: ${scanResult.existingTestFiles.length}\n`);

      console.log('Recommended Testing Toolchain:');
      for (const rec of scanResult.recommendedTools) {
        const priorityColor =
          rec.priority === 'high' ? '\x1b[32mHIGH\x1b[0m' : rec.priority === 'medium' ? '\x1b[33mMEDIUM\x1b[0m' : 'LOW';
        console.log(`• [Score: ${rec.score}/100] [${priorityColor}] \x1b[1m${rec.toolId}\x1b[0m`);
        console.log(`  ${rec.reason}\n`);
      }
    });
    return 0;
  }

  if (action === 'plan') {
    const goal = rest.filter((a) => !a.startsWith('--')).join(' ');
    const plan = orchestrator.plan(projectRoot, goal || undefined);

    printOutput(rest, 'test-engine:plan', plan, () => {
      console.log('\n===============================================================');
      console.log(`         Frontier Verification Plan: ${plan.title}             `);
      console.log('===============================================================\n');
      console.log(`Goal: ${plan.goal}\n`);
      console.log('Execution Steps:');
      plan.steps.forEach((step, idx) => {
        console.log(`${idx + 1}. [${step.action.toUpperCase()}] ${step.toolId}`);
        console.log(`   ${step.description}`);
        console.log(`   Command: \x1b[36m${step.command}\x1b[0m\n`);
      });
    });
    return 0;
  }

  if (action === 'install') {
    const toolId = rest[0] as FrontierToolId;
    if (!toolId) {
      console.error('Usage: get-fable test-engine install <tool-id>');
      console.error('Available: midscene, keploy, distributed-e2e, tester-army, minimal-repro, vitest, playwright');
      return 1;
    }

    const scaffoldResult = await orchestrator.provision(projectRoot, toolId, { overwrite: rest.includes('--overwrite') });

    printOutput(rest, 'test-engine:install', scaffoldResult, () => {
      console.log(`\n✔ Successfully provisioned ${toolId}:`);
      scaffoldResult.createdFiles.forEach((f) => console.log(`  + Created: ${f}`));
      console.log('\nNext Steps:');
      scaffoldResult.instructions.forEach((i) => console.log(`  • ${i}`));
      console.log(`\nRun Command:\n  ${scaffoldResult.suggestedRunCommand}\n`);
    });
    return scaffoldResult.success ? 0 : 1;
  }

  if (action === 'run') {
    const toolId = (rest.find((a) => !a.startsWith('--')) as FrontierToolId) || 'bun-test';
    const isDryRun = rest.includes('--dry-run');
    const recordEvidence = rest.includes('--record-evidence');

    const runResult = await orchestrator.run(projectRoot, toolId, {
      mode: isDryRun ? 'dry-run' : 'run'
    });

    if (recordEvidence && existsSync(join(projectRoot, '.fable', 'state.json'))) {
      try {
        const statePath = join(projectRoot, '.fable', 'state.json');
        const state = JSON.parse(readFileSync(statePath, 'utf-8'));
        const synthesis = synthesizeFrontierEvidence(runResult, state.mutationGeneration || 1);
        if (!state.evidence) state.evidence = [];
        state.evidence.push(synthesis.evidenceRecord);
        if (synthesis.pass) {
          state.verifiedGeneration = state.mutationGeneration || 1;
        }
        state.updatedAt = new Date().toISOString();
        writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
      } catch (err) {
        console.warn(`[Warning] Could not record evidence to .fable/state.json: ${err}`);
      }
    }

    printOutput(rest, 'test-engine:run', runResult, () => {
      console.log('\n===============================================================');
      console.log(`       Frontier Test Execution: ${runResult.toolId}            `);
      console.log('===============================================================\n');
      console.log(`Status:      ${runResult.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}`);
      console.log(`Tests:       ${runResult.passedTests} passed, ${runResult.failedTests} failed (total ${runResult.totalTests})`);
      console.log(`Duration:    ${runResult.durationMs}ms`);
      console.log(`Command:     ${runResult.command}\n`);
      if (runResult.stdout) {
        console.log(`Output:\n${runResult.stdout.trim()}\n`);
      }
      if (runResult.stderr) {
        console.log(`Errors:\n${runResult.stderr.trim()}\n`);
      }
      if (runResult.diagnosis) {
        console.log(`Failure Diagnosis: [${runResult.diagnosis.kind}] ${runResult.diagnosis.explanation}\n`);
      }
    });

    return runResult.exitCode;
  }

  if (action === 'repro') {
    const scenario = rest.filter((a) => !a.startsWith('--')).join(' ') || 'Minimal Bug Reproduction';
    const result = await orchestrator.provision(projectRoot, 'minimal-repro', {
      scenarioName: scenario,
      overwrite: rest.includes('--overwrite')
    });

    printOutput(rest, 'test-engine:repro', result, () => {
      console.log('\n✔ Scaffolded Minimal Reproducer Harness (Cypress-Tiny Pattern):');
      result.createdFiles.forEach((f) => console.log(`  + ${f}`));
      console.log(`\nRun to verify bug reproduction / falsification:\n  ${result.suggestedRunCommand}\n`);
    });
    return 0;
  }

  if (action === 'provenance') {
    printOutput(rest, 'test-engine:provenance', FRONTIER_TEST_REA_EVIDENCE_LEDGER, () => {
      console.log('\n===============================================================');
      console.log('       Frontier Testing Engine — REA Evidence Ledger           ');
      console.log('===============================================================\n');
      console.log(`Philosophy:  "${FRONTIER_TEST_REA_EVIDENCE_LEDGER.corePhilosophy}"`);
      console.log(`Studied At:  ${FRONTIER_TEST_REA_EVIDENCE_LEDGER.studiedAt}\n`);

      for (const [key, repo] of Object.entries(FRONTIER_TEST_REA_EVIDENCE_LEDGER.repositories)) {
        console.log(`[Repository: ${key}]`);
        console.log(`  URL:         ${repo.url}`);
        console.log(`  Category:    ${repo.category}`);
        console.log(`  Description: ${repo.description}`);
        for (const art of repo.artifacts) {
          console.log(`  Artifact:    ${art.artifact} (sha256:${art.sha256.slice(0, 16)}...)`);
          console.log(`  Innovation:  ${art.coreInnovation}`);
          console.log(`  Symbols:     ${art.verifiedSymbols.join(', ')}`);
        }
        console.log('');
      }
    });
    return 0;
  }

  console.error(`Unknown test-engine action: ${action}`);
  console.error('Available actions: auto, status, scan, plan, install, run, repro, provenance');
  return 1;
}
