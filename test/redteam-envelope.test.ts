import { describe, expect, test } from 'bun:test';
import {
  buildExecutionEnvelope,
  createSanitizedEnv,
  validateEnvelopeTarget,
} from '../src/core/redteam/envelope.ts';

describe('RedTeam ExecutionEnvelope Sandboxing & Credential Hygiene', () => {
  test('createSanitizedEnv aggressively strips secrets and repository credentials', () => {
    const dirtyEnv = {
      PATH: '/usr/bin:/bin',
      USER: 'tester',
      HOME: '/Users/tester',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOi...',
      SUPABASE_KEY: 'super-secret-key',
      AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
      AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      GITHUB_TOKEN: 'ghp_exampletoken123456789',
      OPENAI_API_KEY: 'sk-1234567890abcdef',
      DATABASE_URL: 'postgres://admin:pwd@127.0.0.1:5432/db',
      STRIPE_WEBHOOK_SECRET: 'whsec_9999',
      CUSTOM_CLIENT_TOKEN: 'token-val',
      CUSTOM_APP_PASSWORD: 'password-val',
      SAFE_CONFIG_SETTING: 'development-mode',
    };

    const sanitized = createSanitizedEnv(dirtyEnv);

    // Assert sensitive variables are completely purged
    expect(sanitized.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(sanitized.SUPABASE_KEY).toBeUndefined();
    expect(sanitized.AWS_ACCESS_KEY_ID).toBeUndefined();
    expect(sanitized.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(sanitized.GITHUB_TOKEN).toBeUndefined();
    expect(sanitized.OPENAI_API_KEY).toBeUndefined();
    expect(sanitized.DATABASE_URL).toBeUndefined();
    expect(sanitized.STRIPE_WEBHOOK_SECRET).toBeUndefined();
    expect(sanitized.CUSTOM_CLIENT_TOKEN).toBeUndefined();
    expect(sanitized.CUSTOM_APP_PASSWORD).toBeUndefined();

    // Assert safe environment variables are preserved
    expect(sanitized.PATH).toBe('/usr/bin:/bin');
    expect(sanitized.USER).toBe('tester');
    expect(sanitized.SAFE_CONFIG_SETTING).toBe('development-mode');
    expect(sanitized.FABLE_REDTEAM_SANDBOX).toBe('1');
  });

  test('validateEnvelopeTarget enforces allowed protocols, hosts, and ports fail-closed', () => {
    const envelope = buildExecutionEnvelope({
      allowedHosts: ['127.0.0.1', 'localhost', 'staging.app.example.com'],
      allowedPorts: [3000, 8080],
    });

    // Valid target
    expect(validateEnvelopeTarget('http://127.0.0.1:3000', envelope).allowed).toBe(true);
    expect(validateEnvelopeTarget('http://localhost:8080/api/v1', envelope).allowed).toBe(true);

    // Disallowed port
    const badPort = validateEnvelopeTarget('http://127.0.0.1:5432', envelope);
    expect(badPort.allowed).toBe(false);
    expect(badPort.reason).toContain('Port 5432');

    // Disallowed external host
    const badHost = validateEnvelopeTarget('http://unauthorized-evil.com:3000', envelope);
    expect(badHost.allowed).toBe(false);
    expect(badHost.reason).toContain('not in the ExecutionEnvelope allowedHosts');

    // Malformed URL
    const malformed = validateEnvelopeTarget('not-a-valid-url', envelope);
    expect(malformed.allowed).toBe(false);
  });
});
