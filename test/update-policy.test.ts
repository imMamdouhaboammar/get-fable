import { describe, expect, test } from 'bun:test';
import { decidePassiveCheck, type PassiveCheckContext } from '../src/core/update/policy.ts';

function context(overrides: Partial<PassiveCheckContext> = {}): PassiveCheckContext {
  return {
    autoCheck: true,
    cacheFresh: false,
    isCI: false,
    isTTY: true,
    jsonMode: false,
    jsonV1Mode: false,
    command: 'status',
    ...overrides,
  };
}

describe('passive update invocation policy', () => {
  test('allows ordinary interactive stale-cache invocations', () => {
    expect(decidePassiveCheck(context())).toEqual({
      allowed: true,
      reason: 'interactive-stale-cache',
    });
  });

  test('suppresses passive work when automatic checks are disabled', () => {
    expect(decidePassiveCheck(context({ autoCheck: false })).allowed).toBe(false);
  });

  test('suppresses passive work for a fresh validated cache', () => {
    expect(decidePassiveCheck(context({ cacheFresh: true }))).toEqual({
      allowed: false,
      reason: 'fresh-cache',
    });
  });

  test('suppresses passive work in CI before any network acquisition', () => {
    expect(decidePassiveCheck(context({ isCI: true }))).toEqual({
      allowed: false,
      reason: 'ci',
    });
  });

  test('suppresses passive work for non-TTY invocations', () => {
    expect(decidePassiveCheck(context({ isTTY: false }))).toEqual({
      allowed: false,
      reason: 'non-tty',
    });
  });

  test('suppresses passive work for legacy JSON machine output', () => {
    expect(decidePassiveCheck(context({ jsonMode: true }))).toEqual({
      allowed: false,
      reason: 'machine-output',
    });
  });

  test('suppresses passive work for JSON-v1 machine output', () => {
    expect(decidePassiveCheck(context({ jsonV1Mode: true }))).toEqual({
      allowed: false,
      reason: 'machine-output',
    });
  });

  test('suppresses passive work around explicit updater and announcement commands', () => {
    for (const command of ['update', 'announcements']) {
      expect(decidePassiveCheck(context({ command }))).toEqual({
        allowed: false,
        reason: 'explicit-update-channel',
      });
    }
  });

  test('machine and CI suppression win over stale-cache eligibility', () => {
    expect(
      decidePassiveCheck(
        context({
          cacheFresh: false,
          isCI: true,
          isTTY: true,
          jsonMode: true,
        })
      ).allowed
    ).toBe(false);
  });
});
