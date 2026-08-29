import { describe, expect, test } from 'bun:test';
import { detectInstallation } from '../src/core/update/install-method.ts';

type DetectionContext = Parameters<typeof detectInstallation>[0];

function context(overrides: Partial<DetectionContext> = {}): DetectionContext {
  return {
    executablePath: '/workspace/bin/get-fable',
    repoRoot: '/workspace',
    fileExists: () => false,
    ...overrides,
  };
}

describe('installation ownership detection', () => {
  test('classifies an explicit repository checkout before package-manager ownership', () => {
    const result = detectInstallation(
      context({
        executablePath: '/workspace/bin/get-fable',
        repoRoot: '/workspace',
        bunGlobalDir: '/workspace',
        npmGlobalDir: '/workspace',
        fileExists: (candidate) => candidate === '/workspace/.git',
      })
    );

    expect(result.method).toBe('git-checkout');
    expect(result.repoRoot).toBe('/workspace');
    expect(result.executablePath).toBe('/workspace/bin/get-fable');
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence.join(' ')).toMatch(/\.git/i);
  });

  test('classifies an executable owned only by the Bun global prefix', () => {
    const result = detectInstallation(
      context({
        executablePath: '/home/test/.bun/bin/get-fable',
        bunGlobalDir: '/home/test/.bun',
        npmGlobalDir: '/usr/local',
      })
    );

    expect(result.method).toBe('bun-global');
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence.join(' ')).toMatch(/bun/i);
  });

  test('classifies an executable owned only by the npm global prefix', () => {
    const result = detectInstallation(
      context({
        executablePath: '/usr/local/bin/get-fable',
        bunGlobalDir: '/home/test/.bun',
        npmGlobalDir: '/usr/local',
      })
    );

    expect(result.method).toBe('npm-global');
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence.join(' ')).toMatch(/npm/i);
  });

  test('classifies Homebrew ownership from the configured prefix and Cellar evidence', () => {
    const result = detectInstallation(
      context({
        executablePath: '/opt/homebrew/bin/get-fable',
        homebrewPrefix: '/opt/homebrew',
        fileExists: (candidate) => candidate === '/opt/homebrew/Cellar/get-fable',
      })
    );

    expect(result.method).toBe('homebrew');
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence.join(' ')).toMatch(/homebrew|cellar/i);
  });

  test('returns unknown when Bun and npm ownership evidence conflicts', () => {
    const result = detectInstallation(
      context({
        executablePath: '/shared/bin/get-fable',
        bunGlobalDir: '/shared',
        npmGlobalDir: '/shared',
      })
    );

    expect(result.method).toBe('unknown');
    expect(result.evidence.join(' ')).toMatch(/bun/i);
    expect(result.evidence.join(' ')).toMatch(/npm/i);
  });

  test('returns unknown when there is no ownership evidence', () => {
    const result = detectInstallation(context());

    expect(result.method).toBe('unknown');
    expect(result.executablePath).toBe('/workspace/bin/get-fable');
  });
});
