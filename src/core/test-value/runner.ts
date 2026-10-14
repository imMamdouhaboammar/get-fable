/**
 * Feature Reconstruction: Execution Guard, Zero-Selection Detector, Timing Attribution & Spearhead Pipeline
 * Reverse-Engineered from: https://github.com/tt-a1i/test-value
 * Evidence Digest:
 *   - SKILL.md: sha256:a68cfc741104a6abb23d8b04354885c0c7360a7a3e65a09b194b7e121b2cc51e (Lines 47, 60-69)
 *   - references/audit.md: sha256:982e568099c21e51d6f76ae8c2185acacac36f5bede87f05302249314b387757 (Lines 46-52)
 */

import { spawnSync } from 'node:child_process';
import { addEvidence, getRepositoryRevision, readFableState, withFableStateTransaction } from '../state.js';
import type { EvidenceRecord } from '../types.js';
import { auditTestSuite } from './auditor.js';
import { selectTestsByRisk } from './selector.js';
import {
  TEST_VALUE_REA_EVIDENCE_LEDGER,
  type EvidenceReuseCheck,
  type ParsedTestExecutionResult,
  type SpearheadPipelineOptions,
  type SpearheadExecutionReport,
} from './types.js';

/**
 * Reconstructed from SKILL.md:63-69 ("Confirm that the intended tests actually executed, including
 * filters, collection and skips. A successful command with no relevant tests is not evidence that
 * the behavior passed... Attribute nested log timings correctly.")
 */
export function parseTestRunnerOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  wallClockMs: number,
  options: { zeroSelectionJustified?: boolean; zeroSelectionReason?: string | null } = {}
): ParsedTestExecutionResult {
  const combined = `${stdout}\n${stderr}`;

  const passMatch = combined.match(/\b(\d+)\s+pass(?:ed)?\b/i);
  const failMatch = combined.match(/\b(\d+)\s+fail(?:ed)?\b/i);
  const skipMatch = combined.match(/\b(\d+)\s+(?:skip(?:ped)?|todo)\b/i);
  const filesMatch = combined.match(/across\s+(\d+)\s+files?/i);

  const passedCount = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failedCount = failMatch ? parseInt(failMatch[1], 10) : 0;
  const skippedCount = skipMatch ? parseInt(skipMatch[1], 10) : 0;
  const filesExecuted = filesMatch ? parseInt(filesMatch[1], 10) : passedCount + failedCount > 0 ? 1 : 0;
  const totalExecuted = passedCount + failedCount;

  // Attribute individual case timings vs wall-clock critical path (SKILL.md:68)
  const caseDurations: number[] = [];
  const lineRegex = /\[(\d+(?:\.\d+)?)ms\]/g;
  const lines = combined.split(/\r?\n/);
  for (const line of lines) {
    if (/Ran\s+\d+\s+tests/i.test(line)) continue;
    const m = lineRegex.exec(line);
    if (m) {
      caseDurations.push(parseFloat(m[1]));
    }
    lineRegex.lastIndex = 0;
  }

  const caseTimeMs = Number(caseDurations.reduce((a, b) => a + b, 0).toFixed(2));
  const wallClockCriticalPathMs = Math.max(1, Math.round(wallClockMs));
  const fileTimeMs = Math.max(caseTimeMs, wallClockCriticalPathMs);
  const totalComputeMs = Math.max(caseTimeMs, wallClockCriticalPathMs);

  const timing = {
    caseTimeMs,
    fileTimeMs,
    wallClockCriticalPathMs,
    totalComputeMs,
  };

  // Bulk-skip guard (SKILL.md:47)
  if (skippedCount > 0 && passedCount === 0 && failedCount === 0) {
    return {
      passed: false,
      verdict: 'BULK_SKIP_REJECTED',
      exitCode,
      passedCount,
      failedCount,
      skippedCount,
      totalExecuted,
      filesExecuted,
      timing,
      reason: `Bulk skip rejected (SKILL.md:47): ${skippedCount} test(s) skipped with 0 passing assertions.`,
    };
  }

  // Zero-selection guard (SKILL.md:64)
  if (totalExecuted === 0) {
    if (options.zeroSelectionJustified) {
      return {
        passed: exitCode === 0,
        verdict: 'ZERO_SELECTION_JUSTIFIED',
        exitCode,
        passedCount: 0,
        failedCount: 0,
        skippedCount,
        totalExecuted: 0,
        filesExecuted: 0,
        timing,
        reason:
          options.zeroSelectionReason ||
          'Zero test selection explicitly justified by non-behavioral scope.',
      };
    }
    return {
      passed: false,
      verdict: 'INVALID_ZERO_SELECTION',
      exitCode,
      passedCount: 0,
      failedCount: 0,
      skippedCount,
      totalExecuted: 0,
      filesExecuted: 0,
      timing,
      reason:
        'Accidental zero test selection (SKILL.md:64): command exited 0 but executed 0 tests without a justified non-behavioral reason.',
    };
  }

  if (exitCode !== 0 || failedCount > 0) {
    return {
      passed: false,
      verdict: 'FAIL',
      exitCode: exitCode !== 0 ? exitCode : 1,
      passedCount,
      failedCount,
      skippedCount,
      totalExecuted,
      filesExecuted,
      timing,
      reason: `Test execution failed: ${failedCount} failed, ${passedCount} passed across ${filesExecuted} file(s).`,
    };
  }

  return {
    passed: true,
    verdict: 'PASS',
    exitCode: 0,
    passedCount,
    failedCount: 0,
    skippedCount,
    totalExecuted,
    filesExecuted,
    timing,
    reason: `Verified ${passedCount} passing test(s) across ${filesExecuted} file(s) in ${wallClockCriticalPathMs}ms.`,
  };
}

/**
 * Reconstructed from SKILL.md:66 ("Reuse results whose revision identity, inputs, environment
 * and coverage remain applicable, and disclose what was reused.")
 */
export function canReuseVerificationEvidence(
  record: EvidenceRecord,
  context: {
    mutationGeneration: number;
    workspaceId: string;
    repositoryRevision?: string | null;
    requiredScope: string;
  }
): EvidenceReuseCheck {
  if (record.kind !== 'test' || record.result !== 'pass') {
    return {
      reusable: false,
      reason: 'Prior evidence is not a passing test record.',
      disclosedReuseSummary: null,
    };
  }
  if (record.generation < context.mutationGeneration) {
    return {
      reusable: false,
      reason: `Evidence generation (${record.generation}) is older than current mutationGeneration (${context.mutationGeneration}).`,
      disclosedReuseSummary: null,
    };
  }
  if (record.workspaceId && record.workspaceId !== context.workspaceId) {
    return {
      reusable: false,
      reason: 'Evidence workspaceId does not match active workspace.',
      disclosedReuseSummary: null,
    };
  }
  if (
    context.repositoryRevision &&
    record.repositoryRevision &&
    record.repositoryRevision !== context.repositoryRevision
  ) {
    return {
      reusable: false,
      reason: `Evidence repositoryRevision (${record.repositoryRevision}) differs from current revision (${context.repositoryRevision}).`,
      disclosedReuseSummary: null,
    };
  }
  if (
    context.requiredScope &&
    record.scope &&
    record.scope !== context.requiredScope &&
    record.scope !== 'complete-suite'
  ) {
    return {
      reusable: false,
      reason: `Evidence scope (${record.scope}) does not cover required scope (${context.requiredScope}).`,
      disclosedReuseSummary: null,
    };
  }

  return {
    reusable: true,
    reason: 'Existing test evidence matches current mutationGeneration, workspaceId, revision, and scope.',
    disclosedReuseSummary: `Reused passing test evidence from ${record.source} (gen=${record.generation}, ts=${record.timestamp}): ${record.detail}`,
  };
}

/**
 * Master Spearhead Pipeline:
 * 1. Blast-radius risk selection (`selectTestsByRisk`)
 * 2. Test-Value static audit on selected tests (`auditTestSuite`)
 * 3. Optional evidence reuse check (`canReuseVerificationEvidence`)
 * 4. Optional live execution with Zero-Selection Guard (`parseTestRunnerOutput`)
 * 5. Optional Fable state evidence stamping (`addEvidence`)
 */
export function runSpearheadPipeline(options: SpearheadPipelineOptions = {}): SpearheadExecutionReport {
  const projectDir = options.projectDir || process.cwd();
  const selection = selectTestsByRisk(projectDir, options.changedFiles);
  const auditTargets =
    selection.affectedTestFiles.length > 0 ? selection.affectedTestFiles : undefined;
  const audit = auditTestSuite(projectDir, auditTargets);

  let reusedEvidence: EvidenceReuseCheck | null = null;
  const state = readFableState(projectDir);
  const currentRevision = getRepositoryRevision(projectDir);
  const scopeKey = selection.requiresCompleteSuite
    ? 'complete-suite'
    : selection.affectedTestFiles.join(',');

  if (options.reuseEvidence && state && state.evidence.length > 0) {
    const latestTest = [...state.evidence].reverse().find((e) => e.kind === 'test');
    if (latestTest) {
      reusedEvidence = canReuseVerificationEvidence(latestTest, {
        mutationGeneration: state.mutationGeneration,
        workspaceId: state.workspaceId,
        repositoryRevision: currentRevision,
        requiredScope: scopeKey,
      });
    }
  }

  let execution: ParsedTestExecutionResult | null = null;
  let evidenceRecorded = false;

  if (options.execute && !(reusedEvidence && reusedEvidence.reusable)) {
    if (selection.zeroSelectionJustified && selection.affectedTestFiles.length === 0) {
      execution = parseTestRunnerOutput('', '', 0, 1, {
        zeroSelectionJustified: true,
        zeroSelectionReason: selection.zeroSelectionReason,
      });
    } else {
      const testArgs = selection.requiresCompleteSuite
        ? ['test']
        : ['test', ...selection.affectedTestFiles];
      const start = Date.now();
      const proc = spawnSync(process.execPath, testArgs, {
        cwd: projectDir,
        encoding: 'utf-8',
      });
      const wallMs = Date.now() - start;
      execution = parseTestRunnerOutput(
        proc.stdout || '',
        proc.stderr || '',
        proc.status ?? 1,
        wallMs,
        {
          zeroSelectionJustified: selection.zeroSelectionJustified,
          zeroSelectionReason: selection.zeroSelectionReason,
        }
      );
    }

    if (options.recordFableEvidence && execution && state) {
      try {
        withFableStateTransaction(projectDir, (txState) =>
          addEvidence(txState, {
            kind: 'test',
            source: selection.recommendedCommand,
            result: execution!.passed ? 'pass' : 'fail',
            detail: `${execution!.reason} [tier=${selection.riskTier}, netValue=${audit.averageNetValueScore}]`,
            scope: scopeKey || 'spearhead',
            repositoryRevision: currentRevision || undefined,
          })
        );
        evidenceRecorded = true;
      } catch {
        evidenceRecorded = false;
      }
    }
  }

  return {
    reaProvenance: {
      featureName: TEST_VALUE_REA_EVIDENCE_LEDGER.featureName,
      sourceRepository: TEST_VALUE_REA_EVIDENCE_LEDGER.sourceRepository,
      treeSha: TEST_VALUE_REA_EVIDENCE_LEDGER.treeSha,
      coreQuestion: TEST_VALUE_REA_EVIDENCE_LEDGER.coreQuestion,
    },
    selection,
    audit,
    reusedEvidence,
    execution,
    evidenceRecorded,
  };
}
