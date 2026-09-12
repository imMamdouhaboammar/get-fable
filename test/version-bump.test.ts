import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, test } from 'bun:test';

const root = path.resolve(import.meta.dir, '..');
const fixtureRoots: string[] = [];

const VERSION_FIXTURE_FILES = [
  'scripts/bump-version.ts',
  'package.json',
  'skills.sh.json',
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.chatgpt-plugin/ai-plugin.json',
  '.gemini-plugin/plugin.json',
  '.cursor-plugin/plugin.json',
  '.opencode-plugin/plugin.json',
  '.deepseek-plugin/plugin.json',
  '.kimi-plugin/plugin.json',
  '.kiro-plugin/plugin.json',
  '.pi-plugin/plugin.json',
  '.grok-plugin/plugin.json',
  'assets/antigravity/plugin.json',
  '.claude-plugin/marketplace.json',
  '.chatgpt-plugin/marketplace.json',
  '.codex-plugin/marketplace.json',
  '.gemini-plugin/marketplace.json',
  '.cursor-plugin/marketplace.json',
  '.opencode-plugin/marketplace.json',
  '.deepseek-plugin/marketplace.json',
  '.kimi-plugin/marketplace.json',
  '.kiro-plugin/marketplace.json',
  '.pi-plugin/marketplace.json',
  '.grok-plugin/marketplace.json',
  'packs/core.json',
  'packs/intelligence.json',
  'packs/build.json',
  'packs/proof.json',
  'packs/delivery.json',
  'packs/evolution.json',
  'packs/system.json',
  'packs/creator.json',
  'tools/adapters/generic/index.json',
  'Formula/get-fable.rb',
  'test/cli.test.ts',
  'test/updater.test.ts',
  'docs/PLUGIN.md',
  'public/llms.txt',
] as const;

function copyFixture(): string {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-version-bump-'));
  fixtureRoots.push(fixtureRoot);

  for (const relativePath of VERSION_FIXTURE_FILES) {
    const source = path.join(root, relativePath);
    const destination = path.join(fixtureRoot, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }

  return fixtureRoot;
}

function runBump(fixtureRoot: string, newVersion: string, oldVersion: string) {
  const result = spawnSync(
    process.execPath,
    [path.join(fixtureRoot, 'scripts/bump-version.ts'), newVersion, oldVersion],
    { cwd: fixtureRoot, encoding: 'utf-8' }
  );

  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

function read(fixtureRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(fixtureRoot, relativePath), 'utf-8');
}

afterEach(() => {
  for (const fixtureRoot of fixtureRoots.splice(0)) {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

describe('version bump contract', () => {
  test('fails before writes when the expected old version does not match package metadata', () => {
    const fixtureRoot = copyFixture();
    const originalPackage = read(fixtureRoot, 'package.json');
    const originalFormula = read(fixtureRoot, 'Formula/get-fable.rb');

    const result = runBump(fixtureRoot, '9.9.9', '0.0.0');

    expect(result.status).not.toBe(0);
    expect(read(fixtureRoot, 'package.json')).toBe(originalPackage);
    expect(read(fixtureRoot, 'Formula/get-fable.rb')).toBe(originalFormula);
  });

  test('fails before writes when required version metadata is missing', () => {
    const fixtureRoot = copyFixture();
    const originalPackage = read(fixtureRoot, 'package.json');
    fs.rmSync(path.join(fixtureRoot, '.claude-plugin/plugin.json'));

    const result = runBump(fixtureRoot, '1.5.2', '1.5.1');

    expect(result.status).not.toBe(0);
    expect(read(fixtureRoot, 'package.json')).toBe(originalPackage);
  });

  test('updates the immutable Homebrew release path and version metadata together', () => {
    const fixtureRoot = copyFixture();
    const result = runBump(fixtureRoot, '1.5.2', '1.5.1');

    expect(result.status).toBe(0);
    expect(JSON.parse(read(fixtureRoot, 'package.json')).version).toBe('1.5.2');
    expect(JSON.parse(read(fixtureRoot, '.claude-plugin/plugin.json')).version).toBe('1.5.2');

    const formula = read(fixtureRoot, 'Formula/get-fable.rb');
    expect(formula).toContain('version "1.5.2"');
    expect(formula).toContain(
      'releases/download/v1.5.2/get-fable-v1.5.2.tar.gz'
    );
    expect(formula).not.toContain('releases/download/v1.5.1/get-fable-v1.5.2.tar.gz');
  });
});
