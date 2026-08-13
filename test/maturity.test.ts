import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initProjectFable } from '../src/installer.ts';
import { runCli } from '../src/cli.ts';

const tempDirs: string[] = [];

function makeTempDir(prefix = 'get-fable-maturity-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function captureConsole(run: () => number) {
  const lines: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args: unknown[]) => lines.push(args.map(String).join(' '));
  console.error = (...args: unknown[]) => lines.push(args.map(String).join(' '));
  try {
    return { code: run(), output: lines.join('\n') };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('frontier execution maturity contract', () => {
  test('project init creates versioned state and the canonical skill pack', () => {
    const target = makeTempDir();
    initProjectFable(target);

    const statePath = path.join(target, '.fable', 'state.json');
    expect(fs.existsSync(statePath)).toBe(true);
    if (!fs.existsSync(statePath)) return;

    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    expect(state.schemaVersion).toBe(1);
    expect(state.phase).toBe('idle');

    for (const skill of [
      'get-fable',
      'fable-discover',
      'fable-plan',
      'fable-execute',
      'fable-verify',
      'fable-recover',
    ]) {
      expect(fs.existsSync(path.join(target, '.agents', 'skills', skill, 'SKILL.md'))).toBe(true);
    }
  });

  test('route chooses recovery for repeated-failure language and explains the decision', () => {
    const result = captureConsole(() =>
      runCli(['route', 'The same tests failed twice after retrying the same fix', '--json'])
    );

    expect(result.code).toBe(0);
    const decision = JSON.parse(result.output);
    expect(decision.selectedSkill).toBe('fable-recover');
    expect(decision.confidence).toBeGreaterThan(0.5);
    expect(decision.reasons.length).toBeGreaterThan(0);
    expect(decision.nextSkills).toContain('fable-verify');
  });

  test('doctor exposes a machine-readable package and project report', () => {
    const target = makeTempDir();
    initProjectFable(target);

    const previousCwd = process.cwd();
    process.chdir(target);
    try {
      const result = captureConsole(() => runCli(['doctor', '--json']));
      expect(result.code).toBe(0);
      const report = JSON.parse(result.output);
      expect(report.ok).toBe(true);
      expect(report.schemaVersion).toBe(1);
      expect(Array.isArray(report.checks)).toBe(true);
      expect(report.checks.some((check: any) => check.id === 'skill-registry')).toBe(true);
      expect(report.checks.some((check: any) => check.id === 'project-state')).toBe(true);
    } finally {
      process.chdir(previousCwd);
    }
  });

  test('status json is parseable and reports an active initialized project', () => {
    const target = makeTempDir();
    initProjectFable(target);

    const previousCwd = process.cwd();
    process.chdir(target);
    try {
      const result = captureConsole(() => runCli(['status', '--json']));
      expect(result.code).toBe(0);
      const status = JSON.parse(result.output);
      expect(status.project.active).toBe(true);
      expect(status.project.stateSchemaVersion).toBe(1);
    } finally {
      process.chdir(previousCwd);
    }
  });
});
