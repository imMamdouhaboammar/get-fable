/**
 * CLI Command Handler for `get-fable test-value`, `get-fable test-engine`, and `get-fable spearhead`.
 * Reconstructed from: https://github.com/tt-a1i/test-value (tree: e3fb8a7f0950b661fab0993a06306096797dca3f)
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  TEST_VALUE_REA_EVIDENCE_LEDGER,
  auditTestSuite,
  diagnoseTestFailure,
  evaluateThreeQuestions,
  runSpearheadPipeline,
  selectTestsByRisk,
  validateCutBoundaryRecord,
  type OracleSourceKind,
  type ProtectedBoundaryCategory,
} from '../../core/test-value/index.js';
import { colors, logError, logHeader, logInfo, logSuccess, logWarn } from '../../utils.js';

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function hasJsonFlag(args: string[]): boolean {
  return hasFlag(args, '--json') || hasFlag(args, '--json-v1');
}

function isJsonV1(args: string[]): boolean {
  return hasFlag(args, '--json-v1');
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

function stripFlags(args: string[], flagsWithValues: string[] = []): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (flagsWithValues.includes(arg)) {
      i++;
      continue;
    }
    if (arg.startsWith('--')) continue;
    result.push(arg);
  }
  return result;
}

function printOutput(args: string[], command: string, payload: unknown, renderHuman: () => void): number {
  if (hasJsonFlag(args)) {
    const out = isJsonV1(args) ? { schemaVersion: 1, command, data: payload } : payload;
    console.log(JSON.stringify(out, null, 2));
  } else {
    renderHuman();
  }
  return 0;
}

export function runTestValueCommand(args: string[], invokedAsSpearhead: boolean = false): number {
  const subcommands = new Set([
    'spearhead',
    'audit',
    'select',
    'evaluate',
    'diagnose',
    'cut-proof',
    'provenance',
    'rea-ledger',
    'help',
  ]);

  let subcommand = 'spearhead';
  let rest = args;

  if (!invokedAsSpearhead && args[0] && subcommands.has(args[0])) {
    subcommand = args[0];
    rest = args.slice(1);
  } else if (invokedAsSpearhead && args[0] && subcommands.has(args[0])) {
    subcommand = args[0];
    rest = args.slice(1);
  }

  switch (subcommand) {
    case 'provenance':
    case 'rea-ledger': {
      return printOutput(rest, 'test-value:provenance', TEST_VALUE_REA_EVIDENCE_LEDGER, () => {
        logHeader('REA Evidence Ledger — Fable Test-Value Spearhead Engine');
        console.log(`Source Repo:   ${TEST_VALUE_REA_EVIDENCE_LEDGER.sourceRepository}`);
        console.log(`Git Tree SHA:  ${TEST_VALUE_REA_EVIDENCE_LEDGER.treeSha}`);
        console.log(`Core Question: "${TEST_VALUE_REA_EVIDENCE_LEDGER.coreQuestion}"\n`);
        console.log('Verified Upstream Artifacts:');
        for (const [name, art] of Object.entries(TEST_VALUE_REA_EVIDENCE_LEDGER.artifacts)) {
          console.log(`  - ${name} (sha256:${art.sha256.slice(0, 16)}... | ${art.lines} lines): ${art.role}`);
        }
      });
    }

    case 'select': {
      const files = stripFlags(rest);
      const report = selectTestsByRisk(process.cwd(), files.length > 0 ? files : undefined);
      return printOutput(rest, 'test-value:select', report, () => {
        logHeader('Test-Value Risk-Proportional Selection');
        console.log(`Risk Tier:              ${colors.cyan}${report.riskTier}${colors.reset}`);
        console.log(`Requires Complete Run:  ${report.requiresCompleteSuite ? 'YES' : 'NO'}`);
        console.log(`Zero Selection Valid:   ${report.zeroSelectionJustified ? 'YES' : 'NO'}`);
        console.log(`Affected Test Files:    ${report.affectedTestFiles.length}`);
        for (const f of report.affectedTestFiles) {
          console.log(`  - ${f}`);
        }
        if (report.unmappedPaths.length > 0) {
          logWarn(`Unmapped Paths (${report.unmappedPaths.length}): ${report.unmappedPaths.join(', ')}`);
        }
        console.log(`\nRecommended Command:    ${colors.green}${report.recommendedCommand}${colors.reset}`);
      });
    }

    case 'audit': {
      const targets = stripFlags(rest);
      const summary = auditTestSuite(process.cwd(), targets.length > 0 ? targets : undefined);
      return printOutput(rest, 'test-value:audit', summary, () => {
        logHeader('Test-Value Suite Audit');
        console.log(`Audited Files:              ${summary.totalFiles}`);
        console.log(`Total Tests / Assertions:   ${summary.totalTests} / ${summary.totalAssertions}`);
        console.log(`Detected Brittle Traps:     ${summary.totalTraps}`);
        console.log(`Avg Protection Score:       ${summary.averageProtectionScore}/100`);
        console.log(`Avg Refactor Resilience:    ${summary.averageRefactorResilienceScore}/100`);
        console.log(`Avg Net Test-Value Score:   ${summary.averageNetValueScore}/100`);
        if (summary.highValueCandidates.length > 0) {
          console.log('\nHigh-Priority Optimization Candidates:');
          for (const c of summary.highValueCandidates.slice(0, 10)) {
            console.log(
              `  - ${c.filePath} [netValue=${c.netValueScore}, traps=${c.traps.length}, action=${c.recommendedAction}]`
            );
          }
        }
      });
    }

    case 'evaluate': {
      const mistake = getFlagValue(rest, '--mistake') || 'Unspecified regression boundary';
      const loss = getFlagValue(rest, '--loss') || 'User-visible behavioral regression';
      const boundary = (getFlagValue(rest, '--boundary') || 'core-contract') as ProtectedBoundaryCategory;
      const oracle = (getFlagValue(rest, '--oracle') || 'public-contract') as OracleSourceKind;
      const breaksRefactor = hasFlag(rest, '--breaks-refactor');
      const freezesSnapshot = hasFlag(rest, '--freezes-snapshot');
      const coverage = (getFlagValue(rest, '--coverage') || 'none') as 'none' | 'partial' | 'full-same-path';

      const assessment = evaluateThreeQuestions({
        concreteMistake: mistake,
        userOrMaintainerLoss: loss,
        protectedBoundary: boundary,
        oracleSource: oracle,
        breaksOnEquivalentRefactor: breaksRefactor,
        freezesNonContractualOutput: freezesSnapshot,
        existingCoverage: coverage,
      });

      return printOutput(rest, 'test-value:evaluate', assessment, () => {
        logHeader('Three-Question Test-Value Assessment');
        console.log(`Independent Correctness Basis: ${assessment.independentBasisVerified ? 'YES' : 'NO'}`);
        console.log(`Protection Score:              ${assessment.protectionScore}/100`);
        console.log(`Refactor Resilience Score:     ${assessment.refactorResilienceScore}/100`);
        console.log(`Maintenance Cost Score:        ${assessment.maintenanceCostScore}/100`);
        console.log(`Net Test-Value Score:          ${assessment.netValueScore}/100`);
        console.log(`Recommended Decision:          ${colors.cyan}${assessment.recommendedAction}${colors.reset}`);
        console.log(`Rationale:                     ${assessment.rationale}`);
      });
    }

    case 'diagnose': {
      const testName = getFlagValue(rest, '--test') || 'failing-test';
      const errorMessage = getFlagValue(rest, '--error') || 'Assertion failed';
      const outcome = getFlagValue(rest, '--outcome') || 'Core contract behavior';
      const contractChanged = hasFlag(rest, '--contract-changed');
      const envMissing = hasFlag(rest, '--env-missing');
      const flaky = hasFlag(rest, '--flaky');

      const result = diagnoseTestFailure({
        testName,
        errorMessage,
        protectedOutcome: outcome,
        contractChanged,
        environmentAvailable: !envMissing,
        intermittentOnRetry: flaky,
      });

      return printOutput(rest, 'test-value:diagnose', result, () => {
        logHeader(`Test Failure Diagnosis: ${result.testName}`);
        console.log(`Classification:        ${colors.yellow}${result.classification}${colors.reset}`);
        console.log(`Protected Outcome:     ${result.protectedOutcome}`);
        console.log(`Allow Retry as Pass:   ${result.allowRetryAsPass ? 'YES' : 'NO'}`);
        console.log(`Allow Mock Substitute: ${result.allowMockSubstitute ? 'YES' : 'NO'}`);
        console.log(`Remediation:           ${result.remediation}`);
      });
    }

    case 'cut-proof': {
      const target = stripFlags(rest)[0];
      if (!target) {
        logError('cut-proof requires a JSON file path or inline JSON string');
        return 1;
      }
      let parsed: Record<string, unknown>;
      try {
        const text = fs.existsSync(path.resolve(process.cwd(), target))
          ? fs.readFileSync(path.resolve(process.cwd(), target), 'utf-8')
          : target;
        parsed = JSON.parse(text);
      } catch (err) {
        logError(`Failed to parse cut-proof JSON: ${err instanceof Error ? err.message : String(err)}`);
        return 1;
      }
      const validation = validateCutBoundaryRecord(parsed as any);
      printOutput(rest, 'test-value:cut-proof', validation, () => {
        logHeader('Cut-Boundary Proof Validation');
        if (validation.valid) {
          logSuccess('Cut boundary proof is valid and preserves surviving protection.');
        } else {
          logError('Cut boundary proof failed validation:');
          for (const e of validation.errors) console.log(`  - ${e}`);
        }
      });
      return validation.valid ? 0 : 1;
    }

    case 'help': {
      console.log(`
${colors.bright}${colors.cyan}Fable Test-Value Spearhead Engine${colors.reset} (REA: tt-a1i/test-value)
Question: "${TEST_VALUE_REA_EVIDENCE_LEDGER.coreQuestion}"

Subcommands:
  spearhead [files...] [--execute] [--reuse] [--record-evidence] [--json-v1]
  select [files...] [--json-v1]
  audit [paths...] [--json-v1]
  evaluate --mistake "..." --loss "..." [--boundary ...] [--oracle ...] [--json-v1]
  diagnose --test "..." --error "..." [--flaky] [--env-missing] [--contract-changed] [--json-v1]
  cut-proof <json-path-or-inline> [--json-v1]
  provenance [--json-v1]
`);
      return 0;
    }

    case 'spearhead':
    default: {
      const execute = hasFlag(rest, '--execute');
      const reuseEvidence = hasFlag(rest, '--reuse');
      const recordFableEvidence = hasFlag(rest, '--record-evidence');
      const files = stripFlags(rest);

      const report = runSpearheadPipeline({
        projectDir: process.cwd(),
        changedFiles: files.length > 0 ? files : undefined,
        execute,
        reuseEvidence,
        recordFableEvidence,
      });

      const exitCode = report.execution && !report.execution.passed ? 1 : 0;
      printOutput(rest, 'test-value:spearhead', report, () => {
        logHeader('Fable Test-Value Spearhead Engine');
        logInfo(`Core Principle: "${report.reaProvenance.coreQuestion}"`);
        console.log(`Risk Tier:              ${colors.cyan}${report.selection.riskTier}${colors.reset}`);
        console.log(`Affected Test Files:    ${report.selection.affectedTestFiles.length}`);
        console.log(`Audited Net Value:      ${report.audit.averageNetValueScore}/100 (${report.audit.totalTraps} brittle traps)`);
        console.log(`Recommended Command:    ${colors.green}${report.selection.recommendedCommand}${colors.reset}`);
        if (report.reusedEvidence?.reusable) {
          logSuccess(`Reused Evidence: ${report.reusedEvidence.disclosedReuseSummary}`);
        }
        if (report.execution) {
          if (report.execution.passed) {
            logSuccess(`Execution Verdict: ${report.execution.verdict} — ${report.execution.reason}`);
          } else {
            logError(`Execution Verdict: ${report.execution.verdict} — ${report.execution.reason}`);
          }
        }
        if (report.evidenceRecorded) {
          logSuccess('Stamped fresh passing test evidence into .fable/state.json');
        }
      });
      return exitCode;
    }
  }
}
