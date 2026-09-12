import { describe, expect, test } from 'bun:test';
import { validateAnnouncementFeed } from '../src/core/update/announcements.ts';

function feed(title: string, message: string): unknown {
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-12T12:00:00.000Z',
    announcements: [
      {
        id: 'notice-1',
        type: 'info',
        title,
        message,
        display: 'always',
      },
    ],
  };
}

describe('announcement terminal safety', () => {
  test('rejects ANSI escape sequences in titles', () => {
    expect(() => validateAnnouncementFeed(feed('\u001b[2Jspoofed', 'safe'))).toThrow(/control|terminal/i);
  });

  test('rejects OSC and C1 control bytes in messages', () => {
    expect(() => validateAnnouncementFeed(feed('safe', '\u001b]0;spoofed\u0007'))).toThrow(/control|terminal/i);
    expect(() => validateAnnouncementFeed(feed('safe', `unsafe\u0085message`))).toThrow(/control|terminal/i);
  });

  test('preserves ordinary tabs, newlines and carriage returns in messages', () => {
    const parsed = validateAnnouncementFeed(feed('Safe title', 'line one\nline two\tvalue\r\nline three'));
    expect(parsed.announcements[0]?.message).toContain('line two\tvalue');
  });
});
