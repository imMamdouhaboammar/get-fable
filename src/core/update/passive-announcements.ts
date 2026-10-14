import {
  filterAnnouncements,
  markAnnouncementSeen,
  type AnnouncementAcquisitionOptions,
  type AnnouncementAcquisitionResult,
  type AnnouncementState,
} from './announcements.js';
import { decidePassiveCheck } from './policy.js';

const PASSIVE_ANNOUNCEMENT_LIMIT = 3;

export interface PassiveAnnouncementContext {
  currentVersion: string;
  command: string;
  autoCheck: boolean;
  isCI: boolean;
  isTTY: boolean;
  jsonMode: boolean;
  jsonV1Mode: boolean;
}

export interface PassiveAnnouncementDeps {
  now: () => Date;
  acquire: (options?: AnnouncementAcquisitionOptions) => Promise<AnnouncementAcquisitionResult | null>;
  readState: () => AnnouncementState;
  writeState: (state: AnnouncementState) => void;
  notify: (message: string) => void;
}

export interface PassiveAnnouncementResult {
  displayed: number;
  reason: string;
}

export async function runPassiveAnnouncements(
  context: PassiveAnnouncementContext,
  deps: PassiveAnnouncementDeps
): Promise<PassiveAnnouncementResult> {
  const decision = decidePassiveCheck({
    autoCheck: context.autoCheck,
    cacheFresh: false,
    isCI: context.isCI,
    isTTY: context.isTTY,
    jsonMode: context.jsonMode,
    jsonV1Mode: context.jsonV1Mode,
    command: context.command,
  });
  if (!decision.allowed) return { displayed: 0, reason: decision.reason };

  let acquisition: AnnouncementAcquisitionResult | null;
  try {
    acquisition = await deps.acquire();
  } catch {
    return { displayed: 0, reason: 'feed-unavailable' };
  }
  if (!acquisition) return { displayed: 0, reason: 'feed-unavailable' };

  let state: AnnouncementState;
  try {
    state = deps.readState();
  } catch {
    state = { schemaVersion: 1, seen: [], dismissed: [] };
  }

  const selected = filterAnnouncements(acquisition.feed, {
    version: context.currentVersion,
    now: deps.now(),
    state,
  }).slice(0, PASSIVE_ANNOUNCEMENT_LIMIT);

  let nextState = state;
  let displayed = 0;
  for (const announcement of selected) {
    try {
      deps.notify(
        `${announcement.title}: ${announcement.message}${announcement.url ? ` ${announcement.url}` : ''}`
      );
      displayed += 1;
      nextState = markAnnouncementSeen(nextState, announcement.id);
    } catch {
      break;
    }
  }

  if (displayed > 0) {
    try {
      deps.writeState(nextState);
    } catch {
      // Passive display must not fail the user's primary command when state persistence is unavailable.
    }
  }

  return { displayed, reason: displayed > 0 ? 'displayed' : 'no-targeted-announcements' };
}
