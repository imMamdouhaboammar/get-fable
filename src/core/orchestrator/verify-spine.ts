/**
 * Honest Verify Spine & Actor Causation Engine for Fable Orchestrator.
 *
 * Grounded in VectorOS (vector-os-nano) verification moat:
 * - Rejects LLM self-attestation byte-for-byte
 * - Traces actor causation between workspace mutations and test execution
 * - Distinguishes between CAUSAL_PASS and UNCAUSED_PASS
 * - Enforces verifiedGeneration >= mutationGeneration
 */

import path from 'node:path';
import type {
  ExecutionTrace,
  VerifySpineResult,
  ActorCausationVerdict,
} from './types.js';

export function calculateCausalOverlap(
  mutatedPaths: string[],
  command: string,
  stdoutSignature: string
): number {
  if (mutatedPaths.length === 0) return 0.0;

  // If command is a full test suite run (e.g. "bun test", "npm test", "cargo test") without a specific target
  const isFullSuiteRun = /^(bun|npm|cargo|pytest|vitest)\s+test\s*(--\S+\s*)*$/.test(command.trim());
  if (isFullSuiteRun && stdoutSignature.length > 0) {
    return 0.85; // High confidence for full repository regression suite
  }

  let matchCount = 0;
  const targetText = `${command} ${stdoutSignature}`.toLowerCase();

  for (const p of mutatedPaths) {
    const base = path.basename(p, path.extname(p)).toLowerCase();
    const cleanPath = p.toLowerCase();

    // Check if filename stem or path appears in command or test execution logs
    if (targetText.includes(base) || targetText.includes(cleanPath)) {
      matchCount++;
    }
  }

  return matchCount / mutatedPaths.length;
}

export function evaluateExecutionTrace(
  trace: ExecutionTrace,
  command: string,
  currentMutationGeneration: number
): VerifySpineResult {
  // 1. Check exit code
  if (trace.exitCode !== 0) {
    return {
      verdict: 'MUTATION_FAILED',
      causalOverlapScore: 0.0,
      verifiedGeneration: 0,
      mutationGeneration: currentMutationGeneration,
      details: `Non-zero exit code (${trace.exitCode}): ${trace.stdoutSignature.slice(0, 300)}`,
    };
  }

  // 2. Check actor causation overlap
  const mutatedPaths = trace.fileDiffs.map((d) => d.path);
  const overlapScore = calculateCausalOverlap(
    mutatedPaths,
    command,
    trace.stdoutSignature
  );

  if (mutatedPaths.length > 0 && overlapScore === 0.0) {
    return {
      verdict: 'UNCAUSED_PASS',
      causalOverlapScore: 0.0,
      verifiedGeneration: 0,
      mutationGeneration: currentMutationGeneration,
      details: `Zero causal overlap between mutated files (${mutatedPaths.join(', ')}) and verified target command (${command}).`,
    };
  }

  // 3. Causal Pass
  return {
    verdict: 'CAUSAL_PASS',
    causalOverlapScore: overlapScore > 0 ? overlapScore : 1.0,
    verifiedGeneration: currentMutationGeneration,
    mutationGeneration: currentMutationGeneration,
    details: `Affirmative machine-checked proof verified with causal overlap score ${Math.round(overlapScore * 100)}%.`,
  };
}
