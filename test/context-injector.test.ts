import { describe, expect, test } from 'bun:test';
import { ContextInjector } from '../src/router/context-injector.ts';

describe('ContextInjector', () => {
  test('loads a known bundled agent', () => {
    const content = ContextInjector.loadAgent('Explore');
    expect(typeof content).toBe('string');
    expect(content?.length ?? 0).toBeGreaterThan(100);
  });

  test('loads canonical deep Skill playbooks before the historical asset library', () => {
    const content = ContextInjector.loadSkill('fable-verify');
    expect(content).toContain('name: fable-verify');
    expect(content).toContain('## Verification Protocol');
    expect(content).toContain('## Failure Taxonomy');
    expect(content).toContain('## Anti-Patterns');
  });

  test('rejects path traversal names', () => {
    expect(ContextInjector.loadAgent('../../package')).toBeNull();
    expect(ContextInjector.loadSkill('../secret')).toBeNull();
    expect(ContextInjector.loadSkill('..')).toBeNull();
  });

  test('builds a canonical compatibility prompt without historical prompt assets', () => {
    const prompt = ContextInjector.getFableSystemPrompt();
    expect(prompt).toContain('Process discipline only');
    expect(prompt).toContain('name: get-fable');
    expect(prompt).not.toContain('Claude Fable 5 (Mythos-Class Model Tier)');
  });
});
