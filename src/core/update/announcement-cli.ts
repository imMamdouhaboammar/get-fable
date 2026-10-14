import {
  dismissAnnouncementState,
  filterAnnouncements,
  markAnnouncementSeen,
  type Announcement,
  type AnnouncementAcquisitionOptions,
  type AnnouncementAcquisitionResult,
  type AnnouncementState,
} from './announcements.js';

export interface AnnouncementCliDeps {
  currentVersion: string;
  now: () => Date;
  acquire: (options?: AnnouncementAcquisitionOptions) => Promise<AnnouncementAcquisitionResult | null>;
  readState: () => AnnouncementState;
  writeState: (state: AnnouncementState) => void;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function machineMode(args: string[]): boolean {
  return hasFlag(args, '--json') || hasFlag(args, '--json-v1');
}

function positionalArgs(args: string[]): string[] {
  return args.filter((arg) => !arg.startsWith('--'));
}

function printMachine(
  args: string[],
  command: string,
  data: unknown,
  deps: AnnouncementCliDeps
): void {
  const payload = hasFlag(args, '--json-v1')
    ? { schemaVersion: 1, command, data }
    : data;
  deps.stdout(JSON.stringify(payload));
}

function fail(args: string[], command: string, message: string, deps: AnnouncementCliDeps): number {
  if (machineMode(args)) {
    printMachine(args, command, { success: false, error: message }, deps);
  } else {
    deps.stderr(message);
  }
  return 1;
}

function humanList(announcements: Announcement[], deps: AnnouncementCliDeps): void {
  if (announcements.length === 0) {
    deps.stdout('No announcements.');
    return;
  }
  for (const announcement of announcements) {
    deps.stdout(`${announcement.id} [${announcement.type}] ${announcement.title}`);
  }
}

function announcementById(
  acquisition: AnnouncementAcquisitionResult,
  id: string
): Announcement | undefined {
  return acquisition.feed.announcements.find((announcement) => announcement.id === id);
}

export async function runAnnouncementsCli(args: string[], deps: AnnouncementCliDeps): Promise<number> {
  const positionals = positionalArgs(args);
  const action = (positionals[0] ?? 'list').toLowerCase();

  try {
    if (action === 'refresh') {
      const acquisition = await deps.acquire({ refresh: true, explicit: true });
      if (!acquisition) return fail(args, 'announcements:refresh', 'Announcement feed unavailable', deps);
      const data = {
        success: true,
        source: acquisition.source,
        stale: acquisition.stale,
        count: acquisition.feed.announcements.length,
      };
      if (machineMode(args)) printMachine(args, 'announcements:refresh', data, deps);
      else deps.stdout(`Announcements refreshed from ${acquisition.source} (${data.count} records).`);
      return 0;
    }

    if (!['list', 'show', 'dismiss'].includes(action)) {
      return fail(
        args,
        'announcements:error',
        `Unknown announcements action: ${action}. Use list, show, dismiss, or refresh.`,
        deps
      );
    }

    const acquisition = await deps.acquire({ explicit: true });
    if (!acquisition) return fail(args, `announcements:${action}`, 'Announcement feed unavailable', deps);
    const state = deps.readState();

    if (action === 'list') {
      let announcements = filterAnnouncements(acquisition.feed, {
        version: deps.currentVersion,
        now: deps.now(),
        state,
      });
      if (hasFlag(args, '--unread')) {
        announcements = announcements.filter((announcement) => !state.seen.includes(announcement.id));
      }
      const data = {
        source: acquisition.source,
        stale: acquisition.stale,
        announcements,
      };
      if (machineMode(args)) printMachine(args, 'announcements:list', data, deps);
      else humanList(announcements, deps);
      return 0;
    }

    const id = positionals[1];
    if (!id) return fail(args, `announcements:${action}`, `${action} requires an announcement id`, deps);
    const announcement = announcementById(acquisition, id);
    if (!announcement) return fail(args, `announcements:${action}`, `Announcement not found: ${id}`, deps);

    if (action === 'show') {
      deps.writeState(markAnnouncementSeen(state, id));
      if (machineMode(args)) printMachine(args, 'announcements:show', announcement, deps);
      else {
        deps.stdout(`${announcement.title}\n${announcement.message}${announcement.url ? `\n${announcement.url}` : ''}`);
      }
      return 0;
    }

    deps.writeState(dismissAnnouncementState(state, id));
    const data = { success: true, id, dismissed: true };
    if (machineMode(args)) printMachine(args, 'announcements:dismiss', data, deps);
    else deps.stdout(`Dismissed announcement ${id}.`);
    return 0;
  } catch {
    return fail(args, `announcements:${action}`, 'Announcement operation failed', deps);
  }
}
