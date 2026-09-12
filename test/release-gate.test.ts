import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, test } from 'bun:test';

const root = path.resolve(import.meta.dir, '..');
const fixtureRoots: string[] = [];

const RELEASE_FIXTURE_FILES = [
  'package.json',
  'skills.sh.json',
  'Formula/get-fable.rb',
  'src/dsh/api.ts',
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
] as const;

function copyFixture(): string {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-release-gate-'));
  fixtureRoots.push(fixtureRoot);

  for (const relativePath of RELEASE_FIXTURE_FILES) {
    const source = path.join(root, relativePath);
    const destination = path.join(fixtureRoot, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }

  return fixtureRoot;
}

function runGate(fixtureRoot: string, ...args: string[]) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'scripts/check-release-consistency.ts'), '--root', fixtureRoot, ...args],
    { cwd: root, encoding: 'utf-8' }
  );

  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

function replaceRequired(filePath: string, search: string, replacement: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  expect(content).toContain(search);
  fs.writeFileSync(filePath, content.replace(search, replacement), 'utf-8');
}

function sha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

afterEach(() => {
  for (const fixtureRoot of fixtureRoots.splice(0)) {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

describe('release consistency gate', () => {
  test('accepts version-consistent release metadata', () => {
    const fixtureRoot = copyFixture();
    const result = runGate(fixtureRoot, '--tag', 'v1.5.1');

    expect(result.status, result.output).toBe(0);
    expect(result.output).toContain('Release consistency: OK');
  });

  test('accepts an artifact whose bytes match the Formula sha256', () => {
    const fixtureRoot = copyFixture();
    const artifactPath = path.join(fixtureRoot, 'get-fable-v1.5.1.tar.gz');
    const artifactBytes = Buffer.from('fixture-release-artifact');
    fs.writeFileSync(artifactPath, artifactBytes);
    const formulaPath = path.join(fixtureRoot, 'Formula/get-fable.rb');
    const formula = fs.readFileSync(formulaPath, 'utf-8');
    const currentSha = formula.match(/^\s*sha256\s+"([a-f0-9]+)"/m)?.[1];
    expect(currentSha).toBeTruthy();
    fs.writeFileSync(formulaPath, formula.replace(currentSha!, sha256(artifactBytes)), 'utf-8');

    const result = runGate(fixtureRoot, '--tag', 'v1.5.1', '--artifact', artifactPath);

    expect(result.status, result.output).toBe(0);
    expect(result.output).toContain('Release consistency: OK');
  });

  test('rejects a Formula version that differs from package.json', () => {
    const fixtureRoot = copyFixture();
    replaceRequired(
      path.join(fixtureRoot, 'Formula/get-fable.rb'),
      'version "1.5.1"',
      'version "9.9.9"'
    );

    const result = runGate(fixtureRoot);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('Formula version 9.9.9 does not match package version 1.5.1');
  });

  test('rejects a Formula source that does not address the declared release', () => {
    const fixtureRoot = copyFixture();
    replaceRequired(
      path.join(fixtureRoot, 'Formula/get-fable.rb'),
      'releases/download/v1.5.1/get-fable-v1.5.1.tar.gz',
      'releases/download/v9.9.9/get-fable-v1.5.1.tar.gz'
    );

    const result = runGate(fixtureRoot);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('Formula URL does not match package version 1.5.1');
  });

  test('rejects plugin metadata that drifts from package.json', () => {
    const fixtureRoot = copyFixture();
    const pluginPath = path.join(fixtureRoot, '.claude-plugin/plugin.json');
    const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf-8')) as Record<string, unknown>;
    plugin.version = '9.9.9';
    fs.writeFileSync(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`, 'utf-8');

    const result = runGate(fixtureRoot);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('.claude-plugin/plugin.json#version');
    expect(result.output).toContain('expected 1.5.1, found 9.9.9');
  });

  test('rejects a DSH runtime version literal regression', () => {
    const fixtureRoot = copyFixture();
    replaceRequired(
      path.join(fixtureRoot, 'src/dsh/api.ts'),
      'version: getPackageVersion(),',
      "version: '9.9.9',"
    );

    const result = runGate(fixtureRoot);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('DSH runtime version must derive from canonical package metadata');
  });

  test('rejects a release tag that differs from package.json', () => {
    const fixtureRoot = copyFixture();
    const result = runGate(fixtureRoot, '--tag', 'v9.9.9');

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('Release tag v9.9.9 does not match package version v1.5.1');
  });

  test('rejects an artifact whose bytes do not match the Formula sha256', () => {
    const fixtureRoot = copyFixture();
    const artifactPath = path.join(fixtureRoot, 'get-fable-v1.5.1.tar.gz');
    fs.writeFileSync(artifactPath, 'not-the-published-release-artifact', 'utf-8');

    const result = runGate(fixtureRoot, '--artifact', artifactPath);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('Formula sha256 does not match release artifact sha256');
  });
});
