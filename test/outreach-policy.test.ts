import { describe, expect, test } from 'bun:test';
import {
  appendPublicationRecord,
  collectPublicationRecords,
  discussionIssueMarker,
  isCandidateCoolingDown,
  isTopicPreviouslyPublished,
  parsePublicationRecord,
  type PublicationRecord,
} from '../src/outreach/policy.ts';

const record: PublicationRecord = {
  candidate: 'obra',
  topicKey: 'lifecycle-gates-vs-advisory-skills',
  discussionUrl: 'https://github.com/imMamdouhaboammar/get-fable/discussions/123',
  publishedAt: '2026-09-01T12:00:00.000Z',
};

describe('outreach publication policy', () => {
  test('constructs the deterministic source-Issue marker', () => {
    expect(discussionIssueMarker(42)).toBe('<!-- get-fable-outreach:issue-42 -->');
    expect(() => discussionIssueMarker(0)).toThrow('positive integer');
  });

  test('round-trips one strict publication record', () => {
    const body = appendPublicationRecord('Issue body', record);
    expect(body).toContain(`Related Discussion: ${record.discussionUrl}`);
    expect(parsePublicationRecord(body)).toEqual(record);
  });

  test('does not append the same record twice', () => {
    const once = appendPublicationRecord('Issue body', record);
    expect(appendPublicationRecord(once, record)).toBe(once);
  });

  test('fails closed for conflicting or malformed publication metadata', () => {
    const once = appendPublicationRecord('Issue body', record);
    expect(() => appendPublicationRecord(once, { ...record, discussionUrl: 'https://github.com/imMamdouhaboammar/get-fable/discussions/999' })).toThrow('conflict');
    expect(() => parsePublicationRecord('<!-- get-fable-outreach-published-v1\n{nope}\n-->')).toThrow('valid JSON');
    expect(() => parsePublicationRecord(`${once}\n${once}`)).toThrow('exactly one');
  });

  test('returns null when no publication marker exists', () => {
    expect(parsePublicationRecord('ordinary Issue body')).toBeNull();
  });

  test('enforces a 30-day candidate cooldown case-insensitively', () => {
    const now = new Date('2026-09-13T12:00:00.000Z');
    const recent = [{ ...record, candidate: 'ObRa', publishedAt: '2026-08-15T12:00:00.001Z' }];
    const boundary = [{ ...record, publishedAt: '2026-08-14T12:00:00.000Z' }];
    expect(isCandidateCoolingDown(recent, 'obra', now)).toBe(true);
    expect(isCandidateCoolingDown(boundary, 'obra', now)).toBe(false);
    expect(isCandidateCoolingDown(recent, 'someone-else', now)).toBe(false);
  });

  test('detects permanent topic-key reuse', () => {
    expect(isTopicPreviouslyPublished([record], record.topicKey)).toBe(true);
    expect(isTopicPreviouslyPublished([record], 'new-topic')).toBe(false);
  });

  test('collects only prior published records and excludes the current Issue', () => {
    const published = appendPublicationRecord('Older Issue', record);
    const current = appendPublicationRecord('Current Issue', { ...record, candidate: 'current-user', topicKey: 'current-topic' });
    const records = collectPublicationRecords(
      [
        { number: 10, body: published },
        { number: 11, body: current },
        { number: 12, body: 'Unpublished contribution opportunity' },
      ],
      11,
    );
    expect(records).toEqual([record]);
  });

  test('fails closed when a prior Issue claims publication with malformed metadata', () => {
    expect(() => collectPublicationRecords([
      { number: 9, body: '<!-- get-fable-outreach-published-v1\n{"candidate":"obra"}\n-->' },
    ], 10)).toThrow('publication record');
  });
});
