import { describe, expect, test } from 'bun:test';
import {
  buildReflexEnvelope,
  calculateFailureState,
  calculateVerificationFreshness,
  extractTaskConstraints,
  redactSecrets,
  sanitizeTaskText,
} from '../../../src/core/reflex/envelope.js';
import type { FableState, RoutingDecision } from '../../../src/core/types.js';

describe('ReflexStateEnvelope & Sanitization', () => {
  const dummyRouting: RoutingDecision = {
    selectedSkill: 'fable-execute',
    selectedPack: 'core',
    taskShape: 'bounded-change',
    confidence: 0.9,
    reasons: ['default fallback'],
    requiresPlan: false,
    requiredGates: ['typecheck', 'test'],
    fallbackSkill: null,
    parallelCandidates: [],
    nextSkills: ['fable-verify'],
    scores: {
      'fable-execute': 5,
      'fable-plan': 2,
    } as any,
  };

  test('sanitizeTaskText strips non-printable control characters and enforces length cap', () => {
    const raw = 'Fix\x00\x08 null bytes\x1F in parser\t\n';
    const { text, rawLength, truncated } = sanitizeTaskText(raw);
    expect(text).toBe('Fix null bytes in parser');
    expect(truncated).toBe(false);

    const longTask = 'A'.repeat(3000);
    const result = sanitizeTaskText(longTask);
    expect(result.text.length).toBe(2048);
    expect(result.truncated).toBe(true);
  });

  test('redactSecrets sanitizes API keys and tokens while preserving structure', () => {
    const input =
      'Connect using Bearer eyJhbGciOi... and apikey_210569decf6813e44beaa311eb96794fcc0e_36427071762b99e3c58b1f1cebb6015f6567fd15c4f3030d8967f192cb742eff and password: "mySecretPassword123"';
    const { sanitized, redactedCount } = redactSecrets(input);

    expect(redactedCount).toBeGreaterThanOrEqual(3);
    expect(sanitized).not.toContain('apikey_210569decf6813e44beaa311eb96794fcc0e');
    expect(sanitized).not.toContain('mySecretPassword123');
    expect(sanitized).toContain('[REDACTED_SECRET]');
  });

  test('calculateFailureState correctly identifies repeated failure', () => {
    expect(calculateFailureState(null)).toBe('none');
    expect(calculateFailureState({ failureStreak: 1 } as any)).toBe('single-failure');
    expect(calculateFailureState({ failureStreak: 2 } as any)).toBe('repeated-failure');
    expect(calculateFailureState({ phase: 'recovering', failureStreak: 0 } as any)).toBe('repeated-failure');
  });

  test('calculateVerificationFreshness determines fresh vs stale evidence', () => {
    expect(calculateVerificationFreshness(null)).toBe('none');
    expect(
      calculateVerificationFreshness({
        evidence: [{ kind: 'test' } as any],
        mutationGeneration: 2,
        verifiedGeneration: 1,
      } as any)
    ).toBe('stale');
    expect(
      calculateVerificationFreshness({
        evidence: [{ kind: 'test' } as any],
        mutationGeneration: 2,
        verifiedGeneration: 2,
      } as any)
    ).toBe('fresh');
  });

  test('extractTaskConstraints extracts suppressions properly', () => {
    const task = 'Refactor internal helper. Do not plan, no web research, and skip the review.';
    const constraints = extractTaskConstraints(task);
    expect(constraints.suppressPlan).toBe(true);
    expect(constraints.suppressResearch).toBe(true);
    expect(constraints.suppressReview).toBe(true);
    expect(constraints.suppressRelease).toBe(false);
  });

  test('buildReflexEnvelope builds clean envelope and fails closed if task is empty or only a secret', () => {
    const dummyState: FableState = {
      schemaVersion: 3,
      stateRevision: 1,
      workspaceId: 'test-ws',
      phase: 'executing',
      currentSkill: 'fable-execute',
      failureStreak: 0,
      substantial: true,
      mutationGeneration: 1,
      verifiedGeneration: 1,
      activeCard: 'CARD-123',
      lastDecision: dummyRouting,
      evidence: [{ kind: 'test', source: 'bun test', result: 'pass', detail: 'ok', generation: 1, timestamp: '' }],
      updatedAt: new Date().toISOString(),
    };

    const { envelope, failClosed } = buildReflexEnvelope(
      'Fix type error in reflex router',
      dummyState,
      dummyRouting
    );

    expect(failClosed).toBe(false);
    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.task).toBe('Fix type error in reflex router');
    expect(envelope.lifecycle.phase).toBe('executing');
    expect(envelope.lifecycle.failureState).toBe('none');
    expect(envelope.lifecycle.verificationFreshness).toBe('fresh');
    expect(envelope.deterministic.selectedSkill).toBe('fable-execute');

    // Test secret-only task failing closed
    const secretOnly = buildReflexEnvelope('apikey_210569decf6813e44beaa311eb96794fcc0e_36427071762b99e3c58b1f1cebb6015f6567fd15c4f3030d8967f192cb742eff', dummyState, dummyRouting);
    expect(secretOnly.failClosed).toBe(true);
  });
});
