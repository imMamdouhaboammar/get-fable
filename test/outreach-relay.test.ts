import { describe, expect, test } from 'bun:test';
import type { GitHubDiscussion, GitHubIssue } from '../src/outreach/github.ts';
import { appendPublicationRecord, type PublicationRecord } from '../src/outreach/policy.ts';
import { publishOutreachForIssue, type OutreachGitHubPort } from '../src/outreach/relay.ts';

const NOW = new Date('2026-09-13T12:00:00.000Z');
const REPOSITORY = 'imMamdouhaboammar/get-fable';

function contractBody(overrides: Record<string, unknown> = {}): string {
  const contract = {
    schema: 1,
    candidate: 'obra',
    topicKey: 'lifecycle-gates-vs-advisory-skills',
    discussionTitle: 'RFC: Should skills enforce lifecycle gates?',
    discussionCategory: 'Ideas',
    discussionBodyTemplate: 'I am exploring lifecycle gates. {{candidate}} what trade-offs would you watch?',
    sourceIssuePurpose: 'contribution-opportunity',
    createdBy: 'chatgpt-scheduled-outreach',
    ...overrides,
  };
  return `## Why this matters\n\nConcrete contribution context.\n\n\`\`\`get-fable-outreach-v1\n${JSON.stringify(contract, null, 2)}\n\`\`\``;
}

function issue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    number: 42,
    state: 'open',
    title: 'Contribution opportunity: lifecycle gates',
    body: contractBody(),
    user: { login: 'imMamdouhaboammar' },
    ...overrides,
  };
}

function discussion(overrides: Partial<GitHubDiscussion> = {}): GitHubDiscussion {
  return {
    id: 'D_42',
    number: 123,
    url: 'https://github.com/imMamdouhaboammar/get-fable/discussions/123',
    body: 'I am exploring lifecycle gates. @obra what trade-offs would you watch?\n\n<!-- get-fable-outreach:issue-42 -->',
    createdAt: '2026-09-13T11:59:00Z',
    viewerDidAuthor: true,
    ...overrides,
  };
}

function publishedRecord(overrides: Partial<PublicationRecord> = {}): PublicationRecord {
  return {
    candidate: 'obra',
    topicKey: 'lifecycle-gates-vs-advisory-skills',
    discussionUrl: 'https://github.com/imMamdouhaboammar/get-fable/discussions/100',
    publishedAt: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

function makePort(overrides: Partial<OutreachGitHubPort> = {}) {
  const calls = { create: 0, update: 0, find: 0, list: 0, category: 0 };
  const port: OutreachGitHubPort = {
    getIssue: async () => issue(),
    listOutreachIssues: async () => { calls.list += 1; return []; },
    findDiscussionByIssueMarker: async () => { calls.find += 1; return null; },
    resolveIdeasCategory: async () => { calls.category += 1; return { repositoryId: 'R_1', categoryId: 'C_1' }; },
    createDiscussion: async (_repositoryId, _categoryId, _title, body) => {
      calls.create += 1;
      return discussion({ body });
    },
    updateIssueBody: async () => { calls.update += 1; },
    ...overrides,
  };
  return { port, calls };
}

describe('outreach relay', () => {
  test('rejects a non-canonical repository before side effects', async () => {
    let fetched = false;
    const { port } = makePort({ getIssue: async () => { fetched = true; return issue(); } });
    await expect(publishOutreachForIssue({ client: port, issueNumber: 42, now: NOW, repository: 'someone/fork' })).rejects.toThrow('canonical repository');
    expect(fetched).toBe(false);
  });

  test('requires an open non-PR Issue from the trusted author with the title prefix', async () => {
    const variants: Array<[GitHubIssue, string]> = [
      [issue({ state: 'closed' }), 'open'],
      [issue({ pull_request: {} }), 'Pull Request'],
      [issue({ user: { login: 'external-user' } }), 'trusted author'],
      [issue({ title: 'Please publish this' }), 'title'],
    ];
    for (const [source, message] of variants) {
      const { port } = makePort({ getIssue: async () => source });
      await expect(publishOutreachForIssue({ client: port, issueNumber: 42, now: NOW, repository: REPOSITORY })).rejects.toThrow(message);
    }
  });

  test('rejects outreach to the repository owner', async () => {
    const { port } = makePort({ getIssue: async () => issue({ body: contractBody({ candidate: 'imMamdouhaboammar' }) }) });
    await expect(publishOutreachForIssue({ client: port, issueNumber: 42, now: NOW, repository: REPOSITORY })).rejects.toThrow('repository owner');
  });

  test('short-circuits a valid existing publication marker without creating again', async () => {
    const record = publishedRecord({ discussionUrl: 'https://github.com/imMamdouhaboammar/get-fable/discussions/123' });
    const source = issue({ body: appendPublicationRecord(contractBody(), record) });
    const { port, calls } = makePort({ getIssue: async () => source });
    const result = await publishOutreachForIssue({ client: port, issueNumber: 42, now: NOW, repository: REPOSITORY });
    expect(result).toEqual({ status: 'already-published', discussionUrl: record.discussionUrl });
    expect(calls.create).toBe(0);
    expect(calls.find).toBe(0);
  });

  test('reconciles an existing Discussion marker before cooldown/topic checks', async () => {
    const existing = discussion();
    let updatedBody = '';
    const { port, calls } = makePort({
      findDiscussionByIssueMarker: async () => { calls.find += 1; return existing; },
      updateIssueBody: async (_number, body) => { calls.update += 1; updatedBody = body; },
      listOutreachIssues: async () => { throw new Error('must not run after reconciliation'); },
    });
    const result = await publishOutreachForIssue({ client: port, issueNumber: 42, now: NOW, repository: REPOSITORY });
    expect(result).toEqual({ status: 'reconciled', discussionUrl: existing.url });
    expect(calls.create).toBe(0);
    expect(updatedBody).toContain('Related Discussion:');
    expect(updatedBody).toContain('get-fable-outreach-published-v1');
  });

  test('skips a candidate still inside the 30-day cooldown', async () => {
    const priorBody = appendPublicationRecord('Prior trusted outreach', publishedRecord({ publishedAt: '2026-09-01T12:00:00.000Z' }));
    const prior = issue({ number: 10, state: 'closed', body: priorBody });
    const { port, calls } = makePort({ listOutreachIssues: async () => { calls.list += 1; return [prior]; } });
    const result = await publishOutreachForIssue({ client: port, issueNumber: 42, now: NOW, repository: REPOSITORY });
    expect(result).toEqual({ status: 'skipped', reason: 'candidate-cooldown' });
    expect(calls.category).toBe(0);
    expect(calls.create).toBe(0);
  });

  test('skips a previously published topic key permanently', async () => {
    const priorBody = appendPublicationRecord('Prior trusted outreach', publishedRecord({ candidate: 'different-user', publishedAt: '2026-01-01T00:00:00.000Z' }));
    const prior = issue({ number: 10, state: 'closed', body: priorBody });
    const { port, calls } = makePort({ listOutreachIssues: async () => { calls.list += 1; return [prior]; } });
    const result = await publishOutreachForIssue({ client: port, issueNumber: 42, now: NOW, repository: REPOSITORY });
    expect(result).toEqual({ status: 'skipped', reason: 'duplicate-topic' });
    expect(calls.category).toBe(0);
  });

  test('ignores untrusted Issues when collecting prior publication state', async () => {
    const malicious = issue({ number: 10, user: { login: 'external-user' }, body: '<!-- get-fable-outreach-published-v1\n{nope}\n-->' });
    const { port, calls } = makePort({ listOutreachIssues: async () => { calls.list += 1; return [malicious]; } });
    const result = await publishOutreachForIssue({ client: port, issueNumber: 42, now: NOW, repository: REPOSITORY });
    expect(result.status).toBe('published');
    expect(calls.create).toBe(1);
  });

  test('publishes once, renders one mention, and records the Discussion back on the Issue', async () => {
    let createdBody = '';
    let updatedBody = '';
    const { port, calls } = makePort({
      createDiscussion: async (_repositoryId, _categoryId, _title, body) => {
        calls.create += 1;
        createdBody = body;
        return discussion({ body });
      },
      updateIssueBody: async (_number, body) => { calls.update += 1; updatedBody = body; },
    });

    const result = await publishOutreachForIssue({ client: port, issueNumber: 42, now: NOW, repository: REPOSITORY });
    expect(result).toEqual({ status: 'published', discussionUrl: 'https://github.com/imMamdouhaboammar/get-fable/discussions/123' });
    expect(createdBody.match(/@obra/g)?.length).toBe(1);
    expect(createdBody).toContain('<!-- get-fable-outreach:issue-42 -->');
    expect(updatedBody).toContain('Related Discussion: https://github.com/imMamdouhaboammar/get-fable/discussions/123');
    expect(updatedBody).toContain('"publishedAt":"2026-09-13T11:59:00.000Z"');
    expect(calls.create).toBe(1);
    expect(calls.update).toBe(1);
  });

  test('recovers from Discussion success followed by Issue update failure without a duplicate create', async () => {
    const existing = discussion();
    let existingDiscussion: GitHubDiscussion | null = null;
    let createCount = 0;
    let failUpdate = true;
    const { port } = makePort({
      findDiscussionByIssueMarker: async () => existingDiscussion,
      createDiscussion: async (_repositoryId, _categoryId, _title, body) => {
        createCount += 1;
        existingDiscussion = { ...existing, body };
        return existingDiscussion;
      },
      updateIssueBody: async () => {
        if (failUpdate) throw new Error('transient update failure');
      },
    });

    await expect(publishOutreachForIssue({ client: port, issueNumber: 42, now: NOW, repository: REPOSITORY })).rejects.toThrow('transient update failure');
    expect(createCount).toBe(1);

    failUpdate = false;
    const retry = await publishOutreachForIssue({ client: port, issueNumber: 42, now: NOW, repository: REPOSITORY });
    expect(retry.status).toBe('reconciled');
    expect(createCount).toBe(1);
  });

  test('propagates required GitHub read/category failures instead of creating', async () => {
    const readFailure = makePort({ getIssue: async () => { throw new Error('read failed'); } });
    await expect(publishOutreachForIssue({ client: readFailure.port, issueNumber: 42, now: NOW, repository: REPOSITORY })).rejects.toThrow('read failed');

    const categoryFailure = makePort({ resolveIdeasCategory: async () => { throw new Error('category failed'); } });
    await expect(publishOutreachForIssue({ client: categoryFailure.port, issueNumber: 42, now: NOW, repository: REPOSITORY })).rejects.toThrow('category failed');
    expect(categoryFailure.calls.create).toBe(0);
  });
});
