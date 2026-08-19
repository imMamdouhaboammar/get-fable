import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

export function getTelemetryDir(): string {
  const dir = path.join(os.homedir(), '.fable');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      // ignore corrupt config
    }
  }

  const newConfig: TelemetryConfig = {
    enabled: true,
    anonymousId: `fable-${Math.random().toString(36).substring(2, 10)}`,
    createdAt: new Date().toISOString(),
    lastEventAt: null,
    totalEvents: 0,
  };

  saveTelemetryConfig(newConfig);
  return newConfig;
}

export function saveTelemetryConfig(config: TelemetryConfig) {
  try {
    fs.writeFileSync(getTelemetryConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // ignore write errors
  }
}

export function recordTelemetry(event: Omit<TelemetryEvent, 'timestamp'>) {
  try {
    const config = loadTelemetryConfig();
    if (!config.enabled) return;

    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    const line = JSON.stringify(fullEvent) + '\n';
    fs.appendFileSync(getTelemetryLogPath(), line, 'utf-8');

    config.lastEventAt = fullEvent.timestamp;
    config.totalEvents += 1;
    saveTelemetryConfig(config);
  } catch {
    // telemetry must never fail user command execution
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
        const ev = JSON.parse(line) as TelemetryEvent;
        eventCountsByType[ev.eventType] = (eventCountsByType[ev.eventType] || 0) + 1;
      }
      const lastFew = lines.slice(-10);
      for (const line of lastFew) {
        recentEvents.push(JSON.parse(line));
      }
    } catch {
      // ignore read error
    }
  }

  return { config, recentEvents, eventCountsByType };
}

export function clearTelemetryLogs() {
  const logPath = getTelemetryLogPath();
  if (fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, '', 'utf-8');
  }
  const config = loadTelemetryConfig();
  config.totalEvents = 0;
  config.lastEventAt = null;
  saveTelemetryConfig(config);
}
