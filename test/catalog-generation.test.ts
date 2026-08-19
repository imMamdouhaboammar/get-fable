import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateCatalogArtifacts, checkCatalogArtifacts } from '../src/core/catalog-generator.ts';

const root = path.resolve(import.meta.dir, '..');

describe('canonical catalog generation', () => {
  test('checked-in artifacts exactly match the canonical registry', () => {
    const result = checkCatalogArtifacts(root);
    expect(result.ok).toBe(true);
    expect(result.drift).toEqual([]);
  });

  test('generation is deterministic and derives package and phase metadata', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-catalog-'));
    try {
      fs.mkdirSync(path.join(temp, 'skills', 'get-fable'), { recursive: true });
      fs.mkdirSync(path.join(temp, 'registry'), { recursive: true });
      fs.mkdirSync(path.join(temp, 'src', 'generated'), { recursive: true });
      fs.mkdirSync(path.join(temp, 'packs'), { recursive: true });
      fs.copyFileSync(path.join(root, 'skills', 'get-fable', 'registry.json'), path.join(temp, 'skills', 'get-fable', 'registry.json'));
      for (const file of fs.readdirSync(path.join(root, 'packs'))) {
        fs.copyFileSync(path.join(root, 'packs', file), path.join(temp, 'packs', file));
      }

      const first = generateCatalogArtifacts(temp);
      expect(first.length).toBeGreaterThan(0);
      const snapshot = fs.readFileSync(path.join(temp, 'src', 'generated', 'skill-catalog.ts'), 'utf-8');
      const second = generateCatalogArtifacts(temp);
      expect(second).toEqual([]);
      expect(fs.readFileSync(path.join(temp, 'src', 'generated', 'skill-catalog.ts'), 'utf-8')).toBe(snapshot);
      const generated = fs.readFileSync(path.join(temp, 'src', 'generated', 'skill-catalog.ts'), 'utf-8');
      expect(generated).toContain("'fable-security'");
      expect(generated).toContain("'fable-security': 'proof'");
      expect(generated).toContain("'fable-security': 'verifying'");
      const pyCatalog = fs.readFileSync(path.join(temp, 'hooks', '_fable_catalog.py'), 'utf-8');
      expect(pyCatalog).toContain('fable-spark');
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});
