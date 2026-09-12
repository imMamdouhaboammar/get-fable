import fs from 'node:fs';
import { describe, expect, test } from 'bun:test';
import { planUpdate } from '../src/core/update/planner.ts';
import type { InstallationInfo } from '../src/core/update/types.ts';

function installation(method: InstallationInfo['method']): InstallationInfo {
  return {
    method,
    executablePath: '/usr/local/bin/get-fable',
    ...(method === 'git-checkout' ? { repoRoot: '/workspace/get-fable' } : {}),
    evidence: [`fixture:${method}`],
  };
}

describe('pure update planner', () => {
  test('plans an exact Bun global target without using the latest alias', () => {
    const plan = planUpdate({
      currentVersion: '1.5.1',
      targetVersion: '1.6.0',
      installation: installation('bun-global'),
      targetKind: 'explicit-version',
    });

    expect(plan.strategy).toBe('bun-global');
    expect(plan.executable).toBe('bun');
    expect(plan.argv).toEqual(['add', '-g', 'get-fable@1.6.0']);
    expect(plan.argv?.join(' ')).not.toContain('@latest');
    expect(plan.requiresConfirmation).toBe(true);
  });

  test('plans an exact npm global target without using the latest alias', () => {
    const plan = planUpdate({
      currentVersion: '1.5.1',
      targetVersion: '1.6.0',
      installation: installation('npm-global'),
      targetKind: 'explicit-version',
    });

    expect(plan.strategy).toBe('npm-global');
    expect(plan.executable).toBe('npm');
    expect(plan.argv).toEqual(['install', '-g', 'get-fable@1.6.0']);
    expect(plan.argv?.join(' ')).not.toContain('@latest');
    expect(plan.requiresConfirmation).toBe(true);
  });

  test('plans Homebrew only for latest stable updates', () => {
    const latest = planUpdate({
      currentVersion: '1.5.1',
      targetVersion: '1.6.0',
      installation: installation('homebrew'),
      targetKind: 'latest-stable',
    });
    expect(latest.strategy).toBe('homebrew');
    expect(latest.executable).toBe('brew');
    expect(latest.argv).toEqual(['upgrade', 'get-fable']);
    expect(latest.requiresConfirmation).toBe(true);

    const explicit = planUpdate({
      currentVersion: '1.5.1',
      targetVersion: '1.5.0',
      installation: installation('homebrew'),
      targetKind: 'explicit-version',
    });
    expect(explicit.strategy).toBe('notify-only');
    expect(explicit.executable).toBeUndefined();
    expect(explicit.argv).toBeUndefined();
  });

  test('routes a normal Git checkout update to the guarded Git strategy', () => {
    const latest = planUpdate({
      currentVersion: '1.5.1',
      targetVersion: '1.6.0',
      installation: installation('git-checkout'),
      targetKind: 'latest-stable',
    });

    expect(latest.strategy).toBe('git-checkout');
    expect(latest.executable).toBeUndefined();
    expect(latest.argv).toBeUndefined();
    expect(latest.requiresConfirmation).toBe(true);
  });

  test('fails closed for arbitrary Git checkout targets', () => {
    const plan = planUpdate({
      currentVersion: '1.5.1',
      targetVersion: '1.4.0',
      installation: installation('git-checkout'),
      targetKind: 'explicit-version',
    });

    expect(plan.strategy).toBe('notify-only');
    expect(plan.executable).toBeUndefined();
    expect(plan.argv).toBeUndefined();
  });

  test('never returns a mutation plan for unknown installation ownership', () => {
    const plan = planUpdate({
      currentVersion: '1.5.1',
      targetVersion: '1.6.0',
      installation: installation('unknown'),
      targetKind: 'latest-stable',
    });

    expect(plan.strategy).toBe('notify-only');
    expect(plan.executable).toBeUndefined();
    expect(plan.argv).toBeUndefined();
    expect(plan.requiresConfirmation).toBe(false);
    expect(plan.reason.length).toBeGreaterThan(0);
  });

  test('planner source remains pure and cannot execute or mutate', () => {
    const source = fs.readFileSync(new URL('../src/core/update/planner.ts', import.meta.url), 'utf-8');

    expect(source).not.toMatch(/node:child_process|spawnSync|execSync|execFileSync|Bun\.spawn/);
    expect(source).not.toMatch(/writeFile|rename|unlink|rmSync|mkdirSync/);
  });
});
