export type PublicationRecord = {
  candidate: string;
  topicKey: string;
  discussionUrl: string;
  publishedAt: string;
};

export type PublicationSourceIssue = {
  number: number;
  body: string;
};

const PUBLISHED_SENTINEL = 'get-fable-outreach-published-v1';
const PUBLISHED_BLOCK = /<!-- get-fable-outreach-published-v1\s*\n([\s\S]*?)\n-->/g;
const PUBLICATION_KEYS = ['candidate', 'topicKey', 'discussionUrl', 'publishedAt'] as const;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function fail(message: string): never {
  throw new Error(`Invalid outreach publication record: ${message}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fail(`${field} must be a non-empty string`);
  }
  if (value.length > max) {
    return fail(`${field} exceeds maximum length ${max}`);
  }
  return value;
}

function validateRecord(value: unknown): PublicationRecord {
  if (!isPlainObject(value)) {
    fail('publication record must be an object');
  }

  const allowed = new Set<string>(PUBLICATION_KEYS);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`unexpected publication record key: ${key}`);
  }
  for (const key of PUBLICATION_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail(`missing publication record field: ${key}`);
    }
  }

  const candidate = requireString(value.candidate, 'candidate', 39);
  const topicKey = requireString(value.topicKey, 'topicKey', 120);
  const discussionUrl = requireString(value.discussionUrl, 'discussionUrl', 500);
  const publishedAt = requireString(value.publishedAt, 'publishedAt', 64);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(discussionUrl);
  } catch {
    return fail('discussionUrl must be a valid URL');
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'github.com' || !/\/discussions\/\d+\/?$/.test(parsedUrl.pathname)) {
    fail('discussionUrl must be an HTTPS GitHub Discussion URL');
  }

  const timestamp = new Date(publishedAt);
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString() !== publishedAt) {
    fail('publishedAt must be a canonical ISO timestamp');
  }

  return { candidate, topicKey, discussionUrl, publishedAt };
}

function sameRecord(a: PublicationRecord, b: PublicationRecord): boolean {
  return a.candidate === b.candidate
    && a.topicKey === b.topicKey
    && a.discussionUrl === b.discussionUrl
    && a.publishedAt === b.publishedAt;
}

export function discussionIssueMarker(issueNumber: number): string {
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('Issue number must be a positive integer');
  }
  return `<!-- get-fable-outreach:issue-${issueNumber} -->`;
}

export function parsePublicationRecord(body: string): PublicationRecord | null {
  const hasSentinel = body.includes(PUBLISHED_SENTINEL);
  const matches = [...body.matchAll(PUBLISHED_BLOCK)];

  if (!hasSentinel && matches.length === 0) return null;
  if (matches.length !== 1) {
    fail('body must contain exactly one publication record marker');
  }

  const rawJson = matches[0]?.[1];
  if (!rawJson) fail('publication record must contain valid JSON');

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return fail('publication record must contain valid JSON');
  }

  return validateRecord(parsed);
}

export function appendPublicationRecord(body: string, record: PublicationRecord): string {
  const validated = validateRecord(record);
  const existing = parsePublicationRecord(body);
  if (existing) {
    if (sameRecord(existing, validated)) return body;
    throw new Error('Outreach publication record conflict');
  }

  const separator = body.endsWith('\n') ? '\n' : '\n\n';
  const marker = `<!-- ${PUBLISHED_SENTINEL}\n${JSON.stringify(validated)}\n-->`;
  return `${body}${separator}Related Discussion: ${validated.discussionUrl}\n\n${marker}`;
}

export function isCandidateCoolingDown(
  records: readonly PublicationRecord[],
  candidate: string,
  now: Date,
): boolean {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) throw new Error('now must be a valid Date');
  const normalizedCandidate = candidate.toLowerCase();

  return records.some((record) => {
    if (record.candidate.toLowerCase() !== normalizedCandidate) return false;
    const publishedMs = new Date(record.publishedAt).getTime();
    if (!Number.isFinite(publishedMs)) fail('publishedAt must be a valid timestamp');
    const age = nowMs - publishedMs;
    return age >= 0 && age < THIRTY_DAYS_MS;
  });
}

export function isTopicPreviouslyPublished(
  records: readonly PublicationRecord[],
  topicKey: string,
): boolean {
  return records.some((record) => record.topicKey === topicKey);
}

export function collectPublicationRecords(
  issues: readonly PublicationSourceIssue[],
  currentIssueNumber: number,
): PublicationRecord[] {
  if (!Number.isSafeInteger(currentIssueNumber) || currentIssueNumber <= 0) {
    throw new Error('Current Issue number must be a positive integer');
  }

  const records: PublicationRecord[] = [];
  for (const issue of issues) {
    if (issue.number === currentIssueNumber) continue;
    const record = parsePublicationRecord(issue.body);
    if (record) records.push(record);
  }
  return records;
}
