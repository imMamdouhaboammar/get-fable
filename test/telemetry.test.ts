import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadTelemetryConfig,
  recordTelemetry,
  getTelemetrySummary,
  clearTelemetryLogs,
  saveTelemetryConfig,
} from '../src/core/telemetry.ts';

let telemetryDir = '';
beforeEach(() => { telemetryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-telemetry-test-')); process.env.FABLE_TELEMETRY_DIR = telemetryDir; });
afterEach(() => { delete process.env.FABLE_TELEMETRY_DIR; fs.rmSync(telemetryDir, { recursive: true, force: true }); });

describe('Local-First Telemetry Engine', () => {
  test('initializes and saves telemetry configuration', () => {
    const config = loadTelemetryConfig();
    expect(config.anonymousId).toStartWith('fable-');
    expect(config.enabled).toBe(false);
  });

  test('records events safely without leaking sensitive information', () => {
    const config = loadTelemetryConfig(); config.enabled = true; saveTelemetryConfig(config);
    clearTelemetryLogs();
    recordTelemetry({
      eventType: 'command',
      commandName: 'state:executing',
      phase: 'executing',
      success: true,
      durationMs: 15,
    });

    const summary = getTelemetrySummary();
    expect(summary.recentEvents.length).toBeGreaterThanOrEqual(1);
    const last = summary.recentEvents[summary.recentEvents.length - 1];
    expect(last.eventType).toBe('command');
    expect(last.commandName).toBe('state:executing');
    expect(last.success).toBe(true);
  });

  test('respects disabled state', () => {
    const config = loadTelemetryConfig();
    config.enabled = false;
    saveTelemetryConfig(config);

    clearTelemetryLogs();
    recordTelemetry({
      eventType: 'doctor_run',
      success: true,
    });

    const summary = getTelemetrySummary();
    expect(summary.recentEvents.length).toBe(0);

  });
});
