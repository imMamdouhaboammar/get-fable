export type OutreachContract = {
  schema: 1;
  candidate: string;
  topicKey: string;
  discussionTitle: string;
  discussionCategory: 'Ideas';
  discussionBodyTemplate: string;
  sourceIssuePurpose: 'contribution-opportunity';
  createdBy: 'chatgpt-scheduled-outreach';
};

const CONTRACT_KEYS = [
  'schema',
  'candidate',
  'topicKey',
  'discussionTitle',
  'discussionCategory',
  'discussionBodyTemplate',
  'sourceIssuePurpose',
  'createdBy',
] as const;

const CONTRACT_BLOCK = /```get-fable-outreach-v1\s*\n([\s\S]*?)\n```/g;
const CANDIDATE_RE = /^(?!.*--)[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const TOPIC_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GITHUB_MENTION_RE = /(^|[^A-Za-z0-9_.+\-])@([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)(?![A-Za-z0-9-])/g;

function fail(message: string): never {
  throw new Error(`Invalid outreach contract: ${message}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(
  value: unknown,
  field: string,
  options: { max: number; exact?: string } = { max: Number.MAX_SAFE_INTEGER },
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fail(`${field} must be a non-empty string`);
  }
  if (value.length > options.max) {
    return fail(`${field} exceeds maximum length ${options.max}`);
  }
  if (options.exact !== undefined && value !== options.exact) {
    return fail(`${field} must equal ${options.exact}`);
  }
  return value;
}

function extractMentions(text: string): string[] {
  const mentions: string[] = [];
  for (const match of text.matchAll(GITHUB_MENTION_RE)) {
    const login = match[2];
    if (login) mentions.push(login);
  }
  return mentions;
}

function requireNoMentions(text: string, field: string): void {
  if (extractMentions(text).length > 0) {
    fail(`${field} must contain zero external mentions`);
  }
}

function countOccurrences(text: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while (true) {
    const index = text.indexOf(needle, offset);
    if (index < 0) return count;
    count += 1;
    offset = index + needle.length;
  }
}

function parseCandidate(value: unknown): string {
  const candidate = requireString(value, 'candidate', { max: 39 });
  if (/\[bot\]$/i.test(candidate) || /(?:^|-)bot$/i.test(candidate)) {
    fail('candidate must not be a bot account');
  }
  if (!CANDIDATE_RE.test(candidate)) {
    fail('candidate must be a valid GitHub username');
  }
  return candidate;
}

function parseTopicKey(value: unknown): string {
  const topicKey = requireString(value, 'topicKey', { max: 120 });
  if (!TOPIC_KEY_RE.test(topicKey)) {
    fail('topicKey must be a lowercase hyphenated slug');
  }
  return topicKey;
}

export function parseOutreachContract(issueBody: string): OutreachContract {
  const matches = [...issueBody.matchAll(CONTRACT_BLOCK)];
  if (matches.length !== 1) {
    fail('source Issue must contain exactly one get-fable-outreach-v1 block');
  }

  const match = matches[0];
  const rawJson = match?.[1];
  if (!rawJson) {
    fail('contract block must contain valid JSON');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    fail('contract block must contain valid JSON');
  }

  if (!isPlainObject(parsed)) {
    fail('contract JSON must be an object');
  }

  const allowed = new Set<string>(CONTRACT_KEYS);
  for (const key of Object.keys(parsed)) {
    if (!allowed.has(key)) {
      fail(`unexpected contract key: ${key}`);
    }
  }
  for (const key of CONTRACT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key)) {
      fail(`missing required field: ${key}`);
    }
  }

  if (parsed.schema !== 1) {
    fail('schema must equal 1');
  }

  const candidate = parseCandidate(parsed.candidate);
  const topicKey = parseTopicKey(parsed.topicKey);
  const discussionTitle = requireString(parsed.discussionTitle, 'discussionTitle', { max: 200 });
  const discussionCategory = requireString(parsed.discussionCategory, 'discussionCategory', {
    max: 32,
    exact: 'Ideas',
  });
  const discussionBodyTemplate = requireString(parsed.discussionBodyTemplate, 'discussionBodyTemplate', {
    max: 8000,
  });
  const sourceIssuePurpose = requireString(parsed.sourceIssuePurpose, 'sourceIssuePurpose', {
    max: 64,
    exact: 'contribution-opportunity',
  });
  const createdBy = requireString(parsed.createdBy, 'createdBy', {
    max: 64,
    exact: 'chatgpt-scheduled-outreach',
  });

  requireNoMentions(issueBody, 'source Issue');
  requireNoMentions(discussionBodyTemplate, 'discussionBodyTemplate');

  if (countOccurrences(discussionBodyTemplate, '{{candidate}}') !== 1) {
    fail('discussionBodyTemplate must contain exactly one {{candidate}} placeholder');
  }

  return {
    schema: 1,
    candidate,
    topicKey,
    discussionTitle,
    discussionCategory: discussionCategory as 'Ideas',
    discussionBodyTemplate,
    sourceIssuePurpose: sourceIssuePurpose as 'contribution-opportunity',
    createdBy: createdBy as 'chatgpt-scheduled-outreach',
  };
}

export function renderDiscussionBody(contract: OutreachContract, issueNumber: number): string {
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    fail('issueNumber must be a positive integer');
  }

  requireNoMentions(contract.discussionBodyTemplate, 'discussionBodyTemplate');
  if (countOccurrences(contract.discussionBodyTemplate, '{{candidate}}') !== 1) {
    fail('discussionBodyTemplate must contain exactly one {{candidate}} placeholder');
  }

  const rendered = contract.discussionBodyTemplate.replace('{{candidate}}', `@${contract.candidate}`);
  const mentions = extractMentions(rendered);
  if (mentions.length !== 1 || mentions[0]?.toLowerCase() !== contract.candidate.toLowerCase()) {
    fail('rendered Discussion must contain exactly one intended candidate mention');
  }

  return `${rendered}\n\n<!-- get-fable-outreach:issue-${issueNumber} -->`;
}
