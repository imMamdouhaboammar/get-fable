import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveSkillResourcePath } from '../../src/core/skill-package.ts';
import { validateFableState } from '../../src/core/state.ts';

describe('high-risk parser invariants', () => {
  test('rejects traversal, absolute, encoded, and cross-platform separator variants', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-path-fuzz-'));
    try {
      fs.mkdirSync(path.join(root, 'skills', 'fixture'), { recursive: true });
      const unsafe = [
        '../secret.md', './secret.md', '/etc/passwd', 'C:\\Windows\\win.ini',
        'references/../secret.md', 'references\\..\\secret.md',
        'references/%2e%2e/secret.md', 'references/%2E%2E/secret.md',
        'references/%2e./secret.md', 'references//double.md',
      ];
      for (const candidate of unsafe) {
        expect(resolveSkillResourcePath('fixture', candidate, root).safe).toBe(false);
      }
      for (let i = 0; i < 200; i += 1) {
        const candidate = `references/group-${i % 7}/resource-${i}.md`;
        expect(resolveSkillResourcePath('fixture', candidate, root).safe).toBe(true);
      }
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('state validation fails closed for malformed revisions and evidence generations', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-state-fuzz-'));
    try {
      const { createInitialState } = require('../../src/core/state.ts');
      const base = createInitialState('2026-08-19T00:00:00.000Z', root);
      for (const stateRevision of [-1, 0.5, '1', null, NaN]) {
        expect(() => validateFableState({ ...base, stateRevision }, root)).toThrow();
      }
      for (const generation of [-1, 1.2, '0', 99]) {
        expect(() => validateFableState({
          ...base,
          evidence: [{ kind: 'test', source: 'fuzz', result: 'pass', detail: 'x', generation, timestamp: '2026-08-19T00:00:00.000Z' }],
        }, root)).toThrow();
      }
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});
