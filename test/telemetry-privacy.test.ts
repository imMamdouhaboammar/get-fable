import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getTelemetryConfigPath, getTelemetryLogPath, loadTelemetryConfig, recordTelemetry, saveTelemetryConfig } from '../src/core/telemetry.ts';

let dir = '';
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-telemetry-private-')); process.env.FABLE_TELEMETRY_DIR = dir; });
afterEach(() => { delete process.env.FABLE_TELEMETRY_DIR; fs.rmSync(dir, { recursive: true, force: true }); });

describe('telemetry privacy contract', () => {
  test('defaults disabled and a corrupt config also fails closed', () => {
    expect(loadTelemetryConfig().enabled).toBe(false);
    fs.writeFileSync(getTelemetryConfigPath(), '{broken');
    expect(loadTelemetryConfig().enabled).toBe(false);
  });

  test('persists only the telemetry allowlist even when extra sensitive fields are passed at runtime', () => {
    const config = loadTelemetryConfig(); config.enabled = true; saveTelemetryConfig(config);
    recordTelemetry({ eventType: 'command', commandName: 'doctor', success: true, prompt: 'SECRET PROMPT', token: 'sk-secret' } as any);
    const text = fs.readFileSync(getTelemetryLogPath(), 'utf-8');
    expect(text).toContain('doctor');
    expect(text).not.toContain('SECRET PROMPT');
    expect(text).not.toContain('sk-secret');
    expect(text).not.toContain('prompt');
    expect(text).not.toContain('token');
  });

  test('rotates an oversized local log instead of growing without a bound', () => {
    const config = loadTelemetryConfig(); config.enabled = true; saveTelemetryConfig(config);
    fs.writeFileSync(getTelemetryLogPath(), 'x'.repeat(1024 * 1024 + 8));
    recordTelemetry({ eventType: 'doctor_run', success: true });
    expect(fs.statSync(getTelemetryLogPath()).size).toBeLessThan(64 * 1024);
    expect(fs.existsSync(`${getTelemetryLogPath()}.1`)).toBe(true);
  });
});
