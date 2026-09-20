import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';
import {
  appendReflexEvent,
  getReflexDir,
  hashTaskText,
  readReflexEvents,
  type ReflexEventV1,
} from '../../../src/core/reflex/ledger.js';

describe('Reflex Local Ledger', () => {
  test('hashTaskText generates valid SHA-256 hex digest', () => {
    const hash = hashTaskText('hello world');
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  test('appendReflexEvent writes to events.jsonl and readReflexEvents retrieves it', () => {
    const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-reflex-test-'));
    try {
      const dummyEvent: ReflexEventV1 = {
        schemaVersion: 1,
        timestamp: new Date().toISOString(),
        taskHash: hashTaskText('Test task'),
        taskLength: 9,
        mode: 'shadow',
        provider: 'typesafe-jev',
        model: 'jev-1.13.0',
        deterministicSkill: 'fable-execute',
        reflexSkill: 'fable-tdd',
        fusedSkill: 'fable-execute',
        confidence: 0.85,
        margin: 0.3,
        latencyMs: 120,
      };

      appendReflexEvent(dummyEvent, tmpRepo);

      const events = readReflexEvents({ repoRoot: tmpRepo });
      expect(events.length).toBe(1);
      expect(events[0].taskHash).toBe(dummyEvent.taskHash);
      expect(events[0].fusedSkill).toBe('fable-execute');
    } finally {
      fs.rmSync(tmpRepo, { recursive: true, force: true });
    }
  });

  test('rejects symlinked .fable or .fable/reflex directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-symlink-test-'));
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-symlink-target-'));

    try {
      fs.symlinkSync(targetDir, path.join(tmpDir, '.fable'));
      expect(() => getReflexDir(tmpDir)).toThrow('must not be a symlink');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  });
});
