import { describe, expect, test } from 'bun:test';
import { isTargetInScope, validateScope, loadScopeConfig } from '../src/core/redteam/scope.ts';
import type { ScopeConfig } from '../src/core/redteam/types.ts';

describe('RedTeam Scope & Safety Governor', () => {
  const config: ScopeConfig = {
    allowedHosts: ['staging.example.com', '*.dev.example.com', 'localhost', '127.0.0.1'],
    allowedPorts: [80, 443, 3000, 8080],
    allowLocalhost: true,
    safeMode: true,
    excludedPaths: ['/api/admin/reset-db', '/logout'],
  };

  test('accepts exact allowed host', () => {
    expect(isTargetInScope('https://staging.example.com/api/users', config)).toBe(true);
  });

  test('accepts wildcard subdomain match', () => {
    expect(isTargetInScope('https://app.dev.example.com/login', config)).toBe(true);
    expect(isTargetInScope('https://api.v1.dev.example.com/test', config)).toBe(true);
  });

  test('accepts localhost and loopback with allowed port', () => {
    expect(isTargetInScope('http://localhost:3000/health', config)).toBe(true);
    expect(isTargetInScope('http://127.0.0.1:8080/metrics', config)).toBe(true);
  });

  test('rejects unauthorized external domain', () => {
    expect(isTargetInScope('https://production.example.com/api', config)).toBe(false);
    expect(isTargetInScope('https://attacker.com', config)).toBe(false);
  });

  test('rejects disallowed port', () => {
    expect(isTargetInScope('http://localhost:22/ssh', config)).toBe(false);
    expect(isTargetInScope('https://staging.example.com:8443/admin', config)).toBe(false);
  });

  test('rejects excluded sensitive paths', () => {
    expect(isTargetInScope('https://staging.example.com/api/admin/reset-db', config)).toBe(false);
    expect(isTargetInScope('https://staging.example.com/logout', config)).toBe(false);
  });

  test('rejects invalid URL strings fail-closed', () => {
    expect(isTargetInScope('invalid-url', config)).toBe(false);
    expect(isTargetInScope('ftp://staging.example.com', config)).toBe(false);
  });

  test('validateScope throws descriptive error when target is out of scope', () => {
    expect(() => validateScope('https://unauthorized.org', config)).toThrow(/out of allowed scope/i);
  });

  test('loadScopeConfig falls back to safe defaults when no file is present', () => {
    const loaded = loadScopeConfig('/nonexistent/path/redteam.json');
    expect(loaded.allowLocalhost).toBe(true);
    expect(loaded.safeMode).toBe(true);
    expect(loaded.allowedHosts).toContain('localhost');
  });
});
