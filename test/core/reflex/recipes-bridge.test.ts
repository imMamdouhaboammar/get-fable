import { describe, expect, it } from 'bun:test';
import { RecipesBridge } from '../../../src/core/reflex/recipes-bridge.js';
import { TypeSafeClient } from '../../../src/core/reflex/client.js';

describe('Jev Recipes Bridge', () => {
  it('triages error logs into Level 1 (harness-environment)', async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          answers: {
            diagnosis_level: {
              type: 'choice',
              choice: 'harness-environment',
              confidence: 0.9,
            },
            severity: {
              type: 'score',
              score: 2.5,
            },
            actionable: {
              type: 'noul',
              noul: 0.95,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const client = new TypeSafeClient({ apiKey: 'test', fetchFn: mockFetch });
    const bridge = new RecipesBridge(client);

    const diagnosis = await bridge.triageErrorLog('error: command not found: bun');
    expect(diagnosis.level).toBe('harness-environment');
    expect(diagnosis.levelNumber).toBe(1);
    expect(diagnosis.actionable).toBe(true);
  });

  it('scans text and detects private API keys', async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          answers: {
            has_secrets: { type: 'noul', noul: 0.92 },
            has_pii: { type: 'noul', noul: 0.1 },
            prompt_injection: { type: 'noul', noul: 0.05 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const client = new TypeSafeClient({ apiKey: 'test', fetchFn: mockFetch });
    const bridge = new RecipesBridge(client);

    const result = await bridge.scanForSecretsAndSecurity('const key = "sk-live-123456789";');
    expect(result.hasSecrets).toBe(true);
    expect(result.isSafe).toBe(false);
  });

  it('reranks candidates by relevance', async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          answers: {
            rel_0: { type: 'noul', noul: 0.2 },
            rel_1: { type: 'noul', noul: 0.95 },
            rel_2: { type: 'noul', noul: 0.4 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const client = new TypeSafeClient({ apiKey: 'test', fetchFn: mockFetch });
    const bridge = new RecipesBridge(client);

    const ranked = await bridge.rerankCandidates('database migrations', [
      'ui/button.tsx',
      'db/schema.sql',
      'docs/readme.md',
    ]);

    expect(ranked[0].item).toBe('db/schema.sql');
    expect(ranked[0].relevance).toBe(0.95);
  });
});
