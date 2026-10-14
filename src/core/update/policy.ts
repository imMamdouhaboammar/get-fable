export interface PassiveCheckContext {
  autoCheck: boolean;
  cacheFresh: boolean;
  isCI: boolean;
  isTTY: boolean;
  jsonMode: boolean;
  jsonV1Mode: boolean;
  command: string;
}

export interface PassiveCheckDecision {
  allowed: boolean;
  reason:
    | 'interactive-stale-cache'
    | 'auto-check-disabled'
    | 'fresh-cache'
    | 'ci'
    | 'non-tty'
    | 'machine-output'
    | 'explicit-update-channel';
}

const EXPLICIT_UPDATE_CHANNELS = new Set(['update', 'announcements']);

export function decidePassiveCheck(context: PassiveCheckContext): PassiveCheckDecision {
  if (!context.autoCheck) {
    return { allowed: false, reason: 'auto-check-disabled' };
  }
  if (context.cacheFresh) {
    return { allowed: false, reason: 'fresh-cache' };
  }
  if (context.isCI) {
    return { allowed: false, reason: 'ci' };
  }
  if (!context.isTTY) {
    return { allowed: false, reason: 'non-tty' };
  }
  if (context.jsonMode || context.jsonV1Mode) {
    return { allowed: false, reason: 'machine-output' };
  }
  if (EXPLICIT_UPDATE_CHANNELS.has(context.command)) {
    return { allowed: false, reason: 'explicit-update-channel' };
  }
  return { allowed: true, reason: 'interactive-stale-cache' };
}
