/**
 * Harness² Runner and CLI Adapter in get-fable.
 *
 * Connects get-fable to:
 * 1. The local python-backed `harness2` binary and virtualenv.
 * 2. Clean-room TypeScript recursion engine.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runTaskLevelRecursion, runHarnessingLevelRecursion } from './recursion.js';
import { getSurfaceSpec, readWorkspaceHarnessTree } from './tree.js';
import type {
  HarnessSubstrateKind,
  HarnessTree,
  RecursionMode,
  TaskLevelRecursionResult,
} from './types.js';

export interface HarnessRunnerOptions {
  workspaceDir?: string;
  substrate?: HarnessSubstrateKind;
  k?: number;
  mode?: RecursionMode;
  domain?: string;
  dryRun?: boolean;
}

export function findLocalHarness2Binary(): string | null {
  const candidates = [
    '/Users/mamdouhaboammar/.local/bin/harness2',
    '/Users/mamdouhaboammar/Documents/DDAAYY-dDEEVV/harness2/.venv/bin/harness2',
    path.join(process.env.HOME || '', '.local/bin/harness2'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        fs.accessSync(c, fs.constants.X_OK);
        return c;
      } catch {
        // Continue
      }
    }
  }

  try {
    const res = execSync('which harness2', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (res && fs.existsSync(res)) return res;
  } catch {
    // Continue
  }

  return null;
}

export function findLocalHarness2DemoBinary(): string | null {
  const candidates = [
    '/Users/mamdouhaboammar/.local/bin/harness2-demo',
    '/Users/mamdouhaboammar/Documents/DDAAYY-dDEEVV/harness2/.venv/bin/harness2-demo',
    path.join(process.env.HOME || '', '.local/bin/harness2-demo'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        fs.accessSync(c, fs.constants.X_OK);
        return c;
      } catch {
        // Continue
      }
    }
  }

  try {
    const res = execSync('which harness2-demo', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (res && fs.existsSync(res)) return res;
  } catch {
    // Continue
  }

  return null;
}

export function runNativeHarnessRefinement(
  taskDescription: string,
  options: HarnessRunnerOptions = {}
): TaskLevelRecursionResult {
  const workspaceDir = options.workspaceDir || process.cwd();
  const substrate = options.substrate || 'fable';
  const surface = getSurfaceSpec(substrate);

  const baseTree: HarnessTree = readWorkspaceHarnessTree(workspaceDir, surface);

  // Fallback defaults if workspace has no files yet
  if (Object.keys(baseTree).length === 0) {
    baseTree['AGENTS.md'] = '# Agent Constitution\nBaseline instructions.';
    baseTree['guardrails.md'] = '# Guardrails\n- Do not break existing contracts.';
  }

  const result = runTaskLevelRecursion(baseTree, taskDescription, {
    k: options.k ?? 1,
    mode: options.mode ?? 'parallel',
    substrate,
    dryRun: options.dryRun,
    domain: options.domain,
  });

  return result;
}

export function runHarnessDemoExternal(outputDir: string, k: number = 1): { ok: boolean; stdout: string; error?: string } {
  const demoBin = findLocalHarness2DemoBinary();
  if (!demoBin) {
    return {
      ok: false,
      stdout: '',
      error: 'harness2-demo binary not found on system PATH or venv',
    };
  }

  try {
    const out = execSync(`"${demoBin}" --output "${outputDir}" --k ${k}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, stdout: out };
  } catch (err: unknown) {
    return {
      ok: false,
      stdout: '',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
