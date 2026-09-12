import { describe, expect, test } from 'bun:test';
import {
  dismissAnnouncementState,
  filterAnnouncements,
  markAnnouncementSeen,
  parseAnnouncementState,
  validateAnnouncementFeed,
  type AnnouncementFeed,
} from '../src/core/update/announcements.ts';

const NOW = new Date('2026-09-12T12:00:00.000Z');

function feed(overrides: Partial<AnnouncementFeed> = {}): unknown {
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-12T11:00:00.000Z',
    announcements: [
      {
        id: 'release-160',
        type: 'release',
        title: 'get-fable 1.6.0',
        message: 'A new stable release is available.',
        url: 'https://github.com/imMamdouhaboammar/get-fable/releases/tag/v1.6.0',
        minVersion: '1.5.0',
        maxVersion: '1.6.0',
        startsAt: '2026-09-01T00:00:00.000Z',
        expiresAt: '2026-10-01T00:00:00.000Z',
        display: 'once',
      },
    ],
    ...overrides,
  };
}

describe('announcement feed schema', () => {
  test('accepts the strict data-only schema', () => {
    const parsed = validateAnnouncementFeed(feed());
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.announcements[0]?.id).toBe('release-160');
  });

  test('rejects unknown schema versions and invalid generatedAt timestamps', () => {
    expect(() => validateAnnouncementFeed({ ...(feed() as object), schemaVersion: 2 })).toThrow(/schema/i);
    expect(() => validateAnnouncementFeed({ ...(feed() as object), generatedAt: 'today' })).toThrow(/generatedAt|timestamp/i);
  });

  test('rejects duplicate IDs and more than 250 records', () => {
    const parsed = validateAnnouncementFeed(feed());
    expect(() =>
      validateAnnouncementFeed({
        ...parsed,
        announcements: [parsed.announcements[0], parsed.announcements[0]],
      })
    ).toThrow(/duplicate|id/i);

    expect(() =>
      validateAnnouncementFeed({
        ...parsed,
        announcements: Array.from({ length: 251 }, (_, index) => ({
          id: `notice-${index}`,
          type: 'info',
          title: `Notice ${index}`,
          message: 'Bounded data.',
          display: 'always',
        })),
      })
    ).toThrow(/250|announcements/i);
  });

  test('rejects malformed versions, time windows, URL protocols and unknown fields', () => {
    const base = (feed() as { announcements: Record<string, unknown>[] }).announcements[0]!;
    for (const invalid of [
      { ...base, minVersion: 'latest' },
      { ...base, startsAt: 'tomorrow' },
      { ...base, startsAt: '2026-10-02T00:00:00.000Z', expiresAt: '2026-10-01T00:00:00.000Z' },
      { ...base, url: 'javascript:alert(1)' },
      { ...base, arbitrary: 'not allow-listed' },
    ]) {
      expect(() =>
        validateAnnouncementFeed({ ...(feed() as object), announcements: [invalid] })
      ).toThrow();
    }
  });

  test('rejects executable-shaped keys recursively even inside otherwise unknown nested payloads', () => {
    const dangerousKeys = ['command', 'commands', 'executable', 'script', 'shell', 'args', 'hook', 'code'];
    const base = (feed() as { announcements: Record<string, unknown>[] }).announcements[0]!;
    for (const key of dangerousKeys) {
      expect(() =>
        validateAnnouncementFeed({
          ...(feed() as object),
          announcements: [{ ...base, metadata: { safe: { [key]: 'do not run me' } } }],
        })
      ).toThrow(/executable|data-only|field|schema/i);
    }
  });

  test('deeply nested remote data fails as schema data instead of exhausting the call stack', () => {
    const base = (feed() as { announcements: Record<string, unknown>[] }).announcements[0]!;
    let nested: Record<string, unknown> = { value: 'leaf' };
    for (let index = 0; index < 6000; index += 1) nested = { nested };

    expect(() =>
      validateAnnouncementFeed({
        ...(feed() as object),
        announcements: [{ ...base, metadata: nested }],
      })
    ).toThrow(/unknown announcement field/i);
  });
});

describe('announcement targeting and client state', () => {
  test('targets deterministically by version and time', () => {
    const parsed = validateAnnouncementFeed(feed());
    expect(filterAnnouncements(parsed, { version: '1.5.1', now: NOW, state: parseAnnouncementState(null) })).toHaveLength(1);
    expect(filterAnnouncements(parsed, { version: '1.4.9', now: NOW, state: parseAnnouncementState(null) })).toHaveLength(0);
    expect(filterAnnouncements(parsed, { version: '1.6.1', now: NOW, state: parseAnnouncementState(null) })).toHaveLength(0);
    expect(filterAnnouncements(parsed, { version: '1.5.1', now: new Date('2026-10-02T00:00:00.000Z'), state: parseAnnouncementState(null) })).toHaveLength(0);
  });

  test('once announcements disappear after being seen', () => {
    const parsed = validateAnnouncementFeed(feed());
    const initial = parseAnnouncementState(null);
    const seen = markAnnouncementSeen(initial, 'release-160');

    expect(filterAnnouncements(parsed, { version: '1.5.1', now: NOW, state: initial })).toHaveLength(1);
    expect(filterAnnouncements(parsed, { version: '1.5.1', now: NOW, state: seen })).toHaveLength(0);
  });

  test('until-dismissed remains visible after seen but not after dismissal', () => {
    const parsed = validateAnnouncementFeed({
      ...(feed() as object),
      announcements: [
        {
          id: 'security-1',
          type: 'security',
          title: 'Security notice',
          message: 'Review the current security guidance.',
          display: 'until-dismissed',
        },
      ],
    });
    const seen = markAnnouncementSeen(parseAnnouncementState(null), 'security-1');
    const dismissed = dismissAnnouncementState(seen, 'security-1');

    expect(filterAnnouncements(parsed, { version: '1.5.1', now: NOW, state: seen })).toHaveLength(1);
    expect(filterAnnouncements(parsed, { version: '1.5.1', now: NOW, state: dismissed })).toHaveLength(0);
  });

  test('always ignores seen state but respects deterministic targeting', () => {
    const parsed = validateAnnouncementFeed({
      ...(feed() as object),
      announcements: [
        {
          id: 'maintenance-1',
          type: 'maintenance',
          title: 'Maintenance',
          message: 'Maintenance information.',
          display: 'always',
        },
      ],
    });
    const state = markAnnouncementSeen(parseAnnouncementState(null), 'maintenance-1');
    expect(filterAnnouncements(parsed, { version: '1.5.1', now: NOW, state })).toHaveLength(1);
  });

  test('malformed client state fails closed to an empty state', () => {
    expect(parseAnnouncementState({ schemaVersion: 1, seen: 'bad', dismissed: [] })).toEqual({
      schemaVersion: 1,
      seen: [],
      dismissed: [],
    });
  });
});
