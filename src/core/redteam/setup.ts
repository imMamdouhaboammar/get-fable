import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DOCKER_COMPOSE_TEMPLATE, MCP_CONFIG_TEMPLATE } from './docker-compose.template.js';
import type { EnvironmentPolicy, SetupDiagnostics, SetupOptions, SetupResult } from './types.js';

export const COLIMA_PROHIBITED_MESSAGE =
  'Colima is strictly prohibited in this workspace per system governance rules. ' +
  'Please use Docker Desktop, OrbStack, or native Podman.';

export const DEFAULT_ENVIRONMENT_POLICY: EnvironmentPolicy = {
  forbidColima: true,
  allowedContainerRuntimes: ['docker' as const, 'podman' as const, 'orbstack' as const, 'none' as const],
  enforceExecutionEnvelope: true,
};

export function checkColimaForbidden(): { detected: boolean; details?: string } {
  // 1. Check DOCKER_HOST environment variable
  const dockerHost = process.env.DOCKER_HOST || '';
  if (dockerHost.toLowerCase().includes('colima')) {
    return {
      detected: true,
      details: `DOCKER_HOST points to Colima socket: ${dockerHost}`,
    };
  }

  // 2. Check ~/.colima directory
  try {
    const colimaDir = path.join(os.homedir(), '.colima');
    if (fs.existsSync(colimaDir)) {
      return {
        detected: true,
        details: `Found Colima state directory at ${colimaDir}`,
      };
    }
  } catch {
    // Ignore filesystem read errors
  }

  // 3. Check which colima
  try {
    const colimaBin = execSync('which colima 2>/dev/null', { encoding: 'utf-8', timeout: 1000 }).trim();
    if (colimaBin) {
      return {
        detected: true,
        details: `Found Colima binary in PATH at ${colimaBin}`,
      };
    }
  } catch {
    // Expected when colima is not installed
  }

  return { detected: false };
}

export function checkEnvironmentPolicy(
  policy: EnvironmentPolicy = DEFAULT_ENVIRONMENT_POLICY
): { allowed: boolean; violation?: string } {
  if (policy.forbidColima) {
    const colima = checkColimaForbidden();
    if (colima.detected) {
      return {
        allowed: false,
        violation: `${COLIMA_PROHIBITED_MESSAGE} (${colima.details})`,
      };
    }
  }
  return { allowed: true };
}

export function detectContainerRuntime(): 'docker' | 'podman' | 'orbstack' | 'none' {
  // Check OrbStack first
  try {
    const orbstackDir = path.join(os.homedir(), '.orbstack');
    if (fs.existsSync(orbstackDir)) {
      return 'orbstack';
    }
  } catch {
    // Ignore
  }

  // Check Docker
  try {
    execSync('docker --version 2>/dev/null', { encoding: 'utf-8', timeout: 1500 });
    return 'docker';
  } catch {
    // Docker not available
  }

  // Check Podman
  try {
    execSync('podman --version 2>/dev/null', { encoding: 'utf-8', timeout: 1500 });
    return 'podman';
  } catch {
    // Podman not available
  }

  return 'none';
}

export function detectPythonRuntime(): string | undefined {
  try {
    const uvVer = execSync('uv --version 2>/dev/null', { encoding: 'utf-8', timeout: 1500 }).trim();
    if (uvVer) return uvVer;
  } catch {
    // uv not available
  }

  try {
    const pyVer = execSync('python3 --version 2>/dev/null', { encoding: 'utf-8', timeout: 1500 }).trim();
    if (pyVer) return pyVer;
  } catch {
    // python3 not available
  }

  return undefined;
}

export function detectMcpClients(cwd: string = process.cwd()): string[] {
  const detected: string[] = [];
  const home = os.homedir();

  // Check Cursor MCP configs
  if (fs.existsSync(path.join(home, '.cursor', 'mcp.json')) || fs.existsSync(path.join(cwd, '.cursor', 'mcp.json'))) {
    detected.push('Cursor');
  }

  // Check Gemini CLI / Antigravity settings
  if (fs.existsSync(path.join(home, '.gemini', 'settings.json')) || fs.existsSync(path.join(cwd, '.gemini', 'settings.json'))) {
    detected.push('Antigravity/Gemini');
  }

  // Check Claude Code configs
  if (fs.existsSync(path.join(home, '.claude.json')) || fs.existsSync(path.join(home, '.claude'))) {
    detected.push('Claude Code');
  }

  // Check Codex plugin configs
  if (fs.existsSync(path.join(cwd, '.codex-plugin')) || fs.existsSync(path.join(cwd, '.codex'))) {
    detected.push('OpenAI Codex');
  }

  return detected;
}

export function runDiagnostics(cwd: string = process.cwd()): SetupDiagnostics {
  const colimaCheck = checkColimaForbidden();
  const containerRuntime = detectContainerRuntime();
  const pythonRuntime = detectPythonRuntime();
  const mcpClients = detectMcpClients(cwd);

  const readyForOrchestration =
    !colimaCheck.detected && (containerRuntime !== 'none' || mcpClients.length > 0);

  return {
    colimaDetected: colimaCheck.detected,
    colimaDetails: colimaCheck.details,
    containerRuntime,
    pythonRuntime,
    mcpClients,
    readyForOrchestration,
  };
}

export function runRedTeamSetup(options: SetupOptions = {}): SetupResult {
  const cwd = options.cwd || process.cwd();
  const diagnostics = runDiagnostics(cwd);
  const policy = options.policy || DEFAULT_ENVIRONMENT_POLICY;

  const policyCheck = checkEnvironmentPolicy(policy);
  if (!policyCheck.allowed) {
    return {
      diagnostics,
      generatedFiles: [],
      success: false,
      error: policyCheck.violation,
    };
  }

  const generatedFiles: string[] = [];
  const fableDir = path.join(cwd, '.fable');
  const redteamDir = path.join(fableDir, 'redteam');

  fs.mkdirSync(redteamDir, { recursive: true });

  // 1. Generate docker-compose.yml if requested or default
  if (options.generateCompose !== false) {
    const composePath = path.join(redteamDir, 'docker-compose.yml');
    if (!fs.existsSync(composePath) || options.force) {
      fs.writeFileSync(composePath, DOCKER_COMPOSE_TEMPLATE, 'utf-8');
      generatedFiles.push(composePath);
    }
  }

  // 2. Generate mcp-config.json if requested or default
  if (options.generateMcp !== false) {
    const mcpPath = path.join(redteamDir, 'mcp-config.json');
    if (!fs.existsSync(mcpPath) || options.force) {
      fs.writeFileSync(mcpPath, JSON.stringify(MCP_CONFIG_TEMPLATE, null, 2), 'utf-8');
      generatedFiles.push(mcpPath);
    }
  }

  // 3. Generate default .fable/redteam.json scope configuration
  if (options.generateScope !== false) {
    const scopePath = path.join(fableDir, 'redteam.json');
    if (!fs.existsSync(scopePath) || options.force) {
      const defaultScope = {
        allowedHosts: ['127.0.0.1', 'localhost'],
        allowLocalhost: true,
        maxRequestsPerSecond: 10,
        safeMode: true,
        excludedPaths: ['/api/admin/reset-db', '/api/destructive'],
      };
      fs.writeFileSync(scopePath, JSON.stringify(defaultScope, null, 2), 'utf-8');
      generatedFiles.push(scopePath);
    }
  }

  return {
    diagnostics,
    generatedFiles,
    success: true,
  };
}
