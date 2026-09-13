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

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return false;
  const [range, bitsStr] = cidr.split('/');
  if (!range || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(range)) return false;
  const bits = bitsStr !== undefined ? parseInt(bitsStr, 10) : 32;
  if (isNaN(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  try {
    const ipInt = ipToInt(ip);
    const rangeInt = ipToInt(range);
    return (ipInt & mask) === (rangeInt & mask);
  } catch {
    return false;
  }
}

export function isCloudMetadataIp(host: string): boolean {
  const h = host.toLowerCase().trim();
  return h === '169.254.169.254' || h === '100.100.100.200' || h === 'metadata.google.internal';
}

export function isRfc1918PrivateIp(ip: string): boolean {
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return false;
  return (
    isIpInCidr(ip, '10.0.0.0/8') ||
    isIpInCidr(ip, '172.16.0.0/12') ||
    isIpInCidr(ip, '192.168.0.0/16') ||
    isIpInCidr(ip, '169.254.0.0/16')
  );
}

export function validateMaintenanceWindow(
  window?: ScopeConfig['maintenanceWindow'],
  currentUtcHour: number = new Date().getUTCHours()
): { allowed: boolean; reason?: string } {
  if (!window || !window.enforce) return { allowed: true };
  const { startUtcHour, endUtcHour } = window;
  let inWindow = false;
  if (startUtcHour <= endUtcHour) {
    inWindow = currentUtcHour >= startUtcHour && currentUtcHour <= endUtcHour;
  } else {
    // Overnight window (e.g. 22:00 to 04:00)
    inWindow = currentUtcHour >= startUtcHour || currentUtcHour <= endUtcHour;
  }
  if (!inWindow) {
    return {
      allowed: false,
      reason: `Current time (${currentUtcHour}:00 UTC) is outside permitted maintenance window (${startUtcHour}:00-${endUtcHour}:00 UTC)`,
    };
  }
  return { allowed: true };
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

  // Check Maintenance Window
  if (config.maintenanceWindow?.enforce) {
    const windowCheck = validateMaintenanceWindow(config.maintenanceWindow);
    if (!windowCheck.allowed) return false;
  }

  // Guard: Cloud metadata protection
  if (isCloudMetadataIp(hostname)) {
    const isExplicitlyWhitelisted = (config.allowedHosts || []).includes(hostname);
    if (!isExplicitlyWhitelisted) return false;
  }

  // Check CIDR allowed ranges
  let matchedCidr = false;
  if (config.allowedCidrs && config.allowedCidrs.length > 0) {
    matchedCidr = config.allowedCidrs.some((cidr) => isIpInCidr(hostname, cidr));
  }

  // Check localhost policy
  if (isLoopback && config.allowLocalhost) {
    // permitted loopback
  } else if (matchedCidr) {
    // permitted by CIDR
  } else {
    // Check RFC1918 Private IP policy
    if (isRfc1918PrivateIp(hostname) && !config.allowPrivateIps) {
      // Internal IP requires explicit allowPrivateIps or matching allowedCidrs
      const hostAllowed = (config.allowedHosts || []).some((pattern) => matchesHost(hostname, pattern));
      if (!hostAllowed) return false;
    } else {
      // Check allowed hosts
      const hostAllowed = (config.allowedHosts || []).some((pattern) => matchesHost(hostname, pattern));
      if (!hostAllowed) return false;
    }
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
