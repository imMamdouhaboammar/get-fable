import { describe, expect, test } from 'bun:test';
import {
  TypeSafeJevAdvisor,
  TypeSafeProviderException,
} from '../../../src/core/reflex/providers/typesafe-jev.js';
import type { ReflexStateEnvelopeV1 } from '../../../src/core/reflex/types.js';

describe('TypeSafeJevAdvisor Provider Adapter', () => {
  const dummyEnvelope: ReflexStateEnvelopeV1 = {
    schemaVersion: 1,
    task: 'Fix failing unit tests in parser',
    lifecycle: {
      phase: 'executing',
      currentSkill: 'fable-tdd',
      failureState: 'none',
      substantial: true,
      hasActiveCard: true,
      verificationFreshness: 'stale',
    },
    deterministic: {
      selectedSkill: 'fable-tdd',
      selectedPack: 'build',
      reasons: ['unit test failure'],
      requiresPlan: false,
      topCandidates: [{ skill: 'fable-tdd', scoreBucket: 'strong' }],
    },
    constraints: {
      suppressResearch: false,
      suppressRelease: false,
      suppressSecurity: false,
      suppressTdd: false,
      suppressPlan: false,
      suppressReview: false,
      suppressDelegation: false,
    },
  };

  test('throws missing-credential when apiKey is absent', async () => {
    const advisor = new TypeSafeJevAdvisor({
      mode: 'shadow',
      provider: 'typesafe-jev',
      model: 'jev-1.13.0',
      timeoutMs: 1000,
      minMargin: 0.2,
      telemetry: 'local',
    });

    try {
      await advisor.advise(dummyEnvelope);
      expect(true).toBe(false); // Should not reach here
    } catch (err: any) {
      expect(err).toBeInstanceOf(TypeSafeProviderException);
      expect(err.kind).toBe('missing-credential');
    }
  });

  test('normalizes valid API response into ReflexAdvice', async () => {
    const mockFetch: typeof fetch = async () => {
      const payload = {
        model: 'jev-1.13.0',
        answers: {
          selected_skill: {
            type: 'choice',
            choice: 'fable-tdd',
            probabilities: { 'fable-tdd': 0.85, 'fable-execute': 0.1, 'fable-discover': 0.05 },
            confidence: 0.82,
          },
          task_shape: {
            type: 'choice',
            choice: 'bug-fix',
          },
          needs_recovery: { type: 'noul', noul: 0.08 },
          security_relevant: { type: 'noul', noul: 0.02 },
        },
        usage: { input_tokens: 350, output_tokens: 45 },
      };

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const advisor = new TypeSafeJevAdvisor(
      {
        mode: 'shadow',
        provider: 'typesafe-jev',
        model: 'jev-1.13.0',
        timeoutMs: 1000,
        minMargin: 0.2,
        telemetry: 'local',
        apiKey: 'test-key',
      },
      mockFetch
    );

    const advice = await advisor.advise(dummyEnvelope);

    expect(advice.provider).toBe('typesafe-jev');
    expect(advice.model).toBe('jev-1.13.0');
    expect(advice.selectedSkill).toBe('fable-tdd');
    expect(advice.confidence).toBe(0.82);
    expect(advice.probabilities['fable-tdd']).toBe(0.85);
    expect(advice.taskShape).toBe('bug-fix');
    expect(advice.signals.needs_recovery).toBe(0.08);
    expect(advice.usage?.inputTokens).toBe(350);
  });

  test('maps HTTP 401 to authentication error', async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response('Unauthorized', { status: 401 });
    };

    const advisor = new TypeSafeJevAdvisor(
      {
        mode: 'shadow',
        provider: 'typesafe-jev',
        model: 'jev-1.13.0',
        timeoutMs: 1000,
        minMargin: 0.2,
        telemetry: 'local',
        apiKey: 'invalid-key',
      },
      mockFetch
    );

    try {
      await advisor.advise(dummyEnvelope);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(TypeSafeProviderException);
      expect(err.kind).toBe('authentication');
    }
  });

  test('maps timeout to timeout error kind', async () => {
    const mockFetch: typeof fetch = async (_url, init) => {
      await new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted', 'AbortError'));
        });
      });
      return new Response('{}');
    };

    const advisor = new TypeSafeJevAdvisor(
      {
        mode: 'shadow',
        provider: 'typesafe-jev',
        model: 'jev-1.13.0',
        timeoutMs: 50,
        minMargin: 0.2,
        telemetry: 'local',
        apiKey: 'test-key',
      },
      mockFetch
    );

    try {
      await advisor.advise(dummyEnvelope);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(TypeSafeProviderException);
      expect(err.kind).toBe('timeout');
    }
  });
});
