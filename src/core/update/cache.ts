import fs from 'node:fs';
import { atomicWriteFileSync } from '../../utils.js';

export interface CacheEnvelope<T> {
  schemaVersion: 1;
  fetchedAt: string;
  expiresAt: string;
  value: T;
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isCacheEnvelope(value: unknown): value is CacheEnvelope<unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.schemaVersion === 1 &&
    isValidTimestamp(candidate.fetchedAt) &&
    isValidTimestamp(candidate.expiresAt) &&
    Object.prototype.hasOwnProperty.call(candidate, 'value')
  );
}

export function readCache<T>(filePath: string): CacheEnvelope<T> | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
    return isCacheEnvelope(parsed) ? (parsed as CacheEnvelope<T>) : null;
  } catch {
    return null;
  }
}

export function writeCacheAtomic<T>(filePath: string, value: CacheEnvelope<T>): void {
  const serialized = JSON.stringify(value, null, 2);
  atomicWriteFileSync(filePath, serialized);
}

export function isCacheFresh<T>(cache: CacheEnvelope<T>, now: Date): boolean {
  const expiresAt = Date.parse(cache.expiresAt);
  return Number.isFinite(expiresAt) && now.getTime() < expiresAt;
}
