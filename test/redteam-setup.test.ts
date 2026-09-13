import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  COLIMA_PROHIBITED_MESSAGE,
  checkColimaForbidden,
  detectContainerRuntime,
  detectMcpClients,
  runDiagnostics,
  runRedTeamSetup,
} from '../src/core/redteam/setup.ts';

describe('RedTeam Environment Diagnostics & Setup', () => {
  let tmpDir: string;
  const originalDockerHost = process.env.DOCKER_HOST;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-redteam-setup-test-'));
  });

  afterEach(() => {
    if (originalDockerHost === undefined) {
      delete process.env.DOCKER_HOST;
    } else {
      process.env.DOCKER_HOST = originalDockerHost;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('detects and forbids Colima when DOCKER_HOST points to colima', () => {
    process.env.DOCKER_HOST = 'unix:///Users/user/.colima/default/docker.sock';
    const check = checkColimaForbidden();
    expect(check.detected).toBe(true);
    expect(check.details).toContain('Colima');

    const result = runRedTeamSetup({ cwd: tmpDir });
    expect(result.success).toBe(false);
    expect(result.error).toContain(COLIMA_PROHIBITED_MESSAGE);
    expect(result.generatedFiles.length).toBe(0);
  });

  test('passes Colima check when DOCKER_HOST is normal or unset', () => {
    delete process.env.DOCKER_HOST;
    const check = checkColimaForbidden();
    // In CI or environments without colima installed, detected is false
    // If running on a host with ~/.colima, it will reflect real environment
    if (!fs.existsSync(path.join(os.homedir(), '.colima'))) {
      expect(check.detected).toBe(false);
    }
  });

  test('runs diagnostics and detects container runtime safely', () => {
    const diag = runDiagnostics(tmpDir);
    expect(['docker', 'podman', 'orbstack', 'none']).toContain(diag.containerRuntime);
    expect(Array.isArray(diag.mcpClients)).toBe(true);
  });

  test('provisions docker-compose, mcp-config, and scope JSON in workspace', () => {
    delete process.env.DOCKER_HOST;
    // Skip if colima is globally present on test host
    if (checkColimaForbidden().detected) return;

    const result = runRedTeamSetup({ cwd: tmpDir });
    expect(result.success).toBe(true);
    expect(result.generatedFiles.length).toBeGreaterThanOrEqual(2);

    const composePath = path.join(tmpDir, '.fable/redteam/docker-compose.yml');
    const mcpPath = path.join(tmpDir, '.fable/redteam/mcp-config.json');
    const scopePath = path.join(tmpDir, '.fable/redteam.json');

    expect(fs.existsSync(composePath)).toBe(true);
    expect(fs.existsSync(mcpPath)).toBe(true);
    expect(fs.existsSync(scopePath)).toBe(true);

    const composeContent = fs.readFileSync(composePath, 'utf-8');
    expect(composeContent).toContain('hexstrike-mcp');
    expect(composeContent).toContain('akto-mini');
    expect(composeContent).toContain('pentagi-sandbox');

    const mcpContent = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    expect(mcpContent.mcpServers.hexstrike).toBeDefined();

    const scopeContent = JSON.parse(fs.readFileSync(scopePath, 'utf-8'));
    expect(scopeContent.allowLocalhost).toBe(true);
    expect(scopeContent.safeMode).toBe(true);
  });

  test('respects flags --no-compose and --no-mcp', () => {
    delete process.env.DOCKER_HOST;
    if (checkColimaForbidden().detected) return;

    const result = runRedTeamSetup({
      cwd: tmpDir,
      generateCompose: false,
      generateMcp: false,
      generateScope: true,
    });

    expect(result.success).toBe(true);
    const composePath = path.join(tmpDir, '.fable/redteam/docker-compose.yml');
    const mcpPath = path.join(tmpDir, '.fable/redteam/mcp-config.json');
    const scopePath = path.join(tmpDir, '.fable/redteam.json');

    expect(fs.existsSync(composePath)).toBe(false);
    expect(fs.existsSync(mcpPath)).toBe(false);
    expect(fs.existsSync(scopePath)).toBe(true);
  });
});
