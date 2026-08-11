import { describe, expect, test } from 'bun:test';
import { ContextInjector } from '../src/router/context-injector.ts';

describe('ContextInjector', () => {
  test('loads a known bundled agent', () => {
    const content = ContextInjector.loadAgent('Explore');
    expect(typeof content).toBe('string');
    expect(content?.length ?? 0).toBeGreaterThan(100);
  });

  test('rejects path traversal names', () => {
    expect(ContextInjector.loadAgent('../../package')).toBeNull();
    expect(ContextInjector.loadSkill('../secret')).toBeNull();
    expect(ContextInjector.loadSkill('..')).toBeNull();
  });

  test('builds a non-empty consolidated system prompt', () => {
    expect(ContextInjector.getFableSystemPrompt().length).toBeGreaterThan(1000);
  });
});
