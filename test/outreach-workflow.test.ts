import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const workflowPath = new URL('../.github/workflows/publish-outreach-discussion.yml', import.meta.url);
const workflow = readFileSync(workflowPath, 'utf8');

describe('outreach workflow contract', () => {
  test('runs only for newly opened Issues', () => {
    expect(workflow).toMatch(/on:\s*\n\s+issues:\s*\n\s+types:\s*\[opened\]/);
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('workflow_dispatch');
    expect(workflow).not.toContain('repository_dispatch');
  });

  test('uses only the required repository permissions', () => {
    expect(workflow).toMatch(/permissions:\s*\n\s+contents: read\s*\n\s+issues: write\s*\n\s+discussions: write/);
    expect(workflow).not.toContain('actions: write');
    expect(workflow).not.toContain('pull-requests: write');
  });

  test('cheap-gates execution to the canonical repository and trusted owner', () => {
    expect(workflow).toContain("github.repository == 'imMamdouhaboammar/get-fable'");
    expect(workflow).toContain("github.event.issue.user.login == 'imMamdouhaboammar'");
  });

  test('serializes outreach publication to close cross-Issue dedupe races', () => {
    expect(workflow).toMatch(/concurrency:\s*\n\s+group: get-fable-outreach-publication\s*\n\s+cancel-in-progress: false/);
  });

  test('pins third-party Actions to full commit SHAs', () => {
    const uses = [...workflow.matchAll(/uses:\s*([^\s]+)/g)].map((match) => match[1] ?? '');
    expect(uses.length).toBeGreaterThanOrEqual(2);
    for (const action of uses) {
      expect(action).toMatch(/^[^@]+@[0-9a-f]{40}$/);
    }
  });

  test('runs the tested TypeScript relay without interpolating Issue content into shell', () => {
    expect(workflow).toContain('bun install --frozen-lockfile');
    expect(workflow).toContain('bun scripts/publish-outreach-discussion.ts');
    expect(workflow).not.toContain('github.event.issue.body');
    expect(workflow).not.toContain('github.event.issue.title');
  });
});
