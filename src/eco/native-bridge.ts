import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { JsonEnvelope } from './types.js';
import type { ArchitectureEvaluationResult, RoutingDecision } from '../core/types.js';
import type { SparkResult } from '../core/spark.js';
import type { ToonValidationResult } from '../core/toon.js';
import { routeTask } from '../core/task-router.js';
import { evaluateArchitecture } from '../core/architecture-eval.js';
import { estimateTokens, encodeToon, validateToon } from '../core/toon.js';

export function findNativeBinary(repoRoot: string): string | null {
  if (process.env.FABLE_DISABLE_NATIVE === '1') {
    return null;
  }
  const candidates = [
    path.join(repoRoot, 'target', 'release', 'get-fable-native'),
    path.join(repoRoot, 'target', 'debug', 'get-fable-native'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

export function runNativeEco<T = any>(
  repoRoot: string,
  args: string[]
): JsonEnvelope<T> {
  const binary = findNativeBinary(repoRoot);
  if (!binary) {
    throw new Error(
      'Native get-fable binary not found. Build with `cargo build -p fable-cli`.'
    );
  }

  const finalArgs = ['eco', ...args];
  if (!finalArgs.includes('--json-v1')) {
    finalArgs.push('--json-v1');
  }

  const proc = spawnSync(binary, finalArgs, {
    cwd: process.cwd(),
    encoding: 'utf-8',
  });

  if (proc.error) {
    throw proc.error;
  }

  try {
    const parsed = JSON.parse(proc.stdout) as JsonEnvelope<T>;
    if (parsed.schema_version !== 1) {
      throw new Error(`Unsupported Eco JSON schema version: ${parsed.schema_version}`);
    }
    return parsed;
  } catch (err: any) {
    throw new Error(
      `Failed to parse native eco output: ${err?.message || err}. Stdout was:\n${proc.stdout}\nStderr was:\n${proc.stderr}`
    );
  }
}

export function runNativeRouter(
  repoRoot: string,
  task: string,
  cwd: string = process.cwd()
): RoutingDecision {
  const binary = findNativeBinary(repoRoot);
  if (binary) {
    const proc = spawnSync(binary, ['route', task, '--json'], {
      cwd,
      encoding: 'utf-8',
    });
    if (!proc.error && proc.status === 0 && proc.stdout.trim()) {
      try {
        return JSON.parse(proc.stdout) as RoutingDecision;
      } catch {
        // Fall through to TypeScript implementation
      }
    }
  }
  return routeTask(task);
}

export function runNativeArchEval(
  repoRoot: string,
  spec: string,
  cwd: string = process.cwd()
): ArchitectureEvaluationResult {
  const binary = findNativeBinary(repoRoot);
  if (binary) {
    const proc = spawnSync(binary, ['arch-eval', spec, '--json'], {
      cwd,
      encoding: 'utf-8',
    });
    if (!proc.error && proc.status === 0 && proc.stdout.trim()) {
      try {
        return JSON.parse(proc.stdout) as ArchitectureEvaluationResult;
      } catch {
        // Fall through to TypeScript implementation
      }
    }
  }
  return evaluateArchitecture(spec);
}

export function runNativeSpark(
  repoRoot: string,
  intent?: string,
  cwd: string = process.cwd()
): SparkResult | null {
  const binary = findNativeBinary(repoRoot);
  if (!binary) {
    return null;
  }
  const args = ['spark', '--json'];
  if (intent) {
    args.splice(1, 0, intent);
  }
  const proc = spawnSync(binary, args, {
    cwd,
    encoding: 'utf-8',
  });
  if (!proc.error && proc.status === 0 && proc.stdout.trim()) {
    try {
      return JSON.parse(proc.stdout) as SparkResult;
    } catch {
      return null;
    }
  }
  return null;
}

export function runNativeToonEstimate(repoRoot: string, input: string): number {
  const binary = findNativeBinary(repoRoot);
  if (binary) {
    const proc = spawnSync(binary, ['toon', 'estimate'], {
      input,
      encoding: 'utf-8',
    });
    if (!proc.error && proc.status === 0 && proc.stdout.trim()) {
      const parsed = Number.parseInt(proc.stdout.trim(), 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return estimateTokens(input);
}

export function runNativeToonEncode(repoRoot: string, data: unknown): string {
  const binary = findNativeBinary(repoRoot);
  if (binary) {
    const proc = spawnSync(binary, ['toon', 'encode'], {
      input: JSON.stringify(data),
      encoding: 'utf-8',
    });
    if (!proc.error && proc.status === 0 && proc.stdout.trim()) {
      return proc.stdout.trimEnd();
    }
  }
  return encodeToon(data);
}

export function runNativeToonValidate(repoRoot: string, toonPayload: string): ToonValidationResult {
  const binary = findNativeBinary(repoRoot);
  if (binary) {
    const proc = spawnSync(binary, ['toon', 'validate', '--json'], {
      input: toonPayload,
      encoding: 'utf-8',
    });
    if (!proc.error && proc.stdout.trim()) {
      try {
        return JSON.parse(proc.stdout) as ToonValidationResult;
      } catch {
        // Fall through to TypeScript implementation
      }
    }
  }
  return validateToon(toonPayload);
}

