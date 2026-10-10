/**
 * Fable Frontier Testing Engine — Evidence Bridge & Test-Value Integration
 *
 * Bridges tool run results to:
 * 1. Fable lifecycle Evidence Protocol (.fable/state.json evidence records)
 * 2. Test-Value Spearhead failure diagnosis & zero-selection guard
 */

import { createHash } from 'node:crypto';
import type { ToolRunResult, FrontierEvidenceSynthesis } from './types.js';

export function synthesizeFrontierEvidence(
  runResult: ToolRunResult,
  currentGeneration = 1
): FrontierEvidenceSynthesis {
  // Zero-selection guard: if 0 tests ran, fail closed
  if (runResult.totalTests === 0 && runResult.exitCode === 0) {
    return {
      toolId: runResult.toolId,
      kind: 'test',
      pass: false,
      summary: `Zero tests executed by ${runResult.toolId}. Fails closed under Test-Value Spearhead rules.`,
      evidenceRecord: {
        kind: 'test',
        source: `frontier-test:${runResult.toolId}`,
        result: 'fail',
        detail: `Zero tests executed (exitCode=0, totalTests=0, duration=${runResult.durationMs}ms). Command: ${runResult.command}`,
        timestamp: new Date().toISOString(),
        generation: currentGeneration
      }
    };
  }

  const pass = runResult.passed && runResult.failedTests === 0;
  const hashDigest = createHash('sha256')
    .update(runResult.stdout + runResult.stderr + runResult.command)
    .digest('hex')
    .slice(0, 16);

  const summary = pass
    ? `${runResult.toolId}: ${runResult.passedTests}/${runResult.totalTests} tests passed (${runResult.durationMs}ms)`
    : `${runResult.toolId}: ${runResult.failedTests}/${runResult.totalTests} tests failed (${runResult.durationMs}ms)`;

  const detail = `${summary}. Digest: sha256:${hashDigest}. Artifacts: [${runResult.artifactPaths.join(', ')}]. ${
    runResult.diagnosis ? `Diagnosis: ${runResult.diagnosis.kind} - ${runResult.diagnosis.explanation}` : ''
  }`;

  return {
    toolId: runResult.toolId,
    kind: 'test',
    pass,
    summary,
    evidenceRecord: {
      kind: 'test',
      source: `frontier-test:${runResult.toolId}`,
      result: pass ? 'pass' : 'fail',
      detail,
      timestamp: new Date().toISOString(),
      generation: currentGeneration
    }
  };
}
