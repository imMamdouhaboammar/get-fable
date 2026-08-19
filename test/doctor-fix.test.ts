import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runDoctorFix, runDoctor } from '../src/core/doctor.ts';

const tempDirs: string[] = [];

function tempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-doctor-fix-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('Doctor Auto-Repair Engine', () => {
  test('automatically repairs missing .fable files and healthy state', () => {
    const root = tempRoot();
    const result = runDoctorFix(root);

    expect(result.repaired.length).toBeGreaterThanOrEqual(3);
    expect(fs.existsSync(path.join(root, '.fable', 'state.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.fable', 'LEDGER.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.fable', 'PROGRESS.md'))).toBe(true);

    const report = runDoctor(root);
    expect(report.checks.some((c) => c.id === 'project-state' && c.status === 'pass')).toBe(true);
  });
});
