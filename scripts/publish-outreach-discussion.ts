import { readFile } from 'node:fs/promises';
import { GitHubOutreachClient } from '../src/outreach/github.ts';
import { publishOutreachForIssue } from '../src/outreach/relay.ts';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseRepository(value: string): { owner: string; repo: string } {
  const parts = value.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('GITHUB_REPOSITORY must be in owner/repo form');
  }
  return { owner: parts[0], repo: parts[1] };
}

function parseIssueNumber(event: unknown): number {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error('GitHub event payload must be an object');
  }
  const value = event as Record<string, unknown>;
  if (value.action !== 'opened') throw new Error('GitHub event action must be opened');
  const issue = value.issue;
  if (!issue || typeof issue !== 'object' || Array.isArray(issue)) {
    throw new Error('GitHub event payload is missing issue data');
  }
  const issueNumber = (issue as Record<string, unknown>).number;
  if (!Number.isSafeInteger(issueNumber) || (issueNumber as number) <= 0) {
    throw new Error('GitHub event Issue number must be a positive integer');
  }
  return issueNumber as number;
}

export async function main(): Promise<void> {
  const token = requireEnv('GITHUB_TOKEN');
  const repository = requireEnv('GITHUB_REPOSITORY');
  const eventPath = requireEnv('GITHUB_EVENT_PATH');
  const { owner, repo } = parseRepository(repository);

  const rawEvent = await readFile(eventPath, 'utf8');
  let event: unknown;
  try {
    event = JSON.parse(rawEvent);
  } catch {
    throw new Error('GitHub event payload is not valid JSON');
  }

  const issueNumber = parseIssueNumber(event);
  const client = new GitHubOutreachClient({ token, owner, repo });
  const result = await publishOutreachForIssue({
    client,
    issueNumber,
    now: new Date(),
    repository,
  });

  const suffix = result.status === 'skipped' ? ` (${result.reason})` : '';
  console.log(`Outreach relay result: ${result.status}${suffix}`);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'unknown failure';
    console.error(`Outreach relay failed: ${message}`);
    process.exitCode = 1;
  });
}
