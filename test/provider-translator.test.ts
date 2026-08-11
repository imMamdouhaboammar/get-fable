import { describe, expect, test } from 'bun:test';
import {
  ProviderTranslator,
  RequestValidationError,
} from '../src/router/provider-translator.ts';

describe('ProviderTranslator.normalizeRequest', () => {
  test('normalizes OpenAI-style messages and supported generation fields', () => {
    const result = ProviderTranslator.normalizeRequest({
      model: 'demo-model',
      messages: [
        { role: 'system', content: 'Be concise' },
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      ],
      temperature: 0.2,
      max_completion_tokens: 120,
      stream: true,
    });

    expect(result.model).toBe('demo-model');
    expect(result.messages[0]).toEqual({ role: 'system', content: 'Be concise' });
    expect(result.messages[1]?.content).toBe('[{"type":"text","text":"Hello"}]');
    expect(result.max_tokens).toBe(120);
    expect(result.stream).toBe(true);
  });

  test('normalizes Gemini-style contents and structured systemInstruction parts', () => {
    const result = ProviderTranslator.normalizeRequest({
      model: 'gemini-demo',
      systemInstruction: { parts: [{ text: 'Rule one' }, { text: 'Rule two' }] },
      contents: [
        { role: 'user', parts: [{ text: 'Question' }] },
        { role: 'model', parts: [{ text: 'Answer' }] },
      ],
      generationConfig: { temperature: 0.4, maxOutputTokens: 90 },
    });

    expect(result.messages).toEqual([
      { role: 'system', content: 'Rule one\nRule two' },
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'Answer' },
    ]);
    expect(result.temperature).toBe(0.4);
    expect(result.max_tokens).toBe(90);
  });

  test('rejects request bodies with no supported message shape', () => {
    expect(() => ProviderTranslator.normalizeRequest({ model: 'x' })).toThrow(RequestValidationError);
    expect(() => ProviderTranslator.normalizeRequest(null)).toThrow('Request body must be a JSON object');
  });
});

describe('ProviderTranslator.injectFableSystemPrompt', () => {
  test('returns a new request and does not mutate the caller input', () => {
    const input = {
      model: 'demo',
      messages: [{ role: 'system' as const, content: 'Original' }],
    };

    const result = ProviderTranslator.injectFableSystemPrompt(input, 'Fable rules');

    expect(result).not.toBe(input);
    expect(result.messages).not.toBe(input.messages);
    expect(input.messages[0]?.content).toBe('Original');
    expect(result.messages[0]?.content).toContain('Fable rules');
    expect(result.messages[0]?.content).toContain('Original');
  });

  test('adds a system message when none exists', () => {
    const result = ProviderTranslator.injectFableSystemPrompt(
      { model: 'demo', messages: [{ role: 'user', content: 'Hi' }] },
      'Fable rules'
    );

    expect(result.messages[0]).toEqual({ role: 'system', content: 'Fable rules' });
    expect(result.messages[1]).toEqual({ role: 'user', content: 'Hi' });
  });
});
