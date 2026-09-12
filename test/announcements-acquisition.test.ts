import { describe, expect, test } from 'bun:test';
import {
  ANNOUNCEMENT_FEED_URL,
  acquireAnnouncementFeed,
  type AnnouncementFeed,
  type AnnouncementFetchResponse,
} from '../src/core/update/announcements.ts';
import type { CacheEnvelope } from '../src/core/update/cache.ts';

const NOW = new Date('2026-09-12T12:00:00.000Z');
const encoder = new TextEncoder();

function validFeed(message = 'A bounded notice.'): AnnouncementFeed {
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-12T11:00:00.000Z',
    announcements: [
      {
        id: 'notice-1',
        type: 'info',
        title: 'Notice',
        message,
        display: 'always',
      },
    ],
  };
}

function envelope(
  value: unknown,
  fetchedAt = '2026-09-12T10:00:00.000Z',
  expiresAt = '2026-09-12T16:00:00.000Z'
): CacheEnvelope<unknown> {
  return { schemaVersion: 1, fetchedAt, expiresAt, value };
}

function responseFromText(
  text: string,
  overrides: Partial<AnnouncementFetchResponse> = {}
): AnnouncementFetchResponse {
  const bytes = encoder.encode(text);
  return {
    ok: true,
    status: 200,
    redirected: false,
    headers: { get: () => String(bytes.byteLength) },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
    async text() {
      return text;
    },
    ...overrides,
  };
}

describe('bounded announcement acquisition', () => {
  test('uses only the fixed HTTPS authority, rejects redirects at fetch, and uses the 2500ms default timeout', async () => {
    const calls: Array<{ input: string; init?: { redirect?: RequestRedirect } }> = [];
    const timerDurations: number[] = [];
    let written: CacheEnvelope<AnnouncementFeed> | null = null;

    const result = await acquireAnnouncementFeed({
      fetch: async (input, init) => {
        calls.push({ input, init });
        return responseFromText(JSON.stringify(validFeed()));
      },
      now: () => NOW,
      readCache: () => null,
      writeCache: (cache) => {
        written = cache;
      },
      setTimer: (_callback, ms) => {
        timerDurations.push(ms);
        return 1;
      },
      clearTimer: () => {},
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe(ANNOUNCEMENT_FEED_URL);
    expect(calls[0]?.init?.redirect).toBe('error');
    expect(timerDurations).toEqual([2500]);
    expect(result?.source).toBe('network');
    expect(result?.stale).toBe(false);
    expect(written?.value.announcements[0]?.id).toBe('notice-1');
  });

  test('returns a fresh validated cache without network work', async () => {
    let fetchCalls = 0;
    const result = await acquireAnnouncementFeed({
      fetch: async () => {
        fetchCalls += 1;
        throw new Error('network must not be reached');
      },
      now: () => NOW,
      readCache: () => envelope(validFeed()),
      writeCache: () => {
        throw new Error('fresh cache must not be rewritten');
      },
    });

    expect(fetchCalls).toBe(0);
    expect(result?.source).toBe('cache');
    expect(result?.stale).toBe(false);
  });

  test('rejects redirected responses and preserves the previous valid cache', async () => {
    const cached = envelope(
      validFeed('cached'),
      '2026-09-11T12:00:00.000Z',
      '2026-09-11T18:00:00.000Z'
    );
    let writes = 0;

    const result = await acquireAnnouncementFeed({
      fetch: async () => responseFromText(JSON.stringify(validFeed('remote')), { redirected: true }),
      now: () => NOW,
      readCache: () => cached,
      writeCache: () => {
        writes += 1;
      },
    }, { refresh: true });

    expect(writes).toBe(0);
    expect(result?.source).toBe('cache');
    expect(result?.stale).toBe(true);
    expect(result?.feed.announcements[0]?.message).toBe('cached');
  });

  test('enforces the 128 KiB body limit while streaming and never caches oversized content', async () => {
    const chunk = new Uint8Array(70 * 1024);
    let writes = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk);
        controller.close();
      },
    });

    await expect(
      acquireAnnouncementFeed({
        fetch: async () => ({
          ok: true,
          status: 200,
          redirected: false,
          headers: { get: () => null },
          body,
          async text() {
            throw new Error('streaming path should be used');
          },
        }),
        now: () => NOW,
        readCache: () => null,
        writeCache: () => {
          writes += 1;
        },
      }, { refresh: true, explicit: true })
    ).rejects.toThrow(/announcement feed unavailable/i);

    expect(writes).toBe(0);
  });

  test('rejects oversized Content-Length before reading the body', async () => {
    let bodyRead = false;
    await expect(
      acquireAnnouncementFeed({
        fetch: async () => ({
          ok: true,
          status: 200,
          redirected: false,
          headers: { get: () => String(128 * 1024 + 1) },
          body: null,
          async text() {
            bodyRead = true;
            return JSON.stringify(validFeed());
          },
        }),
        now: () => NOW,
        readCache: () => null,
        writeCache: () => {},
      }, { refresh: true, explicit: true })
    ).rejects.toThrow(/announcement feed unavailable/i);
    expect(bodyRead).toBe(false);
  });

  test('malformed or executable-shaped remote data cannot replace the last valid cache', async () => {
    const cached = envelope(
      validFeed('last known valid'),
      '2026-09-11T12:00:00.000Z',
      '2026-09-11T18:00:00.000Z'
    );
    let writes = 0;
    const dangerous = {
      ...validFeed('remote'),
      announcements: [{ ...validFeed().announcements[0], command: 'rm -rf .' }],
    };

    const result = await acquireAnnouncementFeed({
      fetch: async () => responseFromText(JSON.stringify(dangerous)),
      now: () => NOW,
      readCache: () => cached,
      writeCache: () => {
        writes += 1;
      },
    }, { refresh: true });

    expect(writes).toBe(0);
    expect(result?.source).toBe('cache');
    expect(result?.feed.announcements[0]?.message).toBe('last known valid');
  });

  test('uses validated stale cache for at most seven days after network failure', async () => {
    const withinWindow = await acquireAnnouncementFeed({
      fetch: async () => {
        throw new Error('offline');
      },
      now: () => NOW,
      readCache: () => envelope(
        validFeed('stale but allowed'),
        '2026-09-06T13:00:00.000Z',
        '2026-09-06T19:00:00.000Z'
      ),
      writeCache: () => {},
    }, { refresh: true });

    const tooOld = await acquireAnnouncementFeed({
      fetch: async () => {
        throw new Error('offline');
      },
      now: () => NOW,
      readCache: () => envelope(
        validFeed('too old'),
        '2026-09-05T11:59:59.000Z',
        '2026-09-05T17:59:59.000Z'
      ),
      writeCache: () => {},
    }, { refresh: true });

    expect(withinWindow?.source).toBe('cache');
    expect(withinWindow?.stale).toBe(true);
    expect(tooOld).toBeNull();
  });

  test('explicit refresh fails non-zero upstream when neither network nor a validated cache is usable', async () => {
    await expect(
      acquireAnnouncementFeed({
        fetch: async () => {
          throw new Error('offline private detail');
        },
        now: () => NOW,
        readCache: () => envelope({ schemaVersion: 1, generatedAt: 'bad', announcements: [] }),
        writeCache: () => {},
      }, { refresh: true, explicit: true })
    ).rejects.toThrow(/announcement feed unavailable/i);
  });
});
