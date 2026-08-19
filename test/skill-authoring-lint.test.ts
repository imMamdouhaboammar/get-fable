import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSkillPackageLint } from '../src/fable-lint.ts';
import { getCoreRepoRoot } from '../src/core/skill-registry.ts';

describe('Skill authoring lint', () => {
  test('current canonical Skills satisfy the required authoring contract', () => {
    const report = runSkillPackageLint(getCoreRepoRoot());
    expect(report.valid).toBe(true);
    expect(report.warnings.filter((w) => /missing required authoring section/i.test(w))).toEqual([]);
  });

  test('detects recursively nested orphan resources', () => {
    const source = getCoreRepoRoot();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-lint-orphan-'));
    try {
      for (const item of ['skills','registry','packs','recipes']) {
        fs.cpSync(path.join(source, item), path.join(root, item), { recursive: true });
      }
      const orphan = path.join(root, 'skills', 'fable-plan', 'references', 'nested', 'orphan.md');
      fs.mkdirSync(path.dirname(orphan), { recursive: true }); fs.writeFileSync(orphan, 'orphan');
      const report = runSkillPackageLint(root);
      expect(report.valid).toBe(false);
      expect(report.errors.join('\n')).toContain('references/nested/orphan.md');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});
