import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  validateRoutingHoldoutEvidenceSnapshot,
  validateSparkHoldoutEvidenceSnapshot,
} from '../src/core/eval-runner.js';
import { validateVerificationHoldoutEvidenceSnapshot } from '../src/core/verification-eval.js';
import { loadSkillScenarios, countSkillScenarios } from '../src/core/eval-loader.js';
import type { FableSkillId } from '../src/core/types.js';

describe('Issue #117: Validate every declared holdout evaluator hash', () => {
  const routingHashes = {
    corpusSha256: 'a'.repeat(64),
    routerSha256: 'b'.repeat(64),
    runnerSha256: 'c'.repeat(64),
  };

  test('validateRoutingHoldoutEvidenceSnapshot fails closed when runnerSha256 changes', () => {
    const snapshot = {
      schemaVersion: 1,
      metric: 'enterprise-routing-holdout',
      capturedAt: '2026-08-19T12:00:00.000Z',
      ...routingHashes,
      total: 20,
      passed: 20,
      passRate: 1.0,
      forbiddenViolations: 0,
    };
    // Expected runner hash differs from snapshot runner hash
    const result = validateRoutingHoldoutEvidenceSnapshot(snapshot, {
      ...routingHashes,
      runnerSha256: 'f'.repeat(64),
    });
    expect(result.status).toBe('NOT_CHECKED');
    expect(result.fresh).toBe(false);
    expect(result.reason).toContain('runnerSha256');
  });

  const sparkHashes = {
    corpusSha256: 'a'.repeat(64),
    sparkSha256: 'b'.repeat(64),
    runnerSha256: 'c'.repeat(64),
  };

  test('validateSparkHoldoutEvidenceSnapshot fails closed when runnerSha256 changes', () => {
    const snapshot = {
      schemaVersion: 1,
      metric: 'enterprise-spark-holdout',
      capturedAt: '2026-08-19T12:00:00.000Z',
      ...sparkHashes,
      total: 20,
      passed: 20,
      passRate: 1.0,
      forbiddenViolations: 0,
    };
    const result = validateSparkHoldoutEvidenceSnapshot(snapshot, {
      ...sparkHashes,
      runnerSha256: 'f'.repeat(64),
    });
    expect(result.status).toBe('NOT_CHECKED');
    expect(result.fresh).toBe(false);
    expect(result.reason).toContain('runnerSha256');
  });

  const verificationHashes = {
    corpusSha256: 'a'.repeat(64),
    stateSha256: 'b'.repeat(64),
    evaluatorSha256: 'c'.repeat(64),
  };

  test('validateVerificationHoldoutEvidenceSnapshot fails closed when evaluatorSha256 changes', () => {
    const snapshot = {
      schemaVersion: 1,
      metric: 'enterprise-verification-holdout',
      capturedAt: '2026-08-19T12:00:00.000Z',
      ...verificationHashes,
      total: 20,
      passed: 20,
      passRate: 1.0,
    };
    const result = validateVerificationHoldoutEvidenceSnapshot(snapshot, {
      ...verificationHashes,
      evaluatorSha256: 'f'.repeat(64),
    });
    expect(result.status).toBe('NOT_CHECKED');
    expect(result.fresh).toBe(false);
    expect(result.reason).toContain('evaluatorSha256');
  });
});

describe('Issue #118: Fail closed on malformed or unsupported Skill eval scenarios', () => {
  const createTempSkillRepo = (
    evalFileName: string,
    evalContent: string
  ): { tempDir: string; skillId: FableSkillId } => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-eval-test-'));
    const skillId = 'fable-spark' as FableSkillId;
    const skillDir = path.join(tempDir, 'skills', skillId);
    fs.mkdirSync(path.join(skillDir, 'evals'), { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Test Skill\n');
    fs.writeFileSync(
      path.join(skillDir, 'skill.package.json'),
      JSON.stringify({
        schemaVersion: 2,
        id: skillId,
        entry: 'SKILL.md',
        agents: [],
        references: [],
        templates: [],
        examples: [],
        evals: evalFileName ? [`evals/${evalFileName}`] : [],
        scripts: [],
        scriptPolicy: 'data-only',
      })
    );
    if (evalFileName) {
      fs.writeFileSync(path.join(skillDir, 'evals', evalFileName), evalContent);
    }
    return { tempDir, skillId };
  }

  test('fails closed when eval resource has unsupported format (.yaml)', () => {
    const { tempDir, skillId } = createTempSkillRepo('scenarios.yaml', 'scenarios:\n  - id: test\n');
    try {
      expect(() => loadSkillScenarios(skillId, tempDir)).toThrow(
        /unsupported eval format/i
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('fails closed when eval resource has malformed JSON syntax', () => {
    const { tempDir, skillId } = createTempSkillRepo('scenarios.json', '{ bad json syntax');
    try {
      expect(() => loadSkillScenarios(skillId, tempDir)).toThrow(
        /failed to parse eval resource/i
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('fails closed when eval resource root is neither an array nor an object with scenarios array', () => {
    const { tempDir, skillId } = createTempSkillRepo('scenarios.json', JSON.stringify({ notScenarios: 123 }));
    try {
      expect(() => loadSkillScenarios(skillId, tempDir)).toThrow(
        /must contain an array of scenarios/i
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('fails closed when scenario item is missing id', () => {
    const { tempDir, skillId } = createTempSkillRepo(
      'scenarios.json',
      JSON.stringify([{ expected: { selectedSkill: 'fable-test' } }])
    );
    try {
      expect(() => loadSkillScenarios(skillId, tempDir)).toThrow(
        /missing a valid string "id"/i
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('fails closed when scenario item has no testable expectations', () => {
    const { tempDir, skillId } = createTempSkillRepo(
      'scenarios.json',
      JSON.stringify([{ id: 'scenario-without-expectations' }])
    );
    try {
      expect(() => loadSkillScenarios(skillId, tempDir)).toThrow(
        /has no valid testable fields/i
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('fails closed when scenario item has invalid expected field type', () => {
    const { tempDir, skillId } = createTempSkillRepo(
      'scenarios.json',
      JSON.stringify([{ id: 'scenario-invalid-expected', expected: 'invalid-string' }])
    );
    try {
      expect(() => loadSkillScenarios(skillId, tempDir)).toThrow(
        /invalid "expected" field/i
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('countSkillScenarios returns 0 for empty evals array and null for invalid evals', () => {
    const emptyRepo = createTempSkillRepo('', '');
    try {
      expect(countSkillScenarios(emptyRepo.skillId, emptyRepo.tempDir)).toBe(0);
    } finally {
      fs.rmSync(emptyRepo.tempDir, { recursive: true, force: true });
    }

    const invalidRepo = createTempSkillRepo('scenarios.json', '{ invalid json');
    try {
      expect(countSkillScenarios(invalidRepo.skillId, invalidRepo.tempDir)).toBeNull();
    } finally {
      fs.rmSync(invalidRepo.tempDir, { recursive: true, force: true });
    }
  });
});
