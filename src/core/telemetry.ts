import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const TELEMETRY_MAX_LOG_BYTES = 1024 * 1024;
export const TELEMETRY_RETAINED_ROTATIONS = 2;

export interface TelemetryConfig {
  enabled: boolean;
  anonymousId: string;
  createdAt: string;
  lastEventAt: string | null;
  totalEvents: number;
}

export interface TelemetryEvent {
  timestamp: string;
  eventType: 'command' | 'skill_routed' | 'spark_evaluated' | 'evidence_added' | 'doctor_run';
  commandName?: string;
  skillId?: string;
  phase?: string;
  success: boolean;
  durationMs?: number;
  errorCategory?: string;
}

const EVENT_TYPES = new Set<TelemetryEvent['eventType']>([
  'command', 'skill_routed', 'spark_evaluated', 'evidence_added', 'doctor_run',
]);

function newConfig(): TelemetryConfig {
  return {
    enabled: false,
    anonymousId: `fable-${Math.random().toString(36).substring(2, 10)}`,
    createdAt: new Date().toISOString(),
    lastEventAt: null,
    totalEvents: 0,
  };
}

function validConfig(value: unknown): value is TelemetryConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v.enabled === 'boolean' &&
    typeof v.anonymousId === 'string' && v.anonymousId.startsWith('fable-') &&
    typeof v.createdAt === 'string' &&
    (v.lastEventAt === null || typeof v.lastEventAt === 'string') &&
    Number.isInteger(v.totalEvents) && Number(v.totalEvents) >= 0;
}

export function getTelemetryDir(): string {
  const override = process.env.FABLE_TELEMETRY_DIR?.trim();
  const dir = override ? path.resolve(override) : path.join(os.homedir(), '.fable');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

export function getTelemetryConfigPath(): string {
  return path.join(getTelemetryDir(), 'telemetry-config.json');
}

export function getTelemetryLogPath(): string {
  return path.join(getTelemetryDir(), 'telemetry.jsonl');
}

export function loadTelemetryConfig(): TelemetryConfig {
  const configPath = getTelemetryConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (validConfig(parsed)) return parsed;
    } catch {}
  }
  const config = newConfig();
  saveTelemetryConfig(config);
  return config;
}

export function saveTelemetryConfig(config: TelemetryConfig) {
  try {
    const safe = validConfig(config) ? config : newConfig();
    const target = getTelemetryConfigPath();
    const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(safe, null, 2)}\n`, { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(temp, target);
  } catch {
    // Telemetry configuration must never fail user command execution.
  }
}

function sanitizeEvent(event: Omit<TelemetryEvent, 'timestamp'>): TelemetryEvent | null {
  if (!EVENT_TYPES.has(event.eventType) || typeof event.success !== 'boolean') return null;
  const clean: TelemetryEvent = {
    timestamp: new Date().toISOString(),
    eventType: event.eventType,
    success: event.success,
  };
  if (typeof event.commandName === 'string') clean.commandName = event.commandName.slice(0, 120);
  if (typeof event.skillId === 'string') clean.skillId = event.skillId.slice(0, 120);
  if (typeof event.phase === 'string') clean.phase = event.phase.slice(0, 80);
  if (typeof event.durationMs === 'number' && Number.isFinite(event.durationMs) && event.durationMs >= 0) clean.durationMs = Math.round(event.durationMs);
  if (typeof event.errorCategory === 'string') clean.errorCategory = event.errorCategory.slice(0, 120);
  return clean;
}

function rotateTelemetryLogIfNeeded(incomingBytes: number): void {
  const target = getTelemetryLogPath();
  let current = 0;
  try { current = fs.statSync(target).size; } catch {}
  if (current + incomingBytes <= TELEMETRY_MAX_LOG_BYTES) return;
  for (let i = TELEMETRY_RETAINED_ROTATIONS; i >= 1; i -= 1) {
    const source = i === 1 ? target : `${target}.${i - 1}`;
    const dest = `${target}.${i}`;
    try {
      if (i === TELEMETRY_RETAINED_ROTATIONS && fs.existsSync(dest)) fs.unlinkSync(dest);
      if (fs.existsSync(source)) fs.renameSync(source, dest);
    } catch {}
  }
}

export function recordTelemetry(event: Omit<TelemetryEvent, 'timestamp'>) {
  try {
    const config = loadTelemetryConfig();
    if (!config.enabled) return;
    const fullEvent = sanitizeEvent(event);
    if (!fullEvent) return;
    const line = `${JSON.stringify(fullEvent)}\n`;
    rotateTelemetryLogIfNeeded(Buffer.byteLength(line));
    fs.appendFileSync(getTelemetryLogPath(), line, { encoding: 'utf-8', mode: 0o600, flag: 'a' });
    config.lastEventAt = fullEvent.timestamp;
    config.totalEvents += 1;
    saveTelemetryConfig(config);
  } catch {
    // Telemetry must never fail user command execution.
  }
}

export function getTelemetrySummary(): {
  config: TelemetryConfig;
  recentEvents: TelemetryEvent[];
  eventCountsByType: Record<string, number>;
} {
  const config = loadTelemetryConfig();
  const logPath = getTelemetryLogPath();
  const recentEvents: TelemetryEvent[] = [];
  const eventCountsByType: Record<string, number> = {};
  if (fs.existsSync(logPath)) {
    try {
      const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const ev = JSON.parse(line) as TelemetryEvent;
          if (!EVENT_TYPES.has(ev.eventType)) continue;
          eventCountsByType[ev.eventType] = (eventCountsByType[ev.eventType] || 0) + 1;
        } catch {}
      }
      for (const line of lines.slice(-10)) {
        try {
          const event = JSON.parse(line) as TelemetryEvent;
          if (EVENT_TYPES.has(event.eventType)) recentEvents.push(event);
        } catch {}
      }
    } catch {}
  }
  return { config, recentEvents, eventCountsByType };
}

export function clearTelemetryLogs() {
  try {
    const logPath = getTelemetryLogPath();
    if (fs.existsSync(logPath)) fs.writeFileSync(logPath, '', { encoding: 'utf-8', mode: 0o600 });
    for (let i = 1; i <= TELEMETRY_RETAINED_ROTATIONS; i += 1) {
      const rotated = `${logPath}.${i}`;
      if (fs.existsSync(rotated)) fs.unlinkSync(rotated);
    }
    const config = loadTelemetryConfig();
    config.totalEvents = 0;
    config.lastEventAt = null;
    saveTelemetryConfig(config);
  } catch {}
}
