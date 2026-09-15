import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  findNoMistakesBinary,
  checkNoMistakesStatus,
  configureNoMistakesEcosystem,
  resolveLatestNoMistakesRelease,
} from '../src/integrations/no-mistakes-installer.ts';
import { getClaudeDir, getCursorDir } from '../src/utils.ts';
import { runDoctor, runDoctorFix } from '../src/core/doctor.ts';

describe('no-mistakes collaborative quality gate integration', () => {
  test('findNoMistakesBinary finds local or system binary if installed', () => {
    const bin = findNoMistakesBinary();
    if (bin) {
      expect(typeof bin).toBe('string');
      expect(fs.existsSync(bin)).toBe(true);
    }
  });

  test('checkNoMistakesStatus returns structural diagnosis', async () => {
    const status = await checkNoMistakesStatus();
    expect(typeof status.installed).toBe('boolean');
    if (status.installed) {
      expect(status.binaryPath).toBeDefined();
      expect(typeof status.daemonRunning).toBe('boolean');
    }
  });

  test('configureNoMistakesEcosystem safely populates agent skills and cursor rules', () => {
    configureNoMistakesEcosystem({ silent: true });

    const claudeSkill = path.join(getClaudeDir(), 'skills', 'no-mistakes', 'SKILL.md');
    const cursorRule = path.join(getCursorDir(), 'rules', 'no-mistakes.mdc');
    const agentsSkill = path.join(os.homedir(), '.agents', 'skills', 'no-mistakes', 'SKILL.md');

    expect(fs.existsSync(claudeSkill)).toBe(true);
    expect(fs.existsSync(cursorRule)).toBe(true);
    expect(fs.existsSync(agentsSkill)).toBe(true);
  });

  test('runDoctor includes quality-gate-no-mistakes check', () => {
    const report = runDoctor();
    const qgCheck = report.checks.find((c) => c.id === 'quality-gate-no-mistakes');
    expect(qgCheck).toBeDefined();
    expect(['PASS', 'WARN']).toContain(qgCheck!.status);
  }, 30000);

  test('runDoctorFix handles no-mistakes configuration gracefully', () => {
    const res = runDoctorFix();
    expect(Array.isArray(res.repaired)).toBe(true);
    expect(Array.isArray(res.errors)).toBe(true);
  });
});
