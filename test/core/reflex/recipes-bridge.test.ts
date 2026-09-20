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

  it('scans large content (>6000 chars) across multiple chunks without dropping secrets', async () => {
    let callCount = 0;
    const mockFetch: typeof fetch = async (url, opts: any) => {
      callCount++;
      const body = JSON.parse(opts.body);
      const chunkText = body.state.content;
      const hasKey = chunkText.includes('SECRET_IN_CHUNK_2');
      return new Response(
        JSON.stringify({
          answers: {
            has_secrets: { type: 'noul', noul: hasKey ? 0.99 : 0.01 },
            has_pii: { type: 'noul', noul: 0.01 },
            prompt_injection: { type: 'noul', noul: 0.01 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const client = new TypeSafeClient({ apiKey: 'test', fetchFn: mockFetch });
    const bridge = new RecipesBridge(client);

    // Create 10,000 characters with secret placed at index 8000
    const largeContent = 'A'.repeat(8000) + 'SECRET_IN_CHUNK_2' + 'B'.repeat(2000);
    const result = await bridge.scanForSecretsAndSecurity(largeContent);

    expect(callCount).toBeGreaterThan(1);
    expect(result.hasSecrets).toBe(true);
    expect(result.isSafe).toBe(false);
  });

  it('reranks more than 15 candidates across multiple batches and preserves all candidates', async () => {
    let callCount = 0;
    const mockFetch: typeof fetch = async (url, opts: any) => {
      callCount++;
      const body = JSON.parse(opts.body);
      const answers: Record<string, any> = {};
      body.state.candidates.forEach((cand: string, idx: number) => {
        answers[`rel_${idx}`] = { type: 'noul', noul: cand === 'target_item' ? 0.99 : 0.1 };
      });
      return new Response(
        JSON.stringify({ answers }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const client = new TypeSafeClient({ apiKey: 'test', fetchFn: mockFetch });
    const bridge = new RecipesBridge(client);

    const candidates = Array.from({ length: 25 }, (_, i) => (i === 20 ? 'target_item' : `item_${i}`));
    const ranked = await bridge.rerankCandidates('find target', candidates);

    expect(callCount).toBe(2); // 15 + 10 = 2 batches
    expect(ranked.length).toBe(25);
    expect(ranked[0].item).toBe('target_item');
    expect(ranked[0].relevance).toBe(0.99);
  });
});
