import { describe, expect, it } from 'bun:test';
import { choice, noul, score, TypeSafeClient } from '../../../src/core/reflex/client.js';

describe('TypeSafe Native Client & Question Builders', () => {
  it('constructs valid question descriptors', () => {
    const c = choice('Pick a fruit', { apple: 'Red fruit', banana: 'Yellow fruit' });
    expect(c.type).toBe('choice');
    expect(c.instructions).toBe('Pick a fruit');
    expect(c.criteria).toEqual({ apple: 'Red fruit', banana: 'Yellow fruit' });

    const n = noul('Is this code safe?');
    expect(n.type).toBe('noul');
    expect(n.instructions).toBe('Is this code safe?');

    const s = score('Rate severity', ['Low', 'Medium', 'High']);
    expect(s.type).toBe('score');
    expect(s.criteria).toEqual(['Low', 'Medium', 'High']);
  });

  it('throws error when apiKey is missing', async () => {
    const client = new TypeSafeClient({ apiKey: '' });
    await expect(
      client.systemOne({
        state: { text: 'hello' },
        questions: { q1: noul('Is greeting?') },
      })
    ).rejects.toThrow('TYPESAFE_API_KEY is not configured');
  });

  it('handles simulated successful response', async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          answers: {
            is_valid: { type: 'noul', noul: 0.95 },
          },
          usage: { input_tokens: 42, output_tokens: 0 },
          model: 'jev-1.13.0',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const client = new TypeSafeClient({ apiKey: 'mock-key', fetchFn: mockFetch });
    const res = await client.systemOne({
      state: { input: 'test' },
      questions: { is_valid: noul('Check validity') },
    });

    expect(res.answers.is_valid.noul).toBe(0.95);
    expect(res.model).toBe('jev-1.13.0');
    expect(res.usage?.input_tokens).toBe(42);
  });
});
