import { describe, expect, test } from 'bun:test';
import { fetchStableRelease } from '../src/core/update/release-source.ts';

type FakeResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

function jsonResponse(body: unknown, status = 200): FakeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

async function expectFailure(run: () => Promise<unknown>, message: RegExp) {
  let caught: unknown;
  try {
    await run();
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error).message).toMatch(message);
}

describe('stable release source', () => {
  test('uses npm latest as authority and enriches the matching GitHub release', async () => {
    const calls: string[] = [];
    const result = await fetchStableRelease(
      '1.5.1',
      {
        now: () => new Date('2026-08-28T20:00:00.000Z'),
        fetch: async (input) => {
          calls.push(input);
          if (input === 'https://registry.npmjs.org/get-fable') {
            return jsonResponse({
              'dist-tags': { latest: '1.6.0' },
              versions: {
                '1.6.0': { dist: { integrity: 'sha512-test-integrity' } },
              },
            });
          }
          if (input.endsWith('/releases/tags/v1.6.0')) {
            return jsonResponse({
              html_url: 'https://github.com/imMamdouhaboammar/get-fable/releases/tag/v1.6.0',
              published_at: '2026-08-28T19:59:00.000Z',
            });
          }
          throw new Error(`unexpected request: ${input}`);
        },
      },
      100
    );

    expect(result.version).toBe('1.6.0');
    expect(result.source).toBe('npm');
    expect(result.integrity).toBe('sha512-test-integrity');
    expect(result.releaseUrl).toBe('https://github.com/imMamdouhaboammar/get-fable/releases/tag/v1.6.0');
    expect(result.publishedAt).toBe('2026-08-28T19:59:00.000Z');
    expect(calls.some((url) => url.includes('raw.githubusercontent.com'))).toBe(false);
  });

  test('keeps a valid npm result when GitHub enrichment fails', async () => {
    const result = await fetchStableRelease('1.5.1', {
      now: () => new Date('2026-08-28T20:00:00.000Z'),
      fetch: async (input) => {
        if (input === 'https://registry.npmjs.org/get-fable') {
          return jsonResponse({ 'dist-tags': { latest: '1.6.0' }, versions: {} });
        }
        throw new Error('GitHub unavailable');
      },
    });

    expect(result.version).toBe('1.6.0');
    expect(result.source).toBe('npm');
    expect(result.releaseUrl).toBeUndefined();
  });

  test('rejects a non-success npm registry response', async () => {
    await expectFailure(
      () =>
        fetchStableRelease('1.5.1', {
          now: () => new Date('2026-08-28T20:00:00.000Z'),
          fetch: async () => jsonResponse({ error: 'unavailable' }, 503),
        }),
      /npm registry/i
    );
  });

  test('rejects malformed npm metadata without a valid latest tag', async () => {
    await expectFailure(
      () =>
        fetchStableRelease('1.5.1', {
          now: () => new Date('2026-08-28T20:00:00.000Z'),
          fetch: async () => jsonResponse({ 'dist-tags': { latest: 'not-a-version' }, versions: {} }),
        }),
      /latest/i
    );
  });
});
