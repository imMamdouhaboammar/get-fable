import { describe, expect, it } from 'bun:test';
import { Router, routeTaskToOptimalModel, DEFAULT_AGENT_MODELS } from '../../../src/core/reflex/model-router/index.js';
import { TypeSafeClient } from '../../../src/core/reflex/client.js';

describe('Jev Model Capability & Cost Router', () => {
  it('validates model definitions and throws on invalid inputs', () => {
    expect(() => new Router({ models: [] })).toThrow('Router requires at least 2 models');
    expect(
      () =>
        new Router({
          models: [
            { name: 'm1', cost: 1, description: 'desc1' },
            { name: 'm1', cost: 2, description: 'desc2' },
          ],
        })
    ).toThrow();
  });

  it('calculates expected loss and selects optimal model tier with mock client', async () => {
    // Mock client returning higher probability for tier 1 (flash)
    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          answers: {
            tier: {
              type: 'score',
              score: 1.0,
              probabilities: {
                '0': 0.1,
                '1': 0.8,
                '2': 0.1,
              },
            },
          },
          usage: { input_tokens: 25 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const mockClient = new TypeSafeClient({ apiKey: 'mock', fetchFn: mockFetch });

    const result = await routeTaskToOptimalModel('Implement a simple unit test for utils', {
      models: DEFAULT_AGENT_MODELS,
      client: mockClient,
    });

    expect(result.model).toBe('flash');
    expect(result.tier).toBe(1);
    expect(result.probabilities['flash']).toBe(0.8);
  });

  it('selects pro tier when task requires high complexity', async () => {
    // Mock client returning high probability for tier 2 (pro)
    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          answers: {
            tier: {
              type: 'score',
              score: 2.0,
              probabilities: {
                '0': 0.0,
                '1': 0.1,
                '2': 0.9,
              },
            },
          },
          usage: { input_tokens: 35 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const mockClient = new TypeSafeClient({ apiKey: 'mock', fetchFn: mockFetch });

    const result = await routeTaskToOptimalModel('Architect a distributed Byzantine fault-tolerant consensus layer', {
      models: DEFAULT_AGENT_MODELS,
      client: mockClient,
    });

    expect(result.model).toBe('pro');
    expect(result.tier).toBe(2);
    expect(result.probabilities['pro']).toBe(0.9);
  });
});
