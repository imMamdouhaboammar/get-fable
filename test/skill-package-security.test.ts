import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadSkillPackage,
  readSkillResource,
  resolveSkillResourcePath,
  validateSkillPackage,
} from '../src/core/skill-package.ts';

function fixture(manifest: Record<string, unknown>, files: Record<string, string | Buffer> = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-pkg-sec-'));
  const dir = path.join(root, 'skills', String(manifest.id));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '# test\n');
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  fs.writeFileSync(path.join(dir, 'skill.package.json'), JSON.stringify(manifest));
  return { root, dir, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function v2(id = 'fixture-skill') {
  return {
    schemaVersion: 2,
    id,
    entry: 'SKILL.md',
    agents: [], references: [], templates: [], examples: [], evals: [], scripts: [],
    scriptPolicy: 'data-only',
  };
}

describe('Skill Package v2 trust boundary', () => {
  test('rejects legacy versions unless migrated explicitly', () => {
    const f = fixture({ ...v2(), schemaVersion: 1 });
    try { expect(() => loadSkillPackage('fixture-skill', f.root)).toThrow('schemaVersion'); }
    finally { f.cleanup(); }
  });

  test('rejects unknown manifest fields', () => {
    const f = fixture({ ...v2(), surprise: true });
    try { expect(() => loadSkillPackage('fixture-skill', f.root)).toThrow('Unknown field'); }
    finally { f.cleanup(); }
  });

  test('rejects encoded traversal and Windows path forms before filesystem access', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-path-'));
    try {
      fs.mkdirSync(path.join(root, 'skills', 'fixture-skill'), { recursive: true });
      expect(resolveSkillResourcePath('fixture-skill', 'references/%2e%2e/secret.md', root).safe).toBe(false);
      expect(resolveSkillResourcePath('fixture-skill', 'references\\..\\secret.md', root).safe).toBe(false);
      expect(resolveSkillResourcePath('fixture-skill', 'C:\\Windows\\win.ini', root).safe).toBe(false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('rejects broken symlinks and symlink resources', () => {
    if (process.platform === 'win32') return;
    const f = fixture(v2());
    try {
      const link = path.join(f.dir, 'references', 'link.md');
      fs.mkdirSync(path.dirname(link), { recursive: true });
      fs.symlinkSync('/definitely/missing/fable-target', link);
      const manifest = { ...v2(), references: ['references/link.md'] };
      fs.writeFileSync(path.join(f.dir, 'skill.package.json'), JSON.stringify(manifest));
      const result = validateSkillPackage('fixture-skill', f.root);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toMatch(/symlink/i);
    } finally { f.cleanup(); }
  });

  test('enforces category extensions and declared-only reads', () => {
    const f = fixture({ ...v2(), references: ['references/payload.exe'] }, {
      'references/payload.exe': 'x',
      'references/private.md': 'not declared',
    });
    try {
      expect(validateSkillPackage('fixture-skill', f.root).valid).toBe(false);
      fs.writeFileSync(path.join(f.dir, 'skill.package.json'), JSON.stringify(v2()));
      expect(() => readSkillResource('fixture-skill', 'references/private.md', f.root)).toThrow('not declared');
    } finally { f.cleanup(); }
  });

  test('enforces per-resource and resource-count quotas', () => {
    const large = Buffer.alloc(1024 * 1024 + 1, 1);
    const f = fixture({ ...v2(), references: ['references/large.md'] }, { 'references/large.md': large });
    try {
      let result = validateSkillPackage('fixture-skill', f.root);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toMatch(/size|MiB/i);

      const references = Array.from({ length: 129 }, (_, i) => `references/r${i}.md`);
      for (const rel of references) {
        const target = path.join(f.dir, rel);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, 'x');
      }
      fs.writeFileSync(path.join(f.dir, 'skill.package.json'), JSON.stringify({ ...v2(), references }));
      result = validateSkillPackage('fixture-skill', f.root);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toMatch(/128|resource count/i);
    } finally { f.cleanup(); }
  });
});
