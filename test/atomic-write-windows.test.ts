import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { atomicWriteFileSync } from '../src/utils.js';

describe('Issue #115: Preserve atomic file write guarantees on Windows', () => {
  function makeTemp(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'fable-atomic-test-'));
  }

  test('writes content atomically to target file', () => {
    const dir = makeTemp();
    try {
      const file = path.join(dir, 'test.txt');
      atomicWriteFileSync(file, 'hello world');
      expect(fs.readFileSync(file, 'utf-8')).toBe('hello world');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('preserves existing target file untouched when rename fails permanently', () => {
    const dir = makeTemp();
    try {
      const file = path.join(dir, 'important.txt');
      fs.writeFileSync(file, 'original content');

      // Mock fs.renameSync to throw an unrecoverable error
      const originalRename = fs.renameSync;
      let renameAttempts = 0;
      (fs as any).renameSync = () => {
        renameAttempts++;
        const err = new Error('Simulated filesystem error') as NodeJS.ErrnoException;
        err.code = 'EIO';
        throw err;
      };

      try {
        expect(() => atomicWriteFileSync(file, 'corrupted content')).toThrow('Simulated filesystem error');
      } finally {
        fs.renameSync = originalRename;
      }

      // Original file MUST NOT be overwritten or corrupted
      expect(fs.readFileSync(file, 'utf-8')).toBe('original content');
      // Temp files in dir must be unlinked
      const remainingFiles = fs.readdirSync(dir);
      expect(remainingFiles).toEqual(['important.txt']);
      expect(renameAttempts).toBe(1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('retries and succeeds when transient lock error occurs on Windows', () => {
    const dir = makeTemp();
    try {
      const file = path.join(dir, 'locked.txt');
      fs.writeFileSync(file, 'initial content');

      const originalRename = fs.renameSync;
      let attempts = 0;
      (fs as any).renameSync = (oldPath: string, newPath: string) => {
        attempts++;
        if (attempts < 3) {
          const err = new Error('Resource busy') as NodeJS.ErrnoException;
          err.code = 'EBUSY';
          throw err;
        }
        return originalRename(oldPath, newPath);
      };

      try {
        atomicWriteFileSync(file, 'updated content');
      } finally {
        fs.renameSync = originalRename;
      }

      expect(attempts).toBe(3);
      expect(fs.readFileSync(file, 'utf-8')).toBe('updated content');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
