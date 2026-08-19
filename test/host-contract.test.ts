import { describe, expect, test } from 'bun:test';
import { HOST_CONTRACTS } from '../src/core/host-contract.ts';

describe('supported host capability contract', () => {
  test('does not claim hook parity for hosts whose installers only copy rules or packages', () => {
    const byId = Object.fromEntries(HOST_CONTRACTS.map((host) => [host.id, host]));
    expect(byId.claude.level).toBe('FULL');
    expect(byId.antigravity.level).toBe('FULL');
    expect(byId.codex.level).toBe('PARTIAL');
    expect(byId.codex.hooksRegistered).toBe(false);
    expect(byId.cursor.level).toBe('ADVISORY');
    expect(byId.kiro.hooksRegistered).toBe(false);
  });
  test('FULL hosts prove package and completion enforcement capability in the declared contract', () => {
    for (const host of HOST_CONTRACTS.filter((item) => item.level === 'FULL')) {
      expect(host.packages).toBe(true);
      expect(host.nestedResources).toBe(true);
      expect(host.hooksRegistered).toBe(true);
      expect(host.mutationDetection).toBe(true);
      expect(host.completionGuard).toBe(true);
    }
  });
});
