import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';
import { runUpdateCli } from '../src/core/update/cli-command.ts';
import type { FetchLike } from '../src/core/update/types.ts';

const tempDirs: string[] = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function tempCachePath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-update-cli-'));
  tempDirs.push(dir);
  return path.join(dir, 'release.json');
}

function stableFetch(version = '1.5.1'): FetchLike {
  return async (input: string) => {
    if (input === 'https://registry.npmjs.org/get-fable') {
      return {
        ok: true,
        status: 200,
        async json() {
          return { 'dist-tags': { latest: version }, versions: {} };
        },
      };
    }
    return {
      ok: false,
      status: 404,
      async json() {
        return {};
      },
    };
  };
}

async function capture(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const out: string[] = [];
  const err: string[] = [];
  console.log = (...values: unknown[]) => out.push(values.map(String).join(' '));
  console.error = (...values: unknown[]) => err.push(values.map(String).join(' '));
  console.warn = (...values: unknown[]) => err.push(values.map(String).join(' '));
  try {
    const code = await runUpdateCli(args, {
      currentVersion: '1.5.1',
      repoRoot: path.resolve(new URL('..', import.meta.url).pathname),
      deps: {
        cachePath: tempCachePath(),
        fetch: stableFetch('1.5.1'),
      },
    });
    return { code, stdout: out.join('\n'), stderr: err.join('\n') };
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
}

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('update CLI compatibility and machine output', () => {
  test('update status --json emits one valid JSON document and no human prefix', async () => {
    const result = await capture(['status', '--json']);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    const payload = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(payload.currentVersion).toBe('1.5.1');
    expect(payload.latestVersion).toBe('1.5.1');
    expect(payload.updateAvailable).toBe(false);
    expect(result.stdout).not.toMatch(/Checking|INFO|SUCCESS|WARN/);
  });

  test('legacy update --check uses the same machine-safe status path', async () => {
    const result = await capture(['--check', '--json-v1']);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      schemaVersion: number;
      command: string;
      data: { currentVersion: string; latestVersion: string };
    };
    expect(payload.schemaVersion).toBe(1);
    expect(payload.command).toBe('update:status');
    expect(payload.data.currentVersion).toBe('1.5.1');
    expect(payload.data.latestVersion).toBe('1.5.1');
    expect(result.stdout).not.toMatch(/Checking|INFO|SUCCESS|WARN/);
  });

  test('update plan --json returns a structured detected-owner plan', async () => {
    const result = await capture(['plan', '--json']);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      currentVersion: string;
      targetVersion: string;
      strategy: string;
      installation: { method: string };
    };
    expect(payload.currentVersion).toBe('1.5.1');
    expect(payload.targetVersion).toBe('1.5.1');
    expect(payload.installation.method).toBe('git-checkout');
    expect(payload.strategy).toBe('git-checkout');
  });

  test('an explicit arbitrary Git target is notification-only and never applied', async () => {
    const planned = await capture(['plan', '--version', '1.4.0', '--json']);
    expect(planned.code).toBe(0);
    const plan = JSON.parse(planned.stdout) as { strategy: string; targetVersion: string };
    expect(plan.strategy).toBe('notify-only');
    expect(plan.targetVersion).toBe('1.4.0');

    const applied = await capture(['apply', '--version', '1.4.0', '--json']);
    expect(applied.code).toBe(1);
    const receipt = JSON.parse(applied.stdout) as { success: boolean; outcome: string };
    expect(receipt.success).toBe(false);
    expect(receipt.outcome).toBe('notify-only');
  });

  test('update doctor --json reports installation ownership without mutation', async () => {
    const result = await capture(['doctor', '--json']);

    expect(result.code).toBe(0);
    const payload = JSON.parse(result.stdout) as { method: string; evidence: string[] };
    expect(payload.method).toBe('git-checkout');
    expect(payload.evidence.length).toBeGreaterThan(0);
  });

  test('public bin routes update before the legacy CLI dispatcher', () => {
    const source = fs.readFileSync(new URL('../bin/get-fable.js', import.meta.url), 'utf-8');
    expect(source).toMatch(/runUpdateCli/);
    expect(source).toMatch(/process\.argv\[2\].*update|command.*update/);
  });

  test('legacy wrapper no longer owns direct Git or package-manager mutation', () => {
    const source = fs.readFileSync(new URL('../src/core/updater.ts', import.meta.url), 'utf-8');

    expect(source).not.toContain("['pull', '--ff-only']");
    expect(source).not.toContain("['install', '-g', 'get-fable@latest']");
    expect(source).toMatch(/planUpdate|createUpdatePlan/);
    expect(source).toMatch(/executeUpdate|applyUpdatePlan/);
  });
});
