import { parseOutreachContract, renderDiscussionBody, type OutreachContract } from './contract.ts';
import type { DiscussionCategoryResolution, GitHubDiscussion, GitHubIssue } from './github.ts';
import {
  appendPublicationRecord,
  collectPublicationRecords,
  isCandidateCoolingDown,
  isTopicPreviouslyPublished,
  parsePublicationRecord,
  type PublicationRecord,
} from './policy.ts';

export interface OutreachGitHubPort {
  getIssue(issueNumber: number): Promise<GitHubIssue>;
  listOutreachIssues(): Promise<GitHubIssue[]>;
  findDiscussionByIssueMarker(issueNumber: number): Promise<GitHubDiscussion | null>;
  resolveIdeasCategory(): Promise<DiscussionCategoryResolution>;
  createDiscussion(repositoryId: string, categoryId: string, title: string, body: string): Promise<GitHubDiscussion>;
  updateIssueBody(issueNumber: number, body: string): Promise<void>;
}

export type RelayResult =
  | { status: 'published'; discussionUrl: string }
  | { status: 'reconciled'; discussionUrl: string }
  | { status: 'already-published'; discussionUrl: string }
  | { status: 'skipped'; reason: 'candidate-cooldown' | 'duplicate-topic' };

export type PublishOutreachInput = {
  client: OutreachGitHubPort;
  issueNumber: number;
  now: Date;
  repository: string;
};

const CANONICAL_REPOSITORY = 'imMamdouhaboammar/get-fable';
const REPOSITORY_OWNER = 'imMamdouhaboammar';
const TITLE_PREFIX = 'Contribution opportunity:';
const TRUSTED_AUTHORS = new Set([REPOSITORY_OWNER.toLowerCase()]);
const DISCUSSION_URL_PREFIX = `https://github.com/${CANONICAL_REPOSITORY}/discussions/`;

function fail(message: string): never {
  throw new Error(`Outreach relay: ${message}`);
}

function assertPositiveIssueNumber(issueNumber: number): void {
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    fail('Issue number must be a positive integer');
  }
}

function isPullRequest(issue: GitHubIssue): boolean {
  return Object.prototype.hasOwnProperty.call(issue, 'pull_request');
}

function assertTrustedSourceIssue(issue: GitHubIssue, expectedNumber: number): void {
  if (issue.number !== expectedNumber) fail('authoritative Issue number did not match the event Issue');
  if (isPullRequest(issue)) fail('source must be an Issue, not a Pull Request');
  if (issue.state !== 'open') fail('source Issue must be open');
  if (!TRUSTED_AUTHORS.has(issue.user.login.toLowerCase())) fail('source Issue must have a trusted author');
  if (!issue.title.startsWith(TITLE_PREFIX)) fail(`source Issue title must begin with ${TITLE_PREFIX}`);
}

function assertCanonicalDiscussionUrl(url: string): void {
  if (!url.startsWith(DISCUSSION_URL_PREFIX)) fail('Discussion URL is outside the canonical repository');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return fail('Discussion URL is invalid');
  }
  if (
    parsed.protocol !== 'https:'
    || parsed.hostname !== 'github.com'
    || parsed.search !== ''
    || parsed.hash !== ''
    || !/^\/imMamdouhaboammar\/get-fable\/discussions\/\d+\/?$/.test(parsed.pathname)
  ) {
    fail('Discussion URL is outside the canonical repository');
  }
}

function assertRecordMatchesContract(record: PublicationRecord, contract: OutreachContract): void {
  if (record.candidate.toLowerCase() !== contract.candidate.toLowerCase()) {
    fail('existing publication candidate conflicts with the current contract');
  }
  if (record.topicKey !== contract.topicKey) {
    fail('existing publication topicKey conflicts with the current contract');
  }
  assertCanonicalDiscussionUrl(record.discussionUrl);
}

function normalizeTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) fail('Discussion createdAt is invalid');
  return timestamp.toISOString();
}

function recordForDiscussion(contract: OutreachContract, discussion: GitHubDiscussion): PublicationRecord {
  assertCanonicalDiscussionUrl(discussion.url);
  return {
    candidate: contract.candidate,
    topicKey: contract.topicKey,
    discussionUrl: discussion.url,
    publishedAt: normalizeTimestamp(discussion.createdAt),
  };
}

function sameContract(a: OutreachContract, b: OutreachContract): boolean {
  return a.schema === b.schema
    && a.candidate === b.candidate
    && a.topicKey === b.topicKey
    && a.discussionTitle === b.discussionTitle
    && a.discussionCategory === b.discussionCategory
    && a.discussionBodyTemplate === b.discussionBodyTemplate
    && a.sourceIssuePurpose === b.sourceIssuePurpose
    && a.createdBy === b.createdBy;
}

function isTrustedPriorIssue(issue: GitHubIssue): boolean {
  return !isPullRequest(issue)
    && TRUSTED_AUTHORS.has(issue.user.login.toLowerCase())
    && issue.title.startsWith(TITLE_PREFIX);
}

async function writePublicationRecord(
  client: OutreachGitHubPort,
  issueNumber: number,
  expectedContract: OutreachContract,
  record: PublicationRecord,
): Promise<void> {
  const latestIssue = await client.getIssue(issueNumber);
  assertTrustedSourceIssue(latestIssue, issueNumber);
  const latestContract = parseOutreachContract(latestIssue.body);
  if (!sameContract(latestContract, expectedContract)) {
    fail('source Issue contract changed during publication');
  }
  const nextBody = appendPublicationRecord(latestIssue.body, record);
  if (nextBody !== latestIssue.body) {
    await client.updateIssueBody(issueNumber, nextBody);
  }
}

export async function publishOutreachForIssue(input: PublishOutreachInput): Promise<RelayResult> {
  const { client, issueNumber, now, repository } = input;
  if (repository !== CANONICAL_REPOSITORY) fail('workflow must run only in the canonical repository');
  assertPositiveIssueNumber(issueNumber);
  if (!Number.isFinite(now.getTime())) fail('now must be a valid Date');

  const sourceIssue = await client.getIssue(issueNumber);
  assertTrustedSourceIssue(sourceIssue, issueNumber);
  const contract = parseOutreachContract(sourceIssue.body);
  if (contract.candidate.toLowerCase() === REPOSITORY_OWNER.toLowerCase()) {
    fail('candidate must not be the repository owner');
  }

  const existingRecord = parsePublicationRecord(sourceIssue.body);
  if (existingRecord) {
    assertRecordMatchesContract(existingRecord, contract);
    return { status: 'already-published', discussionUrl: existingRecord.discussionUrl };
  }

  const existingDiscussion = await client.findDiscussionByIssueMarker(issueNumber);
  if (existingDiscussion) {
    const expectedBody = renderDiscussionBody(contract, issueNumber);
    if (existingDiscussion.body !== expectedBody) {
      fail('existing Discussion marker does not match the current outreach contract');
    }
    const record = recordForDiscussion(contract, existingDiscussion);
    await writePublicationRecord(client, issueNumber, contract, record);
    return { status: 'reconciled', discussionUrl: existingDiscussion.url };
  }

  const allIssues = await client.listOutreachIssues();
  const trustedPriorIssues = allIssues.filter((candidateIssue) => candidateIssue.number !== issueNumber && isTrustedPriorIssue(candidateIssue));
  const records = collectPublicationRecords(trustedPriorIssues, issueNumber);

  if (isCandidateCoolingDown(records, contract.candidate, now)) {
    return { status: 'skipped', reason: 'candidate-cooldown' };
  }
  if (isTopicPreviouslyPublished(records, contract.topicKey)) {
    return { status: 'skipped', reason: 'duplicate-topic' };
  }

  const { repositoryId, categoryId } = await client.resolveIdeasCategory();
  const discussionBody = renderDiscussionBody(contract, issueNumber);
  const created = await client.createDiscussion(
    repositoryId,
    categoryId,
    contract.discussionTitle,
    discussionBody,
  );
  if (created.body !== discussionBody) {
    fail('created Discussion body did not match the requested publication body');
  }

  const record = recordForDiscussion(contract, created);
  await writePublicationRecord(client, issueNumber, contract, record);
  return { status: 'published', discussionUrl: created.url };
}
