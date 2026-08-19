import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import packageJson from '../package.json';

const root = path.resolve(import.meta.dir, '..');

describe('npm distribution contract', () => {
  test('declares Bun as the public runtime and does not claim Node compatibility', () => {
    expect(packageJson.engines.bun).toBe('>=1.3.0');
    expect((packageJson.engines as any).node).toBeUndefined();
    expect(packageJson.main).toBe('src/index.ts');
  });

  test('keeps developer-only root holdouts and Superpowers plans outside the package whitelist', () => {
    expect(packageJson.files).not.toContain('evals/');
    expect(packageJson.files).not.toContain('docs/');
    expect(packageJson.files).toContain('eval/');
    expect(packageJson.files).toContain('docs/*.md');
    expect(fs.existsSync(path.join(root, 'docs', 'COMPATIBILITY.md'))).toBe(true);
  });
});
