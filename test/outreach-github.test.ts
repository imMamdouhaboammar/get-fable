import { describe, expect, test } from 'bun:test';
import { GitHubOutreachClient } from '../src/outreach/github.ts';

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('GitHub outreach client', () => {
  test('re-fetches an Issue through the repository REST boundary with authenticated headers', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = new GitHubOutreachClient({
      token: 'secret-token',
      owner: 'imMamdouhaboammar',
      repo: 'get-fable',
      fetch: async (input, init) => {
        calls.push({ url: String(input), init });
        return jsonResponse({ number: 42, state: 'open', title: 'Contribution opportunity: test', body: 'body', user: { login: 'imMamdouhaboammar' } });
      },
    });

    const issue = await client.getIssue(42);
    expect(issue.number).toBe(42);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://api.github.com/repos/imMamdouhaboammar/get-fable/issues/42');
    expect(calls[0]?.init?.method).toBe('GET');
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get('authorization')).toBe('Bearer secret-token');
    expect(headers.get('accept')).toBe('application/vnd.github+json');
    expect(headers.get('x-github-api-version')).toBe('2022-11-28');
  });

  test('paginates prior Issues using GitHub Link headers', async () => {
    const urls: string[] = [];
    const client = new GitHubOutreachClient({
      token: 'token', owner: 'o', repo: 'r',
      fetch: async (input) => {
        const url = String(input);
        urls.push(url);
        if (url.includes('page=2')) return jsonResponse([{ number: 2, body: 'two', title: 'Contribution opportunity: two', state: 'closed', user: { login: 'o' } }]);
        return jsonResponse([{ number: 1, body: 'one', title: 'Contribution opportunity: one', state: 'open', user: { login: 'o' } }], {
          headers: { link: '<https://api.github.com/repos/o/r/issues?state=all&per_page=100&page=2>; rel="next"' },
        });
      },
    });

    const issues = await client.listOutreachIssues();
    expect(issues.map((issue) => issue.number)).toEqual([1, 2]);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('state=all');
    expect(urls[0]).toContain('per_page=100');
  });

  test('resolves exactly one Ideas category and repository node id', async () => {
    const client = new GitHubOutreachClient({
      token: 'token', owner: 'o', repo: 'r',
      fetch: async (_input, init) => {
        const payload = JSON.parse(String(init?.body));
        expect(payload.query).toContain('discussionCategories');
        expect(payload.variables).toEqual({ owner: 'o', repo: 'r' });
        return jsonResponse({ data: { repository: { id: 'R_1', discussionCategories: { nodes: [{ id: 'C_1', name: 'Ideas' }] } } } });
      },
    });

    expect(await client.resolveIdeasCategory()).toEqual({ repositoryId: 'R_1', categoryId: 'C_1' });
  });

  test('fails closed when Ideas is missing or ambiguous', async () => {
    for (const nodes of [[], [{ id: 'C_1', name: 'Ideas' }, { id: 'C_2', name: 'Ideas' }]]) {
      const client = new GitHubOutreachClient({
        token: 'token', owner: 'o', repo: 'r',
        fetch: async () => jsonResponse({ data: { repository: { id: 'R_1', discussionCategories: { nodes } } } }),
      });
      await expect(client.resolveIdeasCategory()).rejects.toThrow('exactly one Ideas');
    }
  });

  test('finds a relay-authored Discussion by deterministic marker across GraphQL pages', async () => {
    let page = 0;
    const client = new GitHubOutreachClient({
      token: 'token', owner: 'o', repo: 'r',
      fetch: async (_input, init) => {
        const payload = JSON.parse(String(init?.body));
        expect(payload.query).toContain('viewerDidAuthor');
        page += 1;
        if (page === 1) {
          expect(payload.variables.after).toBeNull();
          return jsonResponse({ data: { repository: { discussions: { nodes: [{ id: 'D_old', number: 1, url: 'https://github.com/o/r/discussions/1', body: 'other', createdAt: '2026-08-01T00:00:00.000Z', viewerDidAuthor: false }], pageInfo: { hasNextPage: true, endCursor: 'cursor-1' } } } } });
        }
        expect(payload.variables.after).toBe('cursor-1');
        return jsonResponse({ data: { repository: { discussions: { nodes: [{ id: 'D_42', number: 9, url: 'https://github.com/o/r/discussions/9', body: 'text\n<!-- get-fable-outreach:issue-42 -->', createdAt: '2026-09-01T00:00:00.000Z', viewerDidAuthor: true }], pageInfo: { hasNextPage: false, endCursor: null } } } } });
      },
    });

    const found = await client.findDiscussionByIssueMarker(42);
    expect(found?.url).toBe('https://github.com/o/r/discussions/9');
    expect(page).toBe(2);
  });

  test('ignores marker squatting by Discussions not authored by the authenticated relay viewer', async () => {
    const client = new GitHubOutreachClient({
      token: 'token', owner: 'o', repo: 'r',
      fetch: async () => jsonResponse({ data: { repository: { discussions: {
        nodes: [{ id: 'D_attacker', number: 7, url: 'https://github.com/o/r/discussions/7', body: '<!-- get-fable-outreach:issue-42 -->', createdAt: '2026-09-01T00:00:00.000Z', viewerDidAuthor: false }],
        pageInfo: { hasNextPage: false, endCursor: null },
      } } } }),
    });
    expect(await client.findDiscussionByIssueMarker(42)).toBeNull();
  });

  test('fails closed if multiple relay-authored Discussions contain the same marker', async () => {
    const nodes = [1, 2].map((number) => ({
      id: `D_${number}`,
      number,
      url: `https://github.com/o/r/discussions/${number}`,
      body: '<!-- get-fable-outreach:issue-42 -->',
      createdAt: '2026-09-01T00:00:00.000Z',
      viewerDidAuthor: true,
    }));
    const client = new GitHubOutreachClient({
      token: 'token', owner: 'o', repo: 'r',
      fetch: async () => jsonResponse({ data: { repository: { discussions: { nodes, pageInfo: { hasNextPage: false, endCursor: null } } } } }),
    });
    await expect(client.findDiscussionByIssueMarker(42)).rejects.toThrow('multiple relay-authored');
  });

  test('creates a Discussion with static GraphQL source and untrusted values only in variables', async () => {
    const title = 'RFC: title with $ and braces { unsafe }';
    const body = 'Question body @candidate';
    const client = new GitHubOutreachClient({
      token: 'token', owner: 'o', repo: 'r',
      fetch: async (_input, init) => {
        const payload = JSON.parse(String(init?.body));
        expect(payload.query).toContain('mutation CreateOutreachDiscussion');
        expect(payload.query).not.toContain(title);
        expect(payload.query).not.toContain(body);
        expect(payload.variables).toEqual({ repositoryId: 'R_1', categoryId: 'C_1', title, body });
        return jsonResponse({ data: { createDiscussion: { discussion: { id: 'D_1', number: 123, url: 'https://github.com/o/r/discussions/123', body, createdAt: '2026-09-13T12:00:00.000Z', viewerDidAuthor: true } } } });
      },
    });

    const created = await client.createDiscussion('R_1', 'C_1', title, body);
    expect(created.number).toBe(123);
    expect(created.body).toBe(body);
    expect(created.viewerDidAuthor).toBe(true);
  });

  test('updates only the Issue body with PATCH', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = new GitHubOutreachClient({
      token: 'token', owner: 'o', repo: 'r',
      fetch: async (input, init) => {
        calls.push({ url: String(input), init });
        return jsonResponse({ number: 42, body: 'new body', title: 't', state: 'open', user: { login: 'o' } });
      },
    });

    await client.updateIssueBody(42, 'new body');
    expect(calls[0]?.init?.method).toBe('PATCH');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ body: 'new body' });
  });

  test('surfaces REST and GraphQL failures instead of publishing through uncertainty', async () => {
    const restFailure = new GitHubOutreachClient({
      token: 'token', owner: 'o', repo: 'r', fetch: async () => jsonResponse({ message: 'denied' }, { status: 403 }),
    });
    await expect(restFailure.getIssue(1)).rejects.toThrow('403');

    const graphqlFailure = new GitHubOutreachClient({
      token: 'token', owner: 'o', repo: 'r', fetch: async () => jsonResponse({ errors: [{ message: 'forbidden detail' }] }),
    });
    await expect(graphqlFailure.resolveIdeasCategory()).rejects.toThrow('GraphQL');
  });
});
