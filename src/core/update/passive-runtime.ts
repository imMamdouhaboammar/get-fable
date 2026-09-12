import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { atomicWriteFileSync } from '../../utils.js';
import { readCache, writeCacheAtomic } from './cache.js';
import {
  acquireAnnouncementFeed,
  parseAnnouncementState,
  type AnnouncementAcquisitionDeps,
  type AnnouncementFetch,
  type AnnouncementState,
} from './announcements.js';
import { runAnnouncementsCli } from './announcement-cli.js';
import { runPassiveAnnouncements, type PassiveAnnouncementContext } from './passive-announcements.js';
import {
  runPassiveUpdateAwareness,
  type PassiveUpdateAwarenessContext,
} from './passive.js';
import { fetchStableRelease } from './release-source.js';
import type { FetchLike } from './types.js';

export function getReleaseCachePath(home = os.homedir()): string {
  return path.join(home, '.fable', 'update', 'release.json');
}

export function getAnnouncementCachePath(home = os.homedir()): string {
  return path.join(home, '.fable', 'update', 'announcements-feed.json');
}

export function getAnnouncementStatePath(home = os.homedir()): string {
  return path.join(home, '.fable', 'update', 'announcements-state.json');
}

export function readAnnouncementStateFile(
  filePath = getAnnouncementStatePath()
): AnnouncementState {
  try {
    if (!fs.existsSync(filePath)) return parseAnnouncementState(null);
    return parseAnnouncementState(JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown);
  } catch {
    return parseAnnouncementState(null);
  }
}

export function writeAnnouncementStateFile(
  state: AnnouncementState,
  filePath = getAnnouncementStatePath()
): void {
  atomicWriteFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
}

function defaultReleaseFetch(input: string, init?: Parameters<FetchLike>[1]) {
  return fetch(input, init);
}

const defaultAnnouncementFetch: AnnouncementFetch = (input, init) => fetch(input, init);

function announcementAcquisitionDeps(): AnnouncementAcquisitionDeps {
  const cachePath = getAnnouncementCachePath();
  return {
    fetch: defaultAnnouncementFetch,
    now: () => new Date(),
    readCache: () => readCache<unknown>(cachePath),
    writeCache: (cache) => writeCacheAtomic(cachePath, cache),
  };
}

export async function runDefaultAnnouncementsCli(
  args: string[],
  currentVersion: string
): Promise<number> {
  const acquisitionDeps = announcementAcquisitionDeps();
  return runAnnouncementsCli(args, {
    currentVersion,
    now: () => new Date(),
    acquire: (options) => acquireAnnouncementFeed(acquisitionDeps, options),
    readState: () => readAnnouncementStateFile(),
    writeState: (state) => writeAnnouncementStateFile(state),
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
  });
}

export async function runDefaultPassiveUpdateAwareness(
  context: PassiveUpdateAwarenessContext
): Promise<void> {
  const cachePath = getReleaseCachePath();
  await runPassiveUpdateAwareness(context, {
    now: () => new Date(),
    readCache: () => readCache<unknown>(cachePath),
    writeCache: (cache) => writeCacheAtomic(cachePath, cache),
    fetchRelease: (currentVersion) =>
      fetchStableRelease(currentVersion, {
        fetch: defaultReleaseFetch,
        now: () => new Date(),
      }),
    notify: (message) => console.error(message),
  });
}

export async function runDefaultPassiveAnnouncements(
  context: PassiveAnnouncementContext
): Promise<void> {
  const acquisitionDeps = announcementAcquisitionDeps();
  await runPassiveAnnouncements(context, {
    now: () => new Date(),
    acquire: (options) => acquireAnnouncementFeed(acquisitionDeps, options),
    readState: () => readAnnouncementStateFile(),
    writeState: (state) => writeAnnouncementStateFile(state),
    notify: (message) => console.error(message),
  });
}
