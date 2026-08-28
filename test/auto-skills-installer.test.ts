import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  autoInstallSkills,
  resolveSkillsToInstall,
  getPlatformSkillsDirs,
} from '../src/core/skill-installer.ts';
import { runCli } from '../src/cli.ts';

const tempDirs: string[] = [];

function tempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-skills-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('Auto Skills Installer', () => {
  test('resolves skills by pack name correctly', () => {
    const coreSkills = resolveSkillsToInstall('core');
    expect(coreSkills).toContain('get-fable');
    expect(coreSkills).toContain('fable-discover');
    expect(coreSkills).toContain('fable-plan');
    expect(coreSkills).toContain('fable-execute');
    expect(coreSkills).toContain('fable-verify');
    expect(coreSkills).toContain('fable-recover');

    const buildSkills = resolveSkillsToInstall('build');
    expect(buildSkills).toContain('fable-tdd');
    expect(buildSkills).toContain('fable-delegate');

    const proofSkills = resolveSkillsToInstall('proof');
    expect(proofSkills).toContain('fable-review');
    expect(proofSkills).toContain('fable-security');

    const systemSkills = resolveSkillsToInstall('system');
    expect(systemSkills).toContain('fable-dataviz');
    expect(systemSkills).toContain('fable-artifact');
    expect(systemSkills).toContain('fable-simplify');
    expect(systemSkills).toContain('fable-loop');
    expect(systemSkills).toContain('fable-run');
    expect(systemSkills).toContain('fable-memory');
    expect(systemSkills).toContain('fable-config');
    expect(systemSkills).toContain('fable-simulator');
    expect(systemSkills).toContain('fable-cowork');
    const creatorSkills = resolveSkillsToInstall('creator');
    expect(creatorSkills).toContain('fable-skill-creator');

    const allSkills = resolveSkillsToInstall('all');
    expect(allSkills.length).toBe(25);
  });

  test('auto-installs a specific pack to isolated destination directories', () => {
    const root = tempRoot();
    const claudeSkillsDir = path.join(root, 'claude-skills');
    const codexSkillsDir = path.join(root, 'codex-skills');

    process.env.CLAUDE_CONFIG_DIR = root;
    process.env.FABLE_CODEX_CONFIG_DIR = root;

    const result = autoInstallSkills({
      packOrSkill: 'build',
      platforms: ['project'],
      projectDir: root,
      global: false,
    });

    expect(result.success).toBe(true);
    expect(result.installedSkills).toContain('fable-tdd');
    expect(result.installedSkills).toContain('fable-delegate');

    const destDir = path.join(root, '.agents', 'skills');
    expect(fs.existsSync(path.join(destDir, 'fable-tdd', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'fable-delegate', 'SKILL.md'))).toBe(true);
  });

  test('runs skills install CLI command cleanly', () => {
    expect(runCli(['skills', 'list'])).toBe(0);
    expect(runCli(['skills', 'inspect', 'fable-tdd'])).toBe(0);
  }, 30000);
});
