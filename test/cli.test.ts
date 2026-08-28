import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { getPackageVersion, parsePort, runCli } from '../src/cli.ts';

const originalClaudeDir = process.env.CLAUDE_CONFIG_DIR;
const originalGeminiDir = process.env.FABLE_GEMINI_CONFIG_DIR;
const originalKernelDir = process.env.FABLE_AGENT_KERNEL_DIR;
const originalCwd = path.resolve(import.meta.dir, '..');
const tempDirs: string[] = [];

function tempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-cli-'));
  tempDirs.push(dir);
  return dir;
}

function git(cwd: string, ...args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' }).trim();
}

afterEach(() => {
  process.chdir(originalCwd);
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
    expect(getPackageVersion()).toBe('1.5.0');
  });

  test('returns failure when Git hooks cannot be installed and success for a valid custom path', () => {
    if (process.platform === 'win32') return;
    const unsafe = tempRoot();
    git(unsafe, 'init');
    git(unsafe, 'config', 'core.hooksPath', '/dev/null');

    const unsafeResult = spawnSync(
      process.execPath,
      [path.join(originalCwd, 'src', 'cli.ts'), 'install', 'git-hooks'],
      { cwd: unsafe, encoding: 'utf-8' },
    );
    expect(unsafeResult.status).not.toBe(0);

    const valid = tempRoot();
    git(valid, 'init');
    git(valid, 'config', 'core.hooksPath', '.githooks');

    const validResult = spawnSync(
      process.execPath,
      [path.join(originalCwd, 'src', 'cli.ts'), 'install', 'git-hooks'],
      { cwd: valid, encoding: 'utf-8' },
    );
    expect(validResult.status).toBe(0);
    expect(fs.existsSync(path.join(valid, '.githooks', 'pre-commit'))).toBe(true);
  });

  test('runs spark command in text and json mode', () => {
    expect(runCli(['spark'])).toBe(0);
    expect(runCli(['spark', '--json'])).toBe(0);
    expect(runCli(['spark', 'fix token refresh bug', '--json'])).toBe(0);
  });

  test('exports oracle-free behavior requests and scores offline provider responses', async () => {
    const root = tempRoot();
    const requestsPath = path.join(root, 'requests.json');
    const responsesPath = path.join(root, 'responses.json');
    const evidencePath = path.join(root, 'evidence.json');
    expect(runCli(['behavior-eval', 'export', '--out', requestsPath])).toBe(0);
    const requests = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'));
    expect(requests.metric).toBe('agent-behavior-requests');
    expect(requests.requests.some((item: any) => Object.prototype.hasOwnProperty.call(item, 'expected') || Object.prototype.hasOwnProperty.call(item, 'forbidden'))).toBe(false);
    const agentEval: any = await import('../src/core/agent-behavior-eval.ts');
    const plan = agentEval.buildEnterpriseAgentBehaviorEvalPlan();
    fs.writeFileSync(responsesPath, JSON.stringify({
      schemaVersion: 1,
      metric: 'agent-behavior-responses',
      providerId: 'fixture-provider',
      responses: requests.requests.map((request: any, index: number) => ({ caseId: request.caseId, response: { ...plan[index].expected } })),
    }));
    expect(runCli(['behavior-eval', 'score', responsesPath, '--out', evidencePath])).toBe(0);
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
    expect(evidence.providerId).toBe('fixture-provider');
    expect(evidence.passed).toBe(evidence.total);
    expect(evidence.corpusSha256).toMatch(/^[a-f0-9]{64}$/);
  });


  test('offers additive schema-v1 JSON envelopes without changing legacy --json', () => {
    const originalLog = console.log;
    const capture = (args: string[]) => {
      const lines: string[] = [];
      console.log = (...items: unknown[]) => lines.push(items.map(String).join(' '));
      try { expect(runCli(args)).toBe(0); }
      finally { console.log = originalLog; }
      return JSON.parse(lines.at(-1) || '{}');
    };

    const legacy = capture(['route', 'fix token refresh bug', '--json']);
    expect(legacy.schemaVersion).toBeUndefined();
    expect(legacy.selectedSkill).toBeTruthy();

    const route = capture(['route', 'fix token refresh bug', '--json-v1']);
    expect(route.schemaVersion).toBe(1);
    expect(route.command).toBe('route');
    expect(route.data.selectedSkill).toBe(legacy.selectedSkill);

    const feed = capture(['feed', 'list', '--json-v1']);
    expect(feed.schemaVersion).toBe(1);
    expect(feed.command).toBe('feed:list');
    expect(Array.isArray(feed.data)).toBe(true);

    const doctor = capture(['doctor', '--json-v1']);
    expect(doctor.schemaVersion).toBe(1);
    expect(doctor.command).toBe('doctor');
    expect(Array.isArray(doctor.data.checks)).toBe(true);
  }, 30000);

});
