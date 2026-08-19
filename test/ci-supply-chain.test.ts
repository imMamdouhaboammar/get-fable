import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dir, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf-8');

describe('CI and release supply-chain contract', () => {
  test('pins every third-party GitHub Action to a full commit SHA', () => {
    const workflowDir = path.join(root, '.github', 'workflows');
    for (const name of fs.readdirSync(workflowDir).filter((item) => /\.ya?ml$/.test(item))) {
      const file = path.join('.github', 'workflows', name);
      const text = read(file);
      const uses = [...text.matchAll(/uses:\s+[^@\s]+@([^\s#]+)/g)].map((match) => match[1]);
      expect(uses.length).toBeGreaterThan(0);
      expect(uses.every((ref) => /^[0-9a-f]{40}$/.test(ref))).toBe(true);
    }
  });

  test('uses frozen Bun resolution and least-privilege OIDC only in the publish job', () => {
    expect(read('.github/workflows/ci.yml')).toContain('bun install --frozen-lockfile');
    const release = read('.github/workflows/release.yml');
    expect(release).toContain('id-token: write');
    expect(release).toContain('environment: npm');
    expect(release).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/);
    expect(release).not.toContain('--provenance');
  });

  test('maintains npm and GitHub Actions dependencies with Dependabot', () => {
    const config = read('.github/dependabot.yml');
    expect(config).toContain('package-ecosystem: npm');
    expect(config).toContain('package-ecosystem: github-actions');
  });

  test('creates GitHub Releases from version tags with the pinned GH Release action', () => {
    const workflow = read('.github/workflows/github-release.yml');
    expect(workflow).toContain('tags:');
    expect(workflow).toContain("- 'v*'");
    expect(workflow).toContain('softprops/action-gh-release@3d0d9888cb7fd7b750713d6e236d1fcb99157228 # v3.0.2');
    expect(workflow).toContain('contents: write');
    expect(workflow).toContain('generate_release_notes: true');
    expect(workflow).toContain('draft: true');
  });

  test('runs pinned TruffleHog secret scanning in the security workflow', () => {
    const security = read('.github/workflows/security.yml');
    expect(security).toContain('trufflesecurity/trufflehog@bcfcf73aaf4759d4dadc2783177c245a02792318 # v3.97.0');
    expect(security).toContain('version: 3.97.0');
  });


  test('runs pinned Cypress end-to-end smoke tests against the static site', () => {
    const workflow = read('.github/workflows/e2e.yml');
    expect(workflow).toContain('cypress-io/github-action@c32f12761482a282d24ca0fd7466d8ae86f54ba8 # v7.4.2');
    expect(workflow).toContain('start: bun run serve:web');
    expect(workflow).toContain('wait-on: http://127.0.0.1:3000');
    expect(read('package.json')).toContain('"cypress"');
    expect(fs.existsSync(path.join(root, 'cypress', 'e2e', 'site.cy.ts'))).toBe(true);
    expect(read('cypress.config.ts')).toContain('allowCypressEnv: false');
  });

  test('keeps Markdown Docs as a manual non-gating preview with a pinned action', () => {
    const workflow = read('.github/workflows/docs-preview.yml');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('pull_request:');
    expect(workflow).not.toContain('branches: [master]');
    expect(workflow).toContain('ldeluigi/markdown-docs@01d0562f5d6aa4ca4af7ded0c98f239417d5976b # v0.6.0');
    expect(workflow).toContain('src: docs');
    expect(workflow).toContain('dst: .generated/markdown-docs');
  });

});
