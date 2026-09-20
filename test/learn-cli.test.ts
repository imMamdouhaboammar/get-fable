import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const CLI_PATH = path.resolve(__dirname, '../bin/get-fable.js');

describe('get-fable learn CLI command', () => {
  test('prints learn help output with --help', () => {
    const res = spawnSync('bun', [CLI_PATH, 'learn', '--help'], {
      encoding: 'utf-8',
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('get-fable learn');
    expect(res.stdout).toContain('--failure-lessons');
    expect(res.stdout).toContain('--target');
  }, 30000);

  test('executes learn command and scaffolds Failure-lessons in temporary workspace', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-learn-test-'));
    try {
      const res = spawnSync('bun', [CLI_PATH, 'learn', '--workspace', tempDir, '--format', 'json'], {
        encoding: 'utf-8',
      });
      expect(res.status).toBe(0);
      const output = JSON.parse(res.stdout);
      expect(output).toHaveProperty('domain');
      expect(output).toHaveProperty('failure_lessons_persisted');

      const flDir = path.join(tempDir, 'Failure-lessons');
      expect(fs.existsSync(flDir)).toBe(true);
      expect(fs.existsSync(path.join(flDir, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(flDir, 'lessons-index.md'))).toBe(true);
      expect(fs.existsSync(path.join(flDir, 'testing-and-verification.md'))).toBe(true);

      const readme = fs.readFileSync(path.join(flDir, 'README.md'), 'utf-8');
      expect(readme).toContain('Pay for an engineering mistake once');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30000);
});
