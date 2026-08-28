import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getCoreRepoRoot } from '../../src/core/skill-registry.ts';
import { validateFableState } from '../../src/core/state.ts';

describe('repository state template portability', () => {
  test('tracked .fable/state.json is workspace-neutral and binds at runtime', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(getCoreRepoRoot(), '.fable', 'state.json'), 'utf-8'));
    expect(raw.schemaVersion).toBeGreaterThanOrEqual(1);
    const unbound = { ...raw, schemaVersion: 1, workspaceId: undefined };
    const a = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-state-template-a-'));
    const b = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-state-template-b-'));
    try {
      const stateA = validateFableState(unbound, a);
      const stateB = validateFableState(unbound, b);
      expect(stateA.schemaVersion).toBe(3);
      expect(stateB.schemaVersion).toBe(3);
      expect(stateA.workspaceId).not.toBe(stateB.workspaceId);
    } finally {
      fs.rmSync(a, { recursive: true, force: true });
      fs.rmSync(b, { recursive: true, force: true });
    }
  });
});
