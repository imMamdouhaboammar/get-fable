import { describe, expect, test } from 'bun:test';
import { runDoctor } from '../src/core/doctor.ts';
import { getCoreRepoRoot } from '../src/core/skill-registry.ts';

describe('Doctor evidence semantics', () => {
  test('distinguishes structural package checks from unchecked behavioral proof', () => {
    const report = runDoctor(getCoreRepoRoot(), getCoreRepoRoot());
    const byId = Object.fromEntries(report.checks.map((item) => [item.id, item]));
    expect(byId['generated-catalog-drift'].status).toBe('PASS');
    expect(byId['skill-package-evals'].status).toBe('PASS');
    expect(byId['skill-package-evals'].message).toContain('structural evidence only');
    expect(byId['behavioral-maturity'].status).toBe('NOT_CHECKED');
    expect(byId['host-parity'].status).toBe('PASS');
    expect(byId['schema-runtime-parity'].status).toBe('PASS');
    expect(byId['distribution-contract'].status).toBe('PASS');
    expect(byId['supply-chain-config'].status).toBe('PASS');
    expect(byId['security-ci-config'].status).toBe('PASS');
    expect(byId['security-ci-config'].message).toContain('TruffleHog');
    expect(byId['e2e-ci-config'].status).toBe('PASS');
    expect(byId['github-release-config'].status).toBe('PASS');
    expect(byId['github-release-config'].message).toContain('draft');
    expect(byId['docs-preview-config'].status).toBe('PASS');
    expect(byId['release-runtime-evidence'].status).toBe('NOT_CHECKED');
    expect(report.ok).toBe(true);
  });
});
