import { assertValidVersion } from './release-source.js';

export type AnnouncementType =
  | 'release'
  | 'security'
  | 'deprecation'
  | 'breaking'
  | 'feature'
  | 'maintenance'
  | 'info';

export type AnnouncementDisplay = 'once' | 'until-dismissed' | 'always';

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string;
  url?: string;
  minVersion?: string;
  maxVersion?: string;
  startsAt?: string;
  expiresAt?: string;
  display: AnnouncementDisplay;
}

export interface AnnouncementFeed {
  schemaVersion: 1;
  generatedAt: string;
  announcements: Announcement[];
}

export interface AnnouncementState {
  schemaVersion: 1;
  seen: string[];
  dismissed: string[];
}

export interface AnnouncementTargetContext {
  version: string;
  now: Date;
  state: AnnouncementState;
}

const ANNOUNCEMENT_TYPES = new Set<AnnouncementType>([
  'release',
  'security',
  'deprecation',
  'breaking',
  'feature',
  'maintenance',
  'info',
]);
const DISPLAY_MODES = new Set<AnnouncementDisplay>(['once', 'until-dismissed', 'always']);
const FEED_KEYS = new Set(['schemaVersion', 'generatedAt', 'announcements']);
const ANNOUNCEMENT_KEYS = new Set([
  'id',
  'type',
  'title',
  'message',
  'url',
  'minVersion',
  'maxVersion',
  'startsAt',
  'expiresAt',
  'display',
]);
const EXECUTABLE_SHAPED_KEYS = new Set([
  'command',
  'commands',
  'executable',
  'script',
  'shell',
  'args',
  'hook',
  'code',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new Error(`Announcement ${field} must be a non-empty string of at most ${maxLength} characters`);
  }
  return value;
}

function rejectExecutableShape(value: unknown, path = 'feed'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectExecutableShape(item, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, nested] of Object.entries(value)) {
    if (EXECUTABLE_SHAPED_KEYS.has(key.toLowerCase())) {
      throw new Error(`Announcement feed is data-only; executable-shaped field ${path}.${key} is forbidden`);
    }
    rejectExecutableShape(nested, `${path}.${key}`);
  }
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: Set<string>, label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`Unknown ${label} field: ${key}`);
  }
}

function parseOptionalVersion(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  const version = requireString(value, field, 64);
  assertValidVersion(version, `announcement ${field}`);
  return version;
}

function parseOptionalTime(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (!isIsoTimestamp(value)) throw new Error(`Announcement ${field} must be an ISO timestamp`);
  return value;
}

function parseOptionalUrl(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const raw = requireString(value, 'url', 2048);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Announcement url must be a valid HTTPS URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Announcement url must be a credential-free HTTPS URL');
  }
  return url.toString();
}

function semverOrder(a: string, b: string): -1 | 0 | 1 {
  const bun = (globalThis as typeof globalThis & {
    Bun?: { semver?: { order(left: string, right: string): -1 | 0 | 1 } };
  }).Bun;
  if (!bun?.semver) throw new Error('Bun semver API is unavailable');
  return bun.semver.order(a, b);
}

function parseAnnouncement(value: unknown): Announcement {
  if (!isRecord(value)) throw new Error('Announcement record must be an object');
  assertAllowedKeys(value, ANNOUNCEMENT_KEYS, 'announcement');

  const id = requireString(value.id, 'id', 160);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)) {
    throw new Error('Announcement id contains unsupported characters');
  }

  const type = value.type;
  if (typeof type !== 'string' || !ANNOUNCEMENT_TYPES.has(type as AnnouncementType)) {
    throw new Error('Announcement type is invalid');
  }

  const display = value.display;
  if (typeof display !== 'string' || !DISPLAY_MODES.has(display as AnnouncementDisplay)) {
    throw new Error('Announcement display mode is invalid');
  }

  const minVersion = parseOptionalVersion(value.minVersion, 'minVersion');
  const maxVersion = parseOptionalVersion(value.maxVersion, 'maxVersion');
  if (minVersion && maxVersion && semverOrder(minVersion, maxVersion) > 0) {
    throw new Error('Announcement minVersion cannot exceed maxVersion');
  }

  const startsAt = parseOptionalTime(value.startsAt, 'startsAt');
  const expiresAt = parseOptionalTime(value.expiresAt, 'expiresAt');
  if (startsAt && expiresAt && Date.parse(startsAt) > Date.parse(expiresAt)) {
    throw new Error('Announcement startsAt cannot be after expiresAt');
  }

  return {
    id,
    type: type as AnnouncementType,
    title: requireString(value.title, 'title', 240),
    message: requireString(value.message, 'message', 4000),
    ...(parseOptionalUrl(value.url) ? { url: parseOptionalUrl(value.url) } : {}),
    ...(minVersion ? { minVersion } : {}),
    ...(maxVersion ? { maxVersion } : {}),
    ...(startsAt ? { startsAt } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    display: display as AnnouncementDisplay,
  };
}

export function validateAnnouncementFeed(value: unknown): AnnouncementFeed {
  rejectExecutableShape(value);
  if (!isRecord(value)) throw new Error('Announcement feed must be an object');
  assertAllowedKeys(value, FEED_KEYS, 'feed');
  if (value.schemaVersion !== 1) throw new Error('Announcement feed schema version is unsupported');
  if (!isIsoTimestamp(value.generatedAt)) throw new Error('Announcement feed generatedAt must be an ISO timestamp');
  if (!Array.isArray(value.announcements)) throw new Error('Announcement feed announcements must be an array');
  if (value.announcements.length > 250) throw new Error('Announcement feed exceeds the 250-record limit');

  const announcements = value.announcements.map(parseAnnouncement);
  const ids = new Set<string>();
  for (const announcement of announcements) {
    if (ids.has(announcement.id)) throw new Error(`Duplicate announcement id: ${announcement.id}`);
    ids.add(announcement.id);
  }

  return {
    schemaVersion: 1,
    generatedAt: value.generatedAt,
    announcements,
  };
}

export function parseAnnouncementState(value: unknown): AnnouncementState {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.seen) || !Array.isArray(value.dismissed)) {
    return { schemaVersion: 1, seen: [], dismissed: [] };
  }
  if (!value.seen.every((id) => typeof id === 'string') || !value.dismissed.every((id) => typeof id === 'string')) {
    return { schemaVersion: 1, seen: [], dismissed: [] };
  }
  return {
    schemaVersion: 1,
    seen: [...new Set(value.seen as string[])],
    dismissed: [...new Set(value.dismissed as string[])],
  };
}

export function markAnnouncementSeen(state: AnnouncementState, id: string): AnnouncementState {
  return state.seen.includes(id)
    ? state
    : { ...state, seen: [...state.seen, id] };
}

export function dismissAnnouncementState(state: AnnouncementState, id: string): AnnouncementState {
  const seen = state.seen.includes(id) ? state.seen : [...state.seen, id];
  const dismissed = state.dismissed.includes(id) ? state.dismissed : [...state.dismissed, id];
  return { ...state, seen, dismissed };
}

function targeted(announcement: Announcement, context: AnnouncementTargetContext): boolean {
  assertValidVersion(context.version, 'current version');
  if (announcement.minVersion && semverOrder(context.version, announcement.minVersion) < 0) return false;
  if (announcement.maxVersion && semverOrder(context.version, announcement.maxVersion) > 0) return false;

  const now = context.now.getTime();
  if (announcement.startsAt && now < Date.parse(announcement.startsAt)) return false;
  if (announcement.expiresAt && now > Date.parse(announcement.expiresAt)) return false;

  if (announcement.display === 'once') {
    return !context.state.seen.includes(announcement.id) && !context.state.dismissed.includes(announcement.id);
  }
  if (announcement.display === 'until-dismissed') {
    return !context.state.dismissed.includes(announcement.id);
  }
  return true;
}

export function filterAnnouncements(feed: AnnouncementFeed, context: AnnouncementTargetContext): Announcement[] {
  return feed.announcements.filter((announcement) => targeted(announcement, context));
}
