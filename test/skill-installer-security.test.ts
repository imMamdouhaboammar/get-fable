import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { copySkillDirectory, resolveSkillsToInstall } from '../src/core/skill-installer.ts';

function fresh(prefix: string) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }

describe('skill installer byte and path safety', () => {
  test('copies arbitrary file bytes exactly', () => {
    const root = fresh('fable-copy-bytes-');
    try {
      const src = path.join(root, 'src'); const dst = path.join(root, 'dst');
      fs.mkdirSync(path.join(src, 'assets'), { recursive: true });
      const bytes = Buffer.from([0, 255, 1, 128, 10, 13, 42]);
      fs.writeFileSync(path.join(src, 'assets', 'fixture.bin'), bytes);
      expect(copySkillDirectory('fixture', src, dst)).toBe(true);
      expect(fs.readFileSync(path.join(dst, 'assets', 'fixture.bin'))).toEqual(bytes);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('rejects source symlinks instead of following or silently skipping them', () => {
    if (process.platform === 'win32') return;
    const root = fresh('fable-copy-link-');
    try {
      const src = path.join(root, 'src'); const dst = path.join(root, 'dst');
      fs.mkdirSync(src); fs.writeFileSync(path.join(root, 'secret.txt'), 'secret');
      fs.symlinkSync(path.join(root, 'secret.txt'), path.join(src, 'link.txt'));
      expect(() => copySkillDirectory('fixture', src, dst)).toThrow('symlink');
      expect(fs.existsSync(path.join(dst, 'link.txt'))).toBe(false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('rejects destination symlinks instead of writing through them', () => {
    if (process.platform === 'win32') return;
    const root = fresh('fable-copy-dest-link-');
    try {
      const src = path.join(root, 'src');
      const outside = path.join(root, 'outside');
      const dst = path.join(root, 'dst');
      fs.mkdirSync(src); fs.mkdirSync(outside);
      fs.writeFileSync(path.join(src, 'SKILL.md'), '# safe');
      fs.symlinkSync(outside, dst, 'dir');
      expect(() => copySkillDirectory('fixture', src, dst)).toThrow('destination symlink');
      expect(fs.existsSync(path.join(outside, 'SKILL.md'))).toBe(false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('rejects nested destination symlinks inside an existing skill directory', () => {
    if (process.platform === 'win32') return;
    const root = fresh('fable-copy-nested-dest-link-');
    try {
      const src = path.join(root, 'src'); const dst = path.join(root, 'dst'); const outside = path.join(root, 'outside');
      fs.mkdirSync(path.join(src, 'assets'), { recursive: true }); fs.mkdirSync(dst); fs.mkdirSync(outside);
      fs.writeFileSync(path.join(src, 'assets', 'data.txt'), 'safe');
      fs.symlinkSync(outside, path.join(dst, 'assets'), 'dir');
      expect(() => copySkillDirectory('fixture', src, dst)).toThrow('destination symlink');
      expect(fs.existsSync(path.join(outside, 'data.txt'))).toBe(false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('does not silently install the entire catalog for an unknown target', () => {
    expect(() => resolveSkillsToInstall('definitely-not-a-real-pack-or-skill')).toThrow('Unknown skill or pack');
  });
});

test('transactional package install restores an existing destination when staging fails', async () => {
  if (process.platform === 'win32') return;
  const { installSkillDirectoryAtomic } = await import('../src/core/skill-installer.ts');
  const root = fresh('fable-install-rollback-');
  try {
    const src = path.join(root, 'src'); const dst = path.join(root, 'skills', 'fixture');
    fs.mkdirSync(src, { recursive: true }); fs.mkdirSync(dst, { recursive: true });
    fs.writeFileSync(path.join(dst, 'user-owned.txt'), 'keep-me');
    fs.writeFileSync(path.join(src, 'SKILL.md'), '# replacement');
    fs.symlinkSync(path.join(root, 'outside.txt'), path.join(src, 'bad-link'));
    expect(() => installSkillDirectoryAtomic('fixture', src, dst, true)).toThrow('symlink');
    expect(fs.readFileSync(path.join(dst, 'user-owned.txt'), 'utf-8')).toBe('keep-me');
    expect(fs.existsSync(path.join(dst, 'SKILL.md'))).toBe(false);
    expect(fs.readdirSync(path.dirname(dst)).some((name) => name.includes('.staging-') || name.includes('.backup-'))).toBe(false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
