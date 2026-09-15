import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { JsonEnvelope } from './types.js';

export function findNativeBinary(repoRoot: string): string | null {
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
