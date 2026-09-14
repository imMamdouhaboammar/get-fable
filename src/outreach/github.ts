import { discussionIssueMarker } from './policy.js';

export type FetchLike = typeof fetch;

export type GitHubIssue = {
  number: number;
  state: string;
  title: string;
  body: string;
  user: { login: string };
  pull_request?: unknown;
};

export type GitHubDiscussion = {
  id: string;
  number: number;
  url: string;
  body: string;
  createdAt: string;
  viewerDidAuthor: boolean;
};

export type DiscussionCategoryResolution = {
  repositoryId: string;
  categoryId: string;
};

export type GitHubOutreachClientOptions = {
  token: string;
  owner: string;
  repo: string;
  fetch?: FetchLike;
};

type DiscussionConnectionPage = {
  nodes?: unknown;
  pageInfo?: { hasNextPage?: unknown; endCursor?: unknown };
};

type DiscussionsData = {
  repository?: { discussions?: DiscussionConnectionPage } | null;
};

const API_VERSION = '2022-11-28';
const MAX_REST_PAGES = 20;
const MAX_GRAPHQL_PAGES = 20;

const CATEGORY_QUERY = `
query OutreachDiscussionCategory($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    id
    discussionCategories(first: 100) {
      nodes { id name }
    }
  }
}`;

const DISCUSSIONS_QUERY = `
query OutreachDiscussions($owner: String!, $repo: String!, $after: String) {
  repository(owner: $owner, name: $repo) {
    discussions(first: 100, after: $after, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes { id number url body createdAt viewerDidAuthor }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

const CREATE_DISCUSSION_MUTATION = `
mutation CreateOutreachDiscussion($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
  createDiscussion(input: {repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body}) {
    discussion { id number url body createdAt viewerDidAuthor }
  }
}`;

function fail(message: string): never {
  throw new Error(`GitHub outreach client: ${message}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(`${name} is missing`);
  return value;
}

function requirePositiveInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) fail(`${name} must be a positive integer`);
  return value as number;
}

function normalizeIssue(value: unknown): GitHubIssue {
  if (!isObject(value) || !isObject(value.user)) fail('received malformed Issue data');
  const number = requirePositiveInteger(value.number, 'Issue number');
  const state = requireString(value.state, 'Issue state');
  const title = requireString(value.title, 'Issue title');
  const login = requireString(value.user.login, 'Issue author');
  const body = value.body === null || value.body === undefined ? '' : requireString(value.body, 'Issue body');
  const issue: GitHubIssue = { number, state, title, body, user: { login } };
  if (Object.prototype.hasOwnProperty.call(value, 'pull_request')) issue.pull_request = value.pull_request;
  return issue;
}

function normalizeDiscussion(value: unknown): GitHubDiscussion {
  if (!isObject(value)) fail('received malformed Discussion data');
  if (typeof value.viewerDidAuthor !== 'boolean') fail('Discussion viewerDidAuthor is missing');
  return {
    id: requireString(value.id, 'Discussion id'),
    number: requirePositiveInteger(value.number, 'Discussion number'),
    url: requireString(value.url, 'Discussion URL'),
    body: requireString(value.body, 'Discussion body'),
    createdAt: requireString(value.createdAt, 'Discussion createdAt'),
    viewerDidAuthor: value.viewerDidAuthor,
  };
}

function hasNextLink(link: string | null): boolean {
  return link !== null && /<[^>]+>;\s*rel="next"/.test(link);
}

export class GitHubOutreachClient {
  private readonly token: string;
  private readonly owner: string;
  private readonly repo: string;
  private readonly fetchImpl: FetchLike;
  private readonly restBase: string;

  constructor(options: GitHubOutreachClientOptions) {
    this.token = requireString(options.token, 'token');
    this.owner = requireString(options.owner, 'owner');
    this.repo = requireString(options.repo, 'repo');
    this.fetchImpl = options.fetch ?? fetch;
    this.restBase = `https://api.github.com/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`;
  }

  private headers(extra: HeadersInit = {}): Headers {
    const headers = new Headers(extra);
    headers.set('Accept', 'application/vnd.github+json');
    headers.set('Authorization', `Bearer ${this.token}`);
    headers.set('X-GitHub-Api-Version', API_VERSION);
    headers.set('User-Agent', 'get-fable-outreach-relay');
    return headers;
  }

  private async rest(path: string, init: RequestInit = {}): Promise<Response> {
    const response = await this.fetchImpl(`${this.restBase}${path}`, {
      ...init,
      method: init.method ?? 'GET',
      headers: this.headers(init.headers),
      redirect: 'error',
    });
    if (!response.ok) fail(`REST request failed with status ${response.status}`);
    return response;
  }

  private async graphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await this.fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: this.headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({ query, variables }),
      redirect: 'error',
    });
    if (!response.ok) fail(`GraphQL HTTP request failed with status ${response.status}`);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return fail('GraphQL response was not valid JSON');
    }
    if (!isObject(payload)) fail('GraphQL response was malformed');
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      fail('GraphQL returned one or more errors');
    }
    if (!Object.prototype.hasOwnProperty.call(payload, 'data')) fail('GraphQL response did not contain data');
    return payload.data as T;
  }

  async getIssue(issueNumber: number): Promise<GitHubIssue> {
    requirePositiveInteger(issueNumber, 'Issue number');
    const response = await this.rest(`/issues/${issueNumber}`);
    return normalizeIssue(await response.json());
  }

  async listOutreachIssues(): Promise<GitHubIssue[]> {
    const issues: GitHubIssue[] = [];
    for (let page = 1; page <= MAX_REST_PAGES; page += 1) {
      const response = await this.rest(`/issues?state=all&per_page=100&page=${page}`);
      const payload = await response.json();
      if (!Array.isArray(payload)) fail('Issue list response was malformed');
      for (const item of payload) issues.push(normalizeIssue(item));

      if (!hasNextLink(response.headers.get('link'))) return issues;
      if (page === MAX_REST_PAGES) fail('Issue pagination exceeded the safety bound');
    }
    return issues;
  }

  async resolveIdeasCategory(): Promise<DiscussionCategoryResolution> {
    type CategoryData = {
      repository?: {
        id?: unknown;
        discussionCategories?: { nodes?: unknown };
      } | null;
    };
    const data: CategoryData = await this.graphQL<CategoryData>(CATEGORY_QUERY, { owner: this.owner, repo: this.repo });
    const repository = data.repository;
    if (!repository || !Array.isArray(repository.discussionCategories?.nodes)) {
      return fail('could not resolve Discussion categories');
    }

    const ideas = repository.discussionCategories.nodes.filter((node) => isObject(node) && node.name === 'Ideas');
    if (ideas.length !== 1 || !isObject(ideas[0])) {
      fail('expected exactly one Ideas Discussion category');
    }

    return {
      repositoryId: requireString(repository.id, 'repository id'),
      categoryId: requireString(ideas[0].id, 'Ideas category id'),
    };
  }

  async findDiscussionByIssueMarker(issueNumber: number): Promise<GitHubDiscussion | null> {
    const marker = discussionIssueMarker(issueNumber);
    const matches: GitHubDiscussion[] = [];
    let after: string | null = null;

    for (let page = 1; page <= MAX_GRAPHQL_PAGES; page += 1) {
      const data: DiscussionsData = await this.graphQL<DiscussionsData>(DISCUSSIONS_QUERY, {
        owner: this.owner,
        repo: this.repo,
        after,
      });
      const connection: DiscussionConnectionPage | undefined = data.repository?.discussions;
      if (!connection || !Array.isArray(connection.nodes) || !isObject(connection.pageInfo)) {
        return fail('Discussion list response was malformed');
      }

      for (const node of connection.nodes) {
        const discussion = normalizeDiscussion(node);
        if (discussion.body.includes(marker) && discussion.viewerDidAuthor) {
          matches.push(discussion);
          if (matches.length > 1) fail('multiple relay-authored Discussions contain the same source-Issue marker');
        }
      }

      const hasNextPage = connection.pageInfo.hasNextPage;
      if (hasNextPage === false) return matches[0] ?? null;
      if (hasNextPage !== true || typeof connection.pageInfo.endCursor !== 'string' || connection.pageInfo.endCursor.length === 0) {
        return fail('Discussion pagination state was malformed');
      }
      after = connection.pageInfo.endCursor;
      if (page === MAX_GRAPHQL_PAGES) fail('Discussion pagination exceeded the safety bound');
    }
    return null;
  }

  async createDiscussion(
    repositoryId: string,
    categoryId: string,
    title: string,
    body: string,
  ): Promise<GitHubDiscussion> {
    const variables = {
      repositoryId: requireString(repositoryId, 'repository id'),
      categoryId: requireString(categoryId, 'category id'),
      title: requireString(title, 'Discussion title'),
      body: requireString(body, 'Discussion body'),
    };
    type CreateData = { createDiscussion?: { discussion?: unknown } | null };
    const data: CreateData = await this.graphQL<CreateData>(CREATE_DISCUSSION_MUTATION, variables);
    const discussion = data.createDiscussion?.discussion;
    if (!discussion) return fail('createDiscussion did not return a Discussion');
    return normalizeDiscussion(discussion);
  }

  async updateIssueBody(issueNumber: number, body: string): Promise<void> {
    requirePositiveInteger(issueNumber, 'Issue number');
    requireString(body, 'Issue body');
    await this.rest(`/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body }),
    });
  }
}
