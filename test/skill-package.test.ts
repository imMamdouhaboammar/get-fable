import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadSkillPackage,
  validateSkillPackage,
  listSkillResources,
  readSkillResource,
  getSkillPackageSummary,
  loadAllSkillPackages,
  validateAllSkillPackages,
} from '../src/core/skill-package.ts';
import { canonicalSkillIds } from '../src/core/skill-registry.ts';

describe('Skill Package Architecture & Containment', () => {
  test('all 25 canonical skill packages load and validate cleanly', () => {
    const all = loadAllSkillPackages();
    const canonical = canonicalSkillIds();
    expect(canonical.length).toBe(25);
    expect(Object.keys(all).length).toBe(25);

    const validationResults = validateAllSkillPackages();
    for (const id of canonical) {
      const pkg = all[id];
      expect(pkg).not.toBeNull();
      expect(pkg.id).toBe(id);
      expect(pkg.schemaVersion).toBe(2);
      expect(pkg.entry).toBe('SKILL.md');
      expect(pkg.agents.length).toBeGreaterThan(0);
      expect(pkg.evals.length).toBeGreaterThan(0);

      const val = validationResults[id];
      expect(val.valid).toBe(true);
      expect(val.errors).toEqual([]);
      expect(val.resources.length).toBeGreaterThanOrEqual(5);
    }
  });

  test('reference package fable-skill-creator has full progressive disclosure resources', () => {
    const summary = getSkillPackageSummary('fable-skill-creator');
    expect(summary.valid).toBe(true);
    expect(summary.agentCount).toBeGreaterThanOrEqual(1);
    expect(summary.referenceCount).toBeGreaterThanOrEqual(3);
    expect(summary.templateCount).toBeGreaterThanOrEqual(3);
    expect(summary.exampleCount).toBeGreaterThanOrEqual(1);
    expect(summary.evalCount).toBeGreaterThanOrEqual(1);
    expect(summary.totalResources).toBeGreaterThanOrEqual(10);

    const resources = listSkillResources('fable-skill-creator');
    expect(resources.some((r) => r.path === 'references/progressive-disclosure.md')).toBe(true);
    expect(resources.some((r) => r.path === 'templates/skill-template.md')).toBe(true);
    expect(resources.some((r) => r.path === 'evals/scenarios.json')).toBe(true);

    const content = readSkillResource('fable-skill-creator', 'references/progressive-disclosure.md');
    expect(content).toContain('Progressive Disclosure');
  });

  test('fable-spark package contains all required policies and scenarios', () => {
    const resources = listSkillResources('fable-spark');
    expect(resources.some((r) => r.path === 'references/silence-policy.md')).toBe(true);
    expect(resources.some((r) => r.path === 'references/confidence-policy.md')).toBe(true);
    expect(resources.some((r) => r.path === 'references/atomic-action-and-silence.md')).toBe(true);
    expect(resources.some((r) => r.path === 'templates/spark-decision.template.md')).toBe(true);
    expect(resources.some((r) => r.path === 'evals/scenarios.json')).toBe(true);
  });

  test('rejects path traversal attempts with ../', () => {
    expect(() => {
      readSkillResource('fable-skill-creator', '../package.json');
    }).toThrow();

    expect(() => {
      readSkillResource('fable-skill-creator', '../../../../etc/passwd');
    }).toThrow();
  });

  test('rejects absolute resource paths', () => {
    expect(() => {
      readSkillResource('fable-skill-creator', '/etc/hosts');
    }).toThrow();
  });

  test('rejects non-existent skill package IDs', () => {
    expect(() => {
      loadSkillPackage('non-existent-fable-skill-xyz');
    }).toThrow('not found');
  });

  test('package validation catches broken resource pointers', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-pkg-test-'));
    try {
      const fakeSkillDir = path.join(tempDir, 'skills', 'fake-skill');
      fs.mkdirSync(fakeSkillDir, { recursive: true });
      fs.writeFileSync(path.join(fakeSkillDir, 'SKILL.md'), '# Fake Skill\n');
      fs.writeFileSync(
        path.join(fakeSkillDir, 'skill.package.json'),
        JSON.stringify({
          schemaVersion: 2,
          id: 'fake-skill',
          entry: 'SKILL.md',
          agents: [],
          references: ['references/missing.md'],
          templates: [],
          examples: [],
          evals: [],
          scripts: [],
          scriptPolicy: 'data-only',
        })
      );

      const val = validateSkillPackage('fake-skill', tempDir);
      expect(val.valid).toBe(false);
      expect(val.errors.some((e) => e.includes('missing.md'))).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('package validation catches malformed agents/openai.yaml without string default_prompt', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-pkg-test-'));
    try {
      const fakeSkillDir = path.join(tempDir, 'skills', 'bad-agent-skill');
      fs.mkdirSync(path.join(fakeSkillDir, 'agents'), { recursive: true });
      fs.writeFileSync(path.join(fakeSkillDir, 'SKILL.md'), '# Bad Agent Skill\n');
      fs.writeFileSync(
        path.join(fakeSkillDir, 'agents', 'openai.yaml'),
        `interface:\n  display_name: "Bad Agent"\n  short_description: "A bad agent"\n  default_prompt:\n    nested: bad\n`
      );
      fs.writeFileSync(
        path.join(fakeSkillDir, 'skill.package.json'),
        JSON.stringify({
          schemaVersion: 2,
          id: 'bad-agent-skill',
          entry: 'SKILL.md',
          agents: ['agents/openai.yaml'],
          references: [],
          templates: [],
          examples: [],
          evals: [],
          scripts: [],
          scriptPolicy: 'data-only',
        })
      );

      const val = validateSkillPackage('bad-agent-skill', tempDir);
      expect(val.valid).toBe(false);
      expect(val.errors.some((e) => e.includes('default_prompt must be a string'))).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('package validation catches missing display_name and short_description in agents/openai.yaml', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-pkg-test-'));
    try {
      const fakeSkillDir = path.join(tempDir, 'skills', 'incomplete-agent-skill');
      fs.mkdirSync(path.join(fakeSkillDir, 'agents'), { recursive: true });
      fs.writeFileSync(path.join(fakeSkillDir, 'SKILL.md'), '# Incomplete Agent Skill\n');
      fs.writeFileSync(
        path.join(fakeSkillDir, 'agents', 'openai.yaml'),
        `interface:\n  default_prompt: "Valid prompt"\n`
      );
      fs.writeFileSync(
        path.join(fakeSkillDir, 'skill.package.json'),
        JSON.stringify({
          schemaVersion: 2,
          id: 'incomplete-agent-skill',
          entry: 'SKILL.md',
          agents: ['agents/openai.yaml'],
          references: [],
          templates: [],
          examples: [],
          evals: [],
          scripts: [],
          scriptPolicy: 'data-only',
        })
      );

      const val = validateSkillPackage('incomplete-agent-skill', tempDir);
      expect(val.valid).toBe(false);
      expect(val.errors.some((e) => e.includes('interface.display_name is required'))).toBe(true);
      expect(val.errors.some((e) => e.includes('interface.short_description is required'))).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
