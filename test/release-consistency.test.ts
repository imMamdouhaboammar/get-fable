import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

const root = path.resolve(import.meta.dir, '..');

function readPackageVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')) as { version?: unknown };
  if (typeof pkg.version !== 'string') throw new Error('package.json version is missing');
  return pkg.version;
}

function parseFormula(): { url: string; version: string; sha256: string | null } {
  const formula = fs.readFileSync(path.join(root, 'Formula/get-fable.rb'), 'utf-8');
  const url = formula.match(/^\s*url\s+"([^"]+)"/m)?.[1];
  const version = formula.match(/^\s*version\s+"([^"]+)"/m)?.[1];
  const sha256 = formula.match(/^\s*sha256\s+"([a-f0-9]+)"/m)?.[1] ?? null;
  if (!url || !version) throw new Error('Homebrew formula is missing url or version');
  return { url, version, sha256 };
}

describe('release consistency contract', () => {
  test('Homebrew uses an immutable version-addressed release artifact with SHA-256 integrity', () => {
    const packageVersion = readPackageVersion();
    const formula = parseFormula();

    expect(formula.version).toBe(packageVersion);
    expect(formula.url).toBe(
      `https://github.com/imMamdouhaboammar/get-fable/releases/download/v${packageVersion}/get-fable-v${packageVersion}.tar.gz`
    );
    expect(formula.url).not.toContain('/heads/master');
    expect(formula.sha256).toMatch(/^[a-f0-9]{64}$/);

    if (packageVersion === '1.5.1') {
      expect(formula.sha256).toBe('7f00286f99bbb23bfaba99b915c194e57fbce0b78dd513e91084a6d0ef393d59');
    }
  });

  test('Homebrew release tarball excludes Formula metadata from its own checksum bytes', () => {
    const source = fs.readFileSync(path.join(root, 'scripts/package-release-assets.ts'), 'utf-8');

    expect(source).toContain('get-fable-v${version}.tar.gz');
    expect(source).toContain("'--exclude=.git'");
    expect(source).toContain("'--exclude=node_modules'");
    expect(source).toContain("'--exclude=dist'");
    expect(source).toContain("'--exclude=Formula'");
    expect(source).toMatch(/execFileSync\('tar',[\s\S]*?\{\s*cwd:\s*root,/);
  });
});
