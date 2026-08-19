import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dir, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf-8');

describe('CI and release supply-chain contract', () => {
  test('pins every third-party GitHub Action to a full commit SHA', () => {
    for (const file of ['.github/workflows/ci.yml', '.github/workflows/security.yml', '.github/workflows/release.yml']) {
      const text = read(file);
      const uses = [...text.matchAll(/uses:\s+[^@\s]+@([^\s#]+)/g)].map((match) => match[1]);
      expect(uses.length).toBeGreaterThan(0);
      expect(uses.every((ref) => /^[0-9a-f]{40}$/.test(ref))).toBe(true);
    }
  });

  test('uses frozen Bun resolution and least-privilege OIDC only in the publish job', () => {
    expect(read('.github/workflows/ci.yml')).toContain('bun install --frozen-lockfile');
    const release = read('.github/workflows/release.yml');
    expect(release).toContain('id-token: write');
    expect(release).toContain('environment: npm');
    expect(release).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/);
    expect(release).not.toContain('--provenance');
  });

  test('maintains npm and GitHub Actions dependencies with Dependabot', () => {
    const config = read('.github/dependabot.yml');
    expect(config).toContain('package-ecosystem: npm');
    expect(config).toContain('package-ecosystem: github-actions');
  });
});
