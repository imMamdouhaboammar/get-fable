import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initProjectFable } from '../src/installer.ts';
import { runCli } from '../src/cli.ts';

const tempDirs: string[] = [];
const canonicalSkills = [
  'get-fable',
  'fable-discover',
  'fable-research',
  'fable-plan',
  'fable-tdd',
  'fable-delegate',
  'fable-execute',
  'fable-verify',
  'fable-review',
  'fable-security',
  'fable-release',
  'fable-handoff',
  'fable-eval',
  'fable-recover',
];

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

describe('coding lifecycle maturity contract', () => {
  test('project init creates mutation-aware state and the complete canonical skill pack', () => {
    const target = makeTempDir();
    initProjectFable(target);

    const statePath = path.join(target, '.fable', 'state.json');
    expect(fs.existsSync(statePath)).toBe(true);
    if (!fs.existsSync(statePath)) return;

    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    expect(state.schemaVersion).toBe(2);
    expect(state.phase).toBe('idle');
    expect(state.mutationGeneration).toBe(0);
    expect(state.verifiedGeneration).toBe(-1);
    expect(typeof state.workspaceId).toBe('string');
    expect(state.workspaceId.length).toBeGreaterThan(0);

    for (const skill of canonicalSkills) {
      expect(fs.existsSync(path.join(target, '.agents', 'skills', skill, 'SKILL.md'))).toBe(true);
    }
    expect(fs.existsSync(path.join(target, '.agents', 'skills', 'get-fable', 'registry.json'))).toBe(true);
  });

  test('route chooses recovery for repeated-failure language and explains the decision', () => {
    const result = captureConsole(() =>
      runCli(['route', 'The same tests failed twice after retrying the same fix', '--json'])
    );

    expect(result.code).toBe(0);
    const decision = JSON.parse(result.output);
    expect(decision.selectedSkill).toBe('fable-recover');
    expect(decision.selectedPack).toBe('core');
    expect(decision.confidence).toBeGreaterThan(0.5);
    expect(decision.reasons.length).toBeGreaterThan(0);
    expect(decision.nextSkills).toContain('fable-verify');
  });

  test('applied routing, mutation, verification, and completion form one durable lifecycle', () => {
    const target = makeTempDir();
    initProjectFable(target);
    const previousCwd = process.cwd();
    process.chdir(target);

    try {
      const routed = captureConsole(() =>
        runCli(['route', 'Design a modular migration across several files', '--apply', '--json'])
      );
      expect(routed.code).toBe(0);

      let state = JSON.parse(fs.readFileSync(path.join(target, '.fable', 'state.json'), 'utf-8'));
      expect(state.phase).toBe('planned');
      expect(state.currentSkill).toBe('fable-plan');
      expect(state.substantial).toBe(true);
      expect(state.lastDecision.selectedSkill).toBe('fable-plan');

      expect(captureConsole(() => runCli(['state', 'executing', '--json'])).code).toBe(0);
      expect(captureConsole(() => runCli(['card', 'Implement the bounded migration card', '--json'])).code).toBe(0);
      expect(captureConsole(() => runCli(['mutation', 'workspace edit', '--json'])).code).toBe(0);
      expect(captureConsole(() => runCli(['state', 'verifying', '--json'])).code).toBe(0);
      expect(
        captureConsole(() =>
          runCli(['evidence', 'pass', 'test', 'bun test', 'all affected tests passed', '--json'])
        ).code
      ).toBe(0);
      expect(captureConsole(() => runCli(['state', 'complete', '--json'])).code).toBe(0);

      state = JSON.parse(fs.readFileSync(path.join(target, '.fable', 'state.json'), 'utf-8'));
      expect(state.phase).toBe('complete');
      expect(state.mutationGeneration).toBe(1);
      expect(state.verifiedGeneration).toBe(1);
      expect(state.activeCard).toBe('Implement the bounded migration card');
      expect(state.evidence).toHaveLength(1);
      expect(state.evidence[0].generation).toBe(1);
      expect(state.evidence[0].result).toBe('pass');
    } finally {
      process.chdir(previousCwd);
    }
  });

  test('non-completion evidence cannot close a mutated substantial lifecycle', () => {
    const target = makeTempDir();
    initProjectFable(target);
    const previousCwd = process.cwd();
    process.chdir(target);

    try {
      expect(captureConsole(() => runCli(['state', 'executing', '--substantial', '--json'])).code).toBe(0);
      expect(captureConsole(() => runCli(['mutation', 'changed source', '--json'])).code).toBe(0);
      expect(captureConsole(() => runCli(['state', 'verifying', '--json'])).code).toBe(0);
      expect(
        captureConsole(() =>
          runCli(['evidence', 'pass', 'research', 'official docs', 'current API behavior confirmed', '--json'])
        ).code
      ).toBe(0);

      expect(() => runCli(['state', 'complete', '--json'])).toThrow('current mutation generation');
    } finally {
      process.chdir(previousCwd);
    }
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
      expect(report.checks.some((check: any) => check.id === 'skill-registry' && check.status === 'pass')).toBe(true);
      expect(report.checks.some((check: any) => check.id === 'plugin-branding' && check.status === 'pass')).toBe(true);
      expect(report.checks.some((check: any) => check.id === 'plugin-skills-root' && check.status === 'pass')).toBe(true);
      expect(report.checks.some((check: any) => check.id === 'project-state')).toBe(true);
    } finally {
      process.chdir(previousCwd);
    }
  });

  test('status json reports schema v2 for an active initialized project', () => {
    const target = makeTempDir();
    initProjectFable(target);

    const previousCwd = process.cwd();
    process.chdir(target);
    try {
      const result = captureConsole(() => runCli(['status', '--json']));
      expect(result.code).toBe(0);
      const status = JSON.parse(result.output);
      expect(status.project.active).toBe(true);
      expect(status.project.stateSchemaVersion).toBe(2);
    } finally {
      process.chdir(previousCwd);
    }
  });
});
