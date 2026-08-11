import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mergeJsonFile } from '../src/utils.ts';

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-utils-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('mergeJsonFile', () => {
  test('preserves existing keys while applying an update', () => {
    const dir = makeTempDir();
    const file = path.join(dir, 'settings.json');
    fs.writeFileSync(file, '{"theme":"dark","hooks":{}}\n');

    mergeJsonFile(file, (existing) => ({ ...existing, enabled: true }));

    expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toEqual({
      theme: 'dark',
      hooks: {},
      enabled: true,
    });
    expect(fs.readFileSync(file, 'utf-8').endsWith('\n')).toBe(true);
  });

  test('refuses to overwrite malformed JSON', () => {
    const dir = makeTempDir();
    const file = path.join(dir, 'settings.json');
    const original = '{ invalid json';
    fs.writeFileSync(file, original);

    expect(() => mergeJsonFile(file, (existing) => ({ ...existing, enabled: true }))).toThrow(
      'Refusing to update invalid JSON file'
    );
    expect(fs.readFileSync(file, 'utf-8')).toBe(original);
  });

  test('refuses non-object JSON roots', () => {
    const dir = makeTempDir();
    const file = path.join(dir, 'settings.json');
    fs.writeFileSync(file, '[]');

    expect(() => mergeJsonFile(file, (existing) => existing)).toThrow('root value must be a JSON object');
  });

  test('preserves existing file permissions on POSIX systems', () => {
    if (process.platform === 'win32') return;

    const dir = makeTempDir();
    const file = path.join(dir, 'settings.json');
    fs.writeFileSync(file, '{"enabled":false}\n', { mode: 0o640 });

    mergeJsonFile(file, (existing) => ({ ...existing, enabled: true }));

    expect(fs.statSync(file).mode & 0o777).toBe(0o640);
  });

  test('creates new configuration files with owner-only permissions on POSIX systems', () => {
    if (process.platform === 'win32') return;

    const dir = makeTempDir();
    const file = path.join(dir, 'settings.json');

    mergeJsonFile(file, () => ({ enabled: true }));

    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });
});
