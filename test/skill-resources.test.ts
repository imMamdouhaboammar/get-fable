import { describe, expect, test } from 'bun:test';
import { compileFableDirective } from '../src/core/prompt-compiler.ts';
import {
  inspectSkillResource,
  listRelevantSkillResources,
  readSelectedSkillResource,
} from '../src/core/skill-resources.ts';

describe('progressive disclosure resources', () => {
  test('lists bounded metadata without reading resource bodies', () => {
    const resources = listRelevantSkillResources('fable-skill-creator', { kinds: ['reference'], maxResources: 2, maxTotalBytes: 64 * 1024 });
    expect(resources.length).toBe(2);
    expect(resources.every((r) => r.type === 'reference')).toBe(true);
    expect(resources.reduce((n, r) => n + r.byteSize, 0)).toBeLessThanOrEqual(64 * 1024);
  });

  test('treats policy-named references as selectable policy resources', () => {
    const policies = listRelevantSkillResources('fable-spark', { kinds: ['policy'], maxResources: 8 });
    expect(policies.length).toBeGreaterThan(0);
    expect(policies.every((r) => /policy|rules|constraints/i.test(r.path))).toBe(true);
  });

  test('reads exactly one declared selected resource under a byte budget', () => {
    const meta = inspectSkillResource('fable-spark', 'references/silence-policy.md');
    expect(meta?.exists).toBe(true);
    const content = readSelectedSkillResource('fable-spark', 'references/silence-policy.md', { maxBytes: 16 * 1024 });
    expect(content).toContain('Spark Silence Policy');
    expect(() => readSelectedSkillResource('fable-spark', 'references/silence-policy.md', { maxBytes: 8 })).toThrow('budget');
  });

  test('default compiled prompt does not inject package resource bodies', () => {
    const compiled = compileFableDirective('Use situational awareness to choose the smallest next move');
    expect(compiled.decision.selectedSkill).toBe('fable-spark');
    expect(compiled.systemPrompt).not.toContain('Spark Silence Policy');
    expect(Buffer.byteLength(compiled.systemPrompt, 'utf-8')).toBeLessThan(32 * 1024);
  });
});
