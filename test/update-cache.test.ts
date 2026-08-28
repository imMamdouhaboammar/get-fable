import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';
import { isCacheFresh, readCache, writeCacheAtomic } from '../src/core/update/cache.ts';

const tempDirs: string[] = [];

function tempFile(name = 'release.json') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-fable-update-cache-'));
  tempDirs.push(dir);
  return path.join(dir, name);
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('update cache', () => {
  test('treats missing and corrupted cache files as unavailable', () => {
    const filePath = tempFile();
    expect(readCache(filePath)).toBeNull();

    fs.writeFileSync(filePath, '{not-json', 'utf-8');
    expect(readCache(filePath)).toBeNull();
  });

  test('rejects cache envelopes with unsupported schema', () => {
    const filePath = tempFile();
    fs.writeFileSync(
      filePath,
      JSON.stringify({ schemaVersion: 99, fetchedAt: '2026-08-28T20:00:00.000Z', expiresAt: '2026-08-29T20:00:00.000Z', value: {} }),
      'utf-8'
    );

    expect(readCache(filePath)).toBeNull();
  });

  test('writes and reads a schema-versioned cache envelope', () => {
    const filePath = tempFile();
    const envelope = {
      schemaVersion: 1 as const,
      fetchedAt: '2026-08-28T20:00:00.000Z',
      expiresAt: '2026-08-29T20:00:00.000Z',
      value: { version: '1.6.0' },
    };

    writeCacheAtomic(filePath, envelope);
    expect(readCache<{ version: string }>(filePath)).toEqual(envelope);
  });

  test('atomically replaces an existing valid cache envelope', () => {
    const filePath = tempFile();
    const original = {
      schemaVersion: 1 as const,
      fetchedAt: '2026-08-28T20:00:00.000Z',
      expiresAt: '2026-08-29T20:00:00.000Z',
      value: { version: '1.6.0' },
    };
    const replacement = {
      schemaVersion: 1 as const,
      fetchedAt: '2026-08-28T21:00:00.000Z',
      expiresAt: '2026-08-29T21:00:00.000Z',
      value: { version: '1.6.1' },
    };

    writeCacheAtomic(filePath, original);
    writeCacheAtomic(filePath, replacement);

    expect(readCache<{ version: string }>(filePath)).toEqual(replacement);
    expect(fs.readdirSync(path.dirname(filePath)).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  test('distinguishes fresh cache from expired cache', () => {
    const envelope = {
      schemaVersion: 1 as const,
      fetchedAt: '2026-08-28T20:00:00.000Z',
      expiresAt: '2026-08-29T20:00:00.000Z',
      value: { version: '1.6.0' },
    };

    expect(isCacheFresh(envelope, new Date('2026-08-29T19:59:59.999Z'))).toBe(true);
    expect(isCacheFresh(envelope, new Date('2026-08-29T20:00:00.000Z'))).toBe(false);
  });

  test('preserves the previous file when serialization fails before replacement', () => {
    const filePath = tempFile();
    const original = {
      schemaVersion: 1 as const,
      fetchedAt: '2026-08-28T20:00:00.000Z',
      expiresAt: '2026-08-29T20:00:00.000Z',
      value: { version: '1.6.0' },
    };
    writeCacheAtomic(filePath, original);
    const before = fs.readFileSync(filePath, 'utf-8');

    expect(() =>
      writeCacheAtomic(filePath, {
        schemaVersion: 1,
        fetchedAt: '2026-08-28T20:00:00.000Z',
        expiresAt: '2026-08-29T20:00:00.000Z',
        value: { invalid: 1n },
      })
    ).toThrow();

    expect(fs.readFileSync(filePath, 'utf-8')).toBe(before);
  });
});
