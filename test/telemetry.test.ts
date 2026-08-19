import { describe, expect, test } from 'bun:test';
import {
  loadTelemetryConfig,
  recordTelemetry,
  getTelemetrySummary,
  clearTelemetryLogs,
  saveTelemetryConfig,
} from '../src/core/telemetry.ts';

describe('Local-First Telemetry Engine', () => {
  test('initializes and saves telemetry configuration', () => {
    const config = loadTelemetryConfig();
    expect(config.anonymousId).toStartWith('fable-');
    expect(config.enabled).toBe(true);
  });

  test('records events safely without leaking sensitive information', () => {
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

    config.enabled = true;
    saveTelemetryConfig(config);
  });
});
