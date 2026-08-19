import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  addEvidence,
  createInitialState,
  readFableState,
  recordMutation,
  withFableStateTransaction,
  writeFableState,
} from '../../src/core/state.ts';

describe('enterprise state soak', () => {
  test('survives repeated mutations, evidence, reloads, and transactions without stale verification', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-soak-'));
    try {
      writeFableState(root, createInitialState('2026-08-19T00:00:00.000Z', root));
      const rounds = 120;
      for (let i = 0; i < rounds; i += 1) {
        withFableStateTransaction(root, (state) => recordMutation(state));
        withFableStateTransaction(root, (state) => addEvidence(state, {
          kind: 'test', source: 'soak', result: 'pass', detail: `round-${i}`,
          commandCategory: 'test', scope: 'enterprise-soak',
        }));
        if (i % 10 === 0) expect(readFableState(root)).not.toBeNull();
      }
      const state = readFableState(root)!;
      expect(state.mutationGeneration).toBe(rounds);
      expect(state.verifiedGeneration).toBe(rounds);
      expect(state.evidence).toHaveLength(rounds);
      expect(state.stateRevision).toBe(rounds * 2);
      expect(fs.statSync(path.join(root, '.fable', 'state.json')).size).toBeLessThan(512 * 1024);
      expect(fs.existsSync(path.join(root, '.fable', 'state.lock'))).toBe(false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});
