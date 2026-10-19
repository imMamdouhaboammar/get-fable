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

export function findAntiSlopBinary(repoRoot: string): string | null {
  if (process.env.FABLE_DISABLE_NATIVE === '1') {
    return null;
  }
  if (process.env.FABLE_ANTI_SLOP_BIN && fs.existsSync(process.env.FABLE_ANTI_SLOP_BIN)) {
    return process.env.FABLE_ANTI_SLOP_BIN;
  }
  const candidates = [
    path.join(repoRoot, 'target', 'release', 'fable-anti-slop'),
    path.join(repoRoot, 'target', 'debug', 'fable-anti-slop'),
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

export interface AntiSlopScanOptions {
  repo?: string;
  base?: string;
  maxLines?: number;
  failOnBlocker?: boolean;
  json?: boolean;
  jsonV1?: boolean;
  sarif?: boolean;
  noColor?: boolean;
}

export function runNativeAntiSlop(
  repoRoot: string,
  options: AntiSlopScanOptions = {},
  cwd: string = process.cwd()
): { status: number; stdout: string; stderr: string; data?: unknown } {
  const binary = findAntiSlopBinary(repoRoot);
  if (!binary) {
    return {
      status: 1,
      stdout: '',
      stderr: 'fable-anti-slop native engine binary not found. Build with cargo build -p fable-anti-slop',
    };
  }

  const isGetFableNative = path.basename(binary).startsWith('get-fable-native');
  const args = isGetFableNative ? ['anti-slop', 'scan'] : ['scan'];

  if (options.repo) args.push('--repo', options.repo);
  if (options.base) args.push('--base', options.base);
  if (options.maxLines) args.push('--max-lines', options.maxLines.toString());
  if (options.failOnBlocker) args.push('--fail-on-blocker');
  if (options.json) args.push('--json');
  if (options.jsonV1) args.push('--json-v1');
  if (options.sarif) args.push('--sarif');
  if (options.noColor) args.push('--no-color');

  const proc = spawnSync(binary, args, { cwd, encoding: 'utf-8' });
  let data: unknown;
  if (options.json || options.jsonV1 || options.sarif) {
    try {
      data = JSON.parse(proc.stdout);
    } catch {
      // ignore
    }
  }

  return {
    status: proc.status ?? 1,
    stdout: proc.stdout,
    stderr: proc.stderr,
    data,
  };
}

export function findAntiChurnBinary(repoRoot: string): string | null {
  if (process.env.FABLE_DISABLE_NATIVE === '1') {
    return null;
  }
  if (process.env.FABLE_ANTI_CHURN_BIN && fs.existsSync(process.env.FABLE_ANTI_CHURN_BIN)) {
    return process.env.FABLE_ANTI_CHURN_BIN;
  }
  const candidates = [
    path.join(repoRoot, 'target', 'release', 'fable-anti-churn'),
    path.join(repoRoot, 'target', 'debug', 'fable-anti-churn'),
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

export function runNativeAntiChurn(
  repoRoot: string,
  subCommand: string,
  extraArgs: string[] = [],
  cwd: string = process.cwd()
): { status: number; stdout: string; stderr: string; data?: unknown } {
  const binary = findAntiChurnBinary(repoRoot);
  if (!binary) {
    return {
      status: 1,
      stdout: '',
      stderr: 'fable-anti-churn native engine binary not found. Build with cargo build -p fable-anti-churn',
    };
  }

  const isGetFableNative = path.basename(binary).startsWith('get-fable-native');
  const args = isGetFableNative ? ['anti-churn', subCommand, ...extraArgs] : [subCommand, ...extraArgs];

  const proc = spawnSync(binary, args, { cwd, encoding: 'utf-8' });
  let data: unknown;
  try {
    data = JSON.parse(proc.stdout);
  } catch {
    // ignore
  }

  return {
    status: proc.status ?? 1,
    stdout: proc.stdout,
    stderr: proc.stderr,
    data,
  };
}

export function findNeuralTestBinary(repoRoot: string): string | null {
  if (process.env.FABLE_DISABLE_NATIVE === '1') {
    return null;
  }
  if (process.env.FABLE_NEURAL_TEST_BIN && fs.existsSync(process.env.FABLE_NEURAL_TEST_BIN)) {
    return process.env.FABLE_NEURAL_TEST_BIN;
  }
  const candidates = [
    path.join(repoRoot, 'target', 'release', 'fable-neural-test'),
    path.join(repoRoot, 'target', 'debug', 'fable-neural-test'),
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

export function runNativeNeuralTest(
  repoRoot: string,
  subCommand: string = 'doctor',
  extraArgs: string[] = [],
  cwd: string = process.cwd()
): { status: number; stdout: string; stderr: string; data?: unknown } {
  const binary = findNeuralTestBinary(repoRoot);
  if (!binary) {
    return {
      status: 1,
      stdout: '',
      stderr: 'fable-neural-test native engine binary not found. Build with cargo build -p fable-neural-test',
    };
  }

  const isGetFableNative = path.basename(binary).startsWith('get-fable-native');
  const args = isGetFableNative ? ['neural-test', subCommand, ...extraArgs] : [subCommand, ...extraArgs];

  const proc = spawnSync(binary, args, { cwd, encoding: 'utf-8' });
  let data: unknown;
  try {
    data = JSON.parse(proc.stdout);
  } catch {
    // ignore
  }

  return {
    status: proc.status ?? 1,
    stdout: proc.stdout,
    stderr: proc.stderr,
    data,
  };
}



