import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import packageJson from '../package.json';
import {
  DEFAULT_FABLE_SKILLS_REPO,
  resolveFableOwnerRepo,
  resolvePostinstallWorkingDir,
  shouldRunNpmPostinstallSkills,
  buildNpxSkillsAddArgs,
  runNpxSkillsAdd,
} from '../src/integrations/skills-sh-installer.js';

const repoRoot = path.resolve(import.meta.dir, '..');

describe('npm postinstall automatic skills installation (npx skills add <owner/repo>)', () => {
  test('package.json configures postinstall hook and skills.sh field', () => {
    expect((packageJson.scripts as Record<string, string>).postinstall).toBe(
      'node ./bin/postinstall.js'
    );
    expect((packageJson as Record<string, unknown>).skills).toEqual([
      'imMamdouhaboammar/get-fable',
    ]);
    expect(packageJson.files).toContain('bin/');
    expect(fs.existsSync(path.join(repoRoot, 'bin', 'postinstall.js'))).toBe(true);
  });

  test('resolveFableOwnerRepo resolves imMamdouhaboammar/get-fable from package.json and validates overrides', () => {
    expect(resolveFableOwnerRepo(repoRoot, {})).toBe('imMamdouhaboammar/get-fable');
    expect(
      resolveFableOwnerRepo(repoRoot, { FABLE_SKILLS_REPO: 'custom-org/custom-fable' })
    ).toBe('custom-org/custom-fable');

    // Rejects flag injection or shell metacharacters, falling back to canonical owner/repo
    expect(resolveFableOwnerRepo(repoRoot, { FABLE_SKILLS_REPO: '--malicious-flag' })).toBe(
      DEFAULT_FABLE_SKILLS_REPO
    );
    expect(
      resolveFableOwnerRepo(repoRoot, { FABLE_SKILLS_REPO: 'owner/repo; rm -rf /' })
    ).toBe(DEFAULT_FABLE_SKILLS_REPO);
    expect(resolveFableOwnerRepo(repoRoot, { FABLE_SKILLS_REPO: '../escape/repo' })).toBe(
      DEFAULT_FABLE_SKILLS_REPO
    );
  });

  test('resolvePostinstallWorkingDir prefers INIT_CWD and walks out of node_modules/get-fable', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-postinstall-cwd-'));
    try {
      const consumerProject = path.join(tmpDir, 'my-app');
      const installedPkgDir = path.join(consumerProject, 'node_modules', 'get-fable');
      fs.mkdirSync(installedPkgDir, { recursive: true });

      expect(
        resolvePostinstallWorkingDir(installedPkgDir, { INIT_CWD: consumerProject }, installedPkgDir)
      ).toBe(fs.realpathSync(consumerProject));

      // Even if INIT_CWD is missing, resolves consumer project root from node_modules/get-fable
      expect(resolvePostinstallWorkingDir(installedPkgDir, {}, installedPkgDir)).toBe(
        fs.realpathSync(consumerProject)
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('shouldRunNpmPostinstallSkills skips source checkout unless forced and runs in consumer npm install', () => {
    // Source checkout (repoRoot == targetDir, has .git & src/cli.ts) is skipped during dev bun install
    const sourceDecision = shouldRunNpmPostinstallSkills({
      packageRoot: repoRoot,
      targetDir: repoRoot,
      env: {},
    });
    expect(sourceDecision.shouldRun).toBe(false);
    expect(sourceDecision.reason).toBe('source_repo_checkout');

    // Forced run in source checkout
    const forcedDecision = shouldRunNpmPostinstallSkills({
      packageRoot: repoRoot,
      targetDir: repoRoot,
      env: {},
      force: true,
    });
    expect(forcedDecision.shouldRun).toBe(true);

    // Opt-out via env var
    const skippedEnv = shouldRunNpmPostinstallSkills({
      packageRoot: '/tmp/app/node_modules/get-fable',
      targetDir: '/tmp/app',
      env: { FABLE_SKIP_POSTINSTALL: '1' },
    });
    expect(skippedEnv.shouldRun).toBe(false);
    expect(skippedEnv.reason).toBe('skipped_by_env');

    // Normal consumer `npm i get-fable`
    const consumerDecision = shouldRunNpmPostinstallSkills({
      packageRoot: '/tmp/app/node_modules/get-fable',
      targetDir: '/tmp/app',
      env: { INIT_CWD: '/tmp/app' },
    });
    expect(consumerDecision.shouldRun).toBe(true);
    expect(consumerDecision.reason).toBe('npm_install');
  });

  test('buildNpxSkillsAddArgs constructs non-interactive npx skills add <owner/repo> command', () => {
    expect(
      buildNpxSkillsAddArgs({
        ownerRepo: 'imMamdouhaboammar/get-fable',
        global: false,
      })
    ).toEqual(['--yes', 'skills', 'add', 'imMamdouhaboammar/get-fable', '-y']);

    expect(
      buildNpxSkillsAddArgs({
        ownerRepo: 'imMamdouhaboammar/get-fable',
        global: true,
        agents: ['claude-code', 'cursor'],
        skills: ['get-fable', 'fable-execute'],
        copy: true,
      })
    ).toEqual([
      '--yes',
      'skills',
      'add',
      'imMamdouhaboammar/get-fable',
      '-y',
      '-g',
      '--copy',
      '-a',
      'claude-code',
      'cursor',
      '-s',
      'get-fable',
      'fable-execute',
    ]);
  });

  test('runNpxSkillsAdd invokes npx skills add <owner/repo> and falls back to local skills when offline', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-npx-skills-'));
    try {
      const calls: Array<{ cmd: string; args: string[]; cwd: string }> = [];
      const resSuccess = runNpxSkillsAdd({
        packageRoot: repoRoot,
        targetDir: tmpDir,
        force: true,
        silent: true,
        fallbackToLocalSkills: false,
        spawnRunner: (cmd, args, opts) => {
          calls.push({ cmd, args, cwd: opts.cwd });
          return { status: 0, stdout: 'Installed 42 skills', stderr: '' };
        },
      });

      expect(resSuccess.status).toBe('installed');
      expect(resSuccess.method).toBe('npx-skills-add');
      expect(resSuccess.ownerRepo).toBe('imMamdouhaboammar/get-fable');
      expect(calls).toHaveLength(1);
      expect(calls[0].cmd).toBe('npx');
      expect(calls[0].args).toEqual([
        '--yes',
        'skills',
        'add',
        'imMamdouhaboammar/get-fable',
        '-y',
      ]);
      expect(calls[0].cwd).toBe(fs.realpathSync(tmpDir));

      // Now simulate npx failure (e.g. offline environment) and verify local fallback installs skills
      const fallbackDir = path.join(tmpDir, 'offline-project');
      fs.mkdirSync(fallbackDir, { recursive: true });
      const resFallback = runNpxSkillsAdd({
        packageRoot: repoRoot,
        targetDir: fallbackDir,
        force: true,
        silent: true,
        fallbackToLocalSkills: true,
        spawnRunner: () => ({
          status: 1,
          stdout: '',
          stderr: 'ERR! network offline',
        }),
      });

      expect(resFallback.status).toBe('fallback-local');
      expect(resFallback.method).toBe('local-fallback');
      expect(
        fs.existsSync(path.join(fallbackDir, '.agents', 'skills', 'get-fable', 'SKILL.md'))
      ).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('bin/postinstall.js executes npx skills add imMamdouhaboammar/get-fable in consumer project root during npm i get-fable', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-bin-postinstall-'));
    try {
      const consumerDir = path.join(tmpDir, 'consumer-app');
      const fakeBinDir = path.join(tmpDir, 'fake-bin');
      const logFile = path.join(tmpDir, 'npx-invocations.json');
      fs.mkdirSync(consumerDir, { recursive: true });
      fs.mkdirSync(fakeBinDir, { recursive: true });

      const fakeNpxPath = path.join(fakeBinDir, 'npx');
      fs.writeFileSync(
        fakeNpxPath,
        `#!/usr/bin/env node
const fs = require('node:fs');
fs.writeFileSync(${JSON.stringify(logFile)}, JSON.stringify({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
}), 'utf-8');
process.exit(0);
`,
        { mode: 0o755 }
      );

      const postinstallScript = path.join(repoRoot, 'bin', 'postinstall.js');
      const proc = spawnSync(
        process.execPath,
        [postinstallScript, '--force', '--no-local-fallback', '--json'],
        {
          cwd: repoRoot,
          env: {
            ...process.env,
            INIT_CWD: consumerDir,
            PATH: `${fakeBinDir}${path.delimiter}${process.env.PATH || ''}`,
          },
          encoding: 'utf-8',
        }
      );

      expect(proc.status).toBe(0);
      expect(fs.existsSync(logFile)).toBe(true);
      const recorded = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
      expect(recorded.argv).toEqual([
        '--yes',
        'skills',
        'add',
        'imMamdouhaboammar/get-fable',
        '-y',
      ]);
      expect(fs.realpathSync(recorded.cwd)).toBe(fs.realpathSync(consumerDir));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
