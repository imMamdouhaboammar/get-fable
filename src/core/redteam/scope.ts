import fs from 'node:fs';
import path from 'node:path';
import type { ScopeConfig } from './types.js';

export const DEFAULT_SCOPE_CONFIG: ScopeConfig = {
  allowedHosts: ['localhost', '127.0.0.1', '::1'],
  allowLocalhost: true,
  safeMode: true,
  maxRequestsPerSecond: 10,
  excludedPaths: [],
};

function matchesHost(host: string, pattern: string): boolean {
  if (pattern === host) return true;
  if (pattern.startsWith('*.')) {
    const rootDomain = pattern.slice(2).toLowerCase();
    const targetHost = host.toLowerCase();
    return targetHost.endsWith(`.${rootDomain}`) || targetHost === rootDomain;
  }
  return false;
}

export function isTargetInScope(targetUrl: string, config: ScopeConfig = DEFAULT_SCOPE_CONFIG): boolean {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return false;
  }

  // Only http and https protocols are permitted
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

  // Check localhost policy
  if (isLoopback && config.allowLocalhost) {
    // permitted loopback
  } else {
    // Check allowed hosts
    const hostAllowed = (config.allowedHosts || []).some((pattern) => matchesHost(hostname, pattern));
    if (!hostAllowed) return false;
  }

  // Check port if restricted
  if (config.allowedPorts && config.allowedPorts.length > 0) {
    const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80;
    if (!config.allowedPorts.includes(port)) return false;
  }

  // Check excluded paths
  if (config.excludedPaths && config.excludedPaths.length > 0) {
    const pathname = parsed.pathname;
    const isExcluded = config.excludedPaths.some((excluded) =>
      pathname.startsWith(excluded) || pathname === excluded
    );
    if (isExcluded) return false;
  }

  return true;
}

export function validateScope(targetUrl: string, config: ScopeConfig = DEFAULT_SCOPE_CONFIG): void {
  if (!isTargetInScope(targetUrl, config)) {
    throw new Error(
      `Target URL ${targetUrl} is OUT OF ALLOWED SCOPE. RedTeam tests are restricted to configured safe domains.`
    );
  }
}

export function loadScopeConfig(configPath?: string): ScopeConfig {
  if (configPath && fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SCOPE_CONFIG,
        ...parsed,
        allowedHosts: parsed.allowedHosts || DEFAULT_SCOPE_CONFIG.allowedHosts,
      };
    } catch {
      // fallback to default safe config
    }
  }

  // Check default project location: .fable/redteam.json
  const defaultProjectConfig = path.resolve(process.cwd(), '.fable/redteam.json');
  if (fs.existsSync(defaultProjectConfig)) {
    try {
      const raw = fs.readFileSync(defaultProjectConfig, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SCOPE_CONFIG,
        ...parsed,
        allowedHosts: parsed.allowedHosts || DEFAULT_SCOPE_CONFIG.allowedHosts,
      };
    } catch {
      // fallback
    }
  }

  return DEFAULT_SCOPE_CONFIG;
}
