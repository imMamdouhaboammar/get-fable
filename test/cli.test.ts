import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getPackageVersion, parsePort, runCli } from '../src/cli.ts';

const originalClaudeDir = process.env.CLAUDE_CONFIG_DIR;
const originalGeminiDir = process.env.FABLE_GEMINI_CONFIG_DIR;
const originalKernelDir = process.env.FABLE_AGENT_KERNEL_DIR;
const tempDirs: string[] = [];

function tempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-cli-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  if (originalClaudeDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = originalClaudeDir;

  if (originalGeminiDir === undefined) delete process.env.FABLE_GEMINI_CONFIG_DIR;
  else process.env.FABLE_GEMINI_CONFIG_DIR = originalGeminiDir;

  if (originalKernelDir === undefined) delete process.env.FABLE_AGENT_KERNEL_DIR;
  else process.env.FABLE_AGENT_KERNEL_DIR = originalKernelDir;

  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('CLI safety', () => {
  test('running without a command shows help instead of installing files', () => {
    const root = tempRoot();
    const claude = path.join(root, 'claude');
    const gemini = path.join(root, 'gemini');
    const kernel = path.join(root, 'kernel');
    process.env.CLAUDE_CONFIG_DIR = claude;
    process.env.FABLE_GEMINI_CONFIG_DIR = gemini;
    process.env.FABLE_AGENT_KERNEL_DIR = kernel;

    expect(runCli([])).toBe(0);
    expect(fs.existsSync(claude)).toBe(false);
    expect(fs.existsSync(gemini)).toBe(false);
    expect(fs.existsSync(kernel)).toBe(false);
  });

  test('validates serve ports strictly', () => {
    expect(parsePort(undefined)).toBe(8080);
    expect(parsePort('3000')).toBe(3000);
    expect(() => parsePort('0')).toThrow();
    expect(() => parsePort('65536')).toThrow();
    expect(() => parsePort('8080abc')).toThrow();
  });

  test('reads the version from package metadata', () => {
    expect(getPackageVersion()).toBe('1.2.0');
  });

  test('runs spark command in text and json mode', () => {
    expect(runCli(['spark'])).toBe(0);
    expect(runCli(['spark', '--json'])).toBe(0);
    expect(runCli(['spark', 'fix token refresh bug', '--json'])).toBe(0);
  });
});

