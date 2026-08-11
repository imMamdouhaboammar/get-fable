import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runFableLint } from '../src/fable-lint.ts';

const tempDirs: string[] = [];

function workspace(ledger: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-lint-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, '.fable'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.fable', 'LEDGER.md'), ledger);
  fs.writeFileSync(path.join(dir, 'docs', 'SPEC.md'), '# Spec\n\n[measured] test fixture\n');
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('runFableLint', () => {
  test('passes closed cards that include evidence', () => {
    const dir = workspace('- [x] Acceptance: command succeeds -- evidence: bun test\n');
    expect(runFableLint(dir)).toBe(true);
  });

  test('fails open cards without an explicit acceptance check', () => {
    const dir = workspace('- [ ] Implement the change\n');
    expect(runFableLint(dir)).toBe(false);
  });
});
