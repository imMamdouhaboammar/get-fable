import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { copySkillDirectory, installSkillDirectoryAtomic } from '../src/core/skill-installer.js';

describe('Issue #124: Validate Skill Packages before installation and copy only declared resources', () => {
  function makeTemp(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'fable-skill-pkg-install-'));
  }

  function createValidSkillSource(srcDir: string, skillId: string = 'test-skill'): void {
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'SKILL.md'), '# Test Skill\n');
    fs.mkdirSync(path.join(srcDir, 'references'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'references', 'guide.md'), '# Guide\n');
    fs.mkdirSync(path.join(srcDir, 'templates'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'templates', 'config.json'), '{"key":"val"}\n');

    fs.writeFileSync(
      path.join(srcDir, 'skill.package.json'),
      JSON.stringify({
        schemaVersion: 2,
        id: skillId,
        entry: 'SKILL.md',
        agents: [],
        references: ['references/guide.md'],
        templates: ['templates/config.json'],
        examples: [],
        evals: [],
        scripts: [],
        scriptPolicy: 'data-only',
      }, null, 2)
    );
  }

  test('copies ONLY declared files and ignores undeclared files', () => {
    const root = makeTemp();
    try {
      const src = path.join(root, 'source-skill');
      const dst = path.join(root, 'installed-skill');
      createValidSkillSource(src, 'sample-skill');

      // Add undeclared files and folders
      fs.writeFileSync(path.join(src, 'untracked-secret.env'), 'SECRET_KEY=12345\n');
      fs.mkdirSync(path.join(src, 'internal-scratch'), { recursive: true });
      fs.writeFileSync(path.join(src, 'internal-scratch', 'notes.txt'), 'notes\n');

      const success = copySkillDirectory('sample-skill', src, dst, true);
      expect(success).toBe(true);

      // Declared files exist
      expect(fs.existsSync(path.join(dst, 'skill.package.json'))).toBe(true);
      expect(fs.existsSync(path.join(dst, 'SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(dst, 'references', 'guide.md'))).toBe(true);
      expect(fs.existsSync(path.join(dst, 'templates', 'config.json'))).toBe(true);

      // Undeclared files MUST NOT exist
      expect(fs.existsSync(path.join(dst, 'untracked-secret.env'))).toBe(false);
      expect(fs.existsSync(path.join(dst, 'internal-scratch'))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('fails closed when skill.package.json manifest is missing', () => {
    const root = makeTemp();
    try {
      const src = path.join(root, 'source-skill');
      const dst = path.join(root, 'installed-skill');
      fs.mkdirSync(src, { recursive: true });
      fs.writeFileSync(path.join(src, 'SKILL.md'), '# No Manifest\n');

      expect(() => copySkillDirectory('sample-skill', src, dst, true)).toThrow(
        /Refusing to install invalid skill package/i
      );
      expect(fs.existsSync(dst)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('fails closed when declared resource is missing on disk', () => {
    const root = makeTemp();
    try {
      const src = path.join(root, 'source-skill');
      const dst = path.join(root, 'installed-skill');
      createValidSkillSource(src, 'missing-res-skill');

      // Delete declared resource
      fs.unlinkSync(path.join(src, 'references', 'guide.md'));

      expect(() => copySkillDirectory('missing-res-skill', src, dst, true)).toThrow(
        /Refusing to install invalid skill package/i
      );
      expect(fs.existsSync(dst)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('fails closed when declared resource is empty (0 bytes)', () => {
    const root = makeTemp();
    try {
      const src = path.join(root, 'source-skill');
      const dst = path.join(root, 'installed-skill');
      createValidSkillSource(src, 'empty-res-skill');

      // Truncate declared resource to 0 bytes
      fs.writeFileSync(path.join(src, 'references', 'guide.md'), '');

      expect(() => copySkillDirectory('empty-res-skill', src, dst, true)).toThrow(
        /Refusing to install invalid skill package/i
      );
      expect(fs.existsSync(dst)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('prunes pre-existing undeclared files from destination on overwrite', () => {
    const root = makeTemp();
    try {
      const src = path.join(root, 'source-skill');
      const dst = path.join(root, 'installed-skill');
      createValidSkillSource(src, 'clean-skill');

      // Destination already has stale leftover files
      fs.mkdirSync(dst, { recursive: true });
      fs.writeFileSync(path.join(dst, 'legacy-garbage.txt'), 'old garbage\n');

      const success = copySkillDirectory('clean-skill', src, dst, true);
      expect(success).toBe(true);
      expect(fs.existsSync(path.join(dst, 'skill.package.json'))).toBe(true);
      expect(fs.existsSync(path.join(dst, 'legacy-garbage.txt'))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('atomic install rolls back cleanly when copy fails', () => {
    const root = makeTemp();
    try {
      const src = path.join(root, 'source-skill');
      const dst = path.join(root, 'installed-skill');
      createValidSkillSource(src, 'atomic-skill');

      // Seed pre-existing destination
      fs.mkdirSync(dst, { recursive: true });
      fs.writeFileSync(path.join(dst, 'important-state.json'), '{"live":true}');

      // Invalidate source by deleting SKILL.md
      fs.unlinkSync(path.join(src, 'SKILL.md'));

      expect(() => installSkillDirectoryAtomic('atomic-skill', src, dst, true)).toThrow(
        /Refusing to install invalid skill package/i
      );

      // Pre-existing destination preserved
      expect(fs.existsSync(path.join(dst, 'important-state.json'))).toBe(true);
      expect(fs.readFileSync(path.join(dst, 'important-state.json'), 'utf-8')).toBe('{"live":true}');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
