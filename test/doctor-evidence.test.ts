import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runDoctor } from '../src/core/doctor.ts';
import { getCoreRepoRoot } from '../src/core/skill-registry.ts';

describe('Doctor evidence semantics', () => {
  test('distinguishes structural package checks from fresh behavioral proof', () => {
    const report = runDoctor(getCoreRepoRoot(), getCoreRepoRoot());
    const byId = Object.fromEntries(report.checks.map((item) => [item.id, item]));
    expect(byId['generated-catalog-drift'].status).toBe('PASS');
    expect(byId['skill-package-evals'].status).toBe('PASS');
    expect(byId['skill-package-evals'].message).toContain('structural evidence only');

    // A checked-in evidence file is not enough. Doctor may award PASS only when
    // the current Skill/eval corpus still matches the evidence hashes; otherwise
    // the correct state is NOT_CHECKED until a real provider rerun is captured.
    expect(['PASS', 'NOT_CHECKED']).toContain(byId['behavioral-maturity'].status);
    if (byId['behavioral-maturity'].status === 'NOT_CHECKED') {
      expect(byId['behavioral-maturity'].message).toContain('holdout evidence is NOT_CHECKED');
    }

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
  }, 30000);

  test('passes supply chain checks gracefully when running from packaged npm installation without .github', () => {
    // Simulate an installed npm package root where .github/ is absent
    const repoRoot = getCoreRepoRoot();
    const tempPkgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-npm-sim-'));
    try {
      // Copy minimal structure representing npm package
      const itemsToCopy = [
        'package.json',
        'skills',
        'packs',
        'registry',
        'recipes',
        'schemas',
        'src',
        'hooks',
        'skills.sh.json',
        '.codex-plugin',
        '.claude-plugin',
        'eval',
      ];
      for (const item of itemsToCopy) {
        const src = path.join(repoRoot, item);
        const dst = path.join(tempPkgDir, item);
        if (fs.existsSync(src)) {
          fs.cpSync(src, dst, { recursive: true });
        }
      }
      const report = runDoctor(tempPkgDir, tempPkgDir);
      const byId = Object.fromEntries(report.checks.map((item) => [item.id, item]));
      expect(byId['supply-chain-config'].status).toBe('PASS');
      expect(byId['supply-chain-config'].message).toContain('Packaged npm release');
      expect(byId['security-ci-config'].status).toBe('PASS');
      expect(byId['e2e-ci-config'].status).toBe('PASS');
      expect(byId['github-release-config'].status).toBe('PASS');
      expect(byId['docs-preview-config'].status).toBe('PASS');
      expect(byId['release-runtime-evidence'].status).toBe('NOT_CHECKED');
    } finally {
      fs.rmSync(tempPkgDir, { recursive: true, force: true });
    }
  }, 30000);
});

