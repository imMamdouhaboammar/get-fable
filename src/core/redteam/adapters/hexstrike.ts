import { execSync } from 'node:child_process';
import type { AdapterContext, RedTeamFinding, ToolAdapterId } from '../types.js';
import { BaseToolAdapter } from './base.js';

export interface HexStrikeToolResult {
  tool: string;
  target: string;
  vulnerability?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  details: string;
  curlCommand?: string;
  cwe?: string;
}

export class HexStrikeAdapter extends BaseToolAdapter {
  readonly id: ToolAdapterId = 'hexstrike';
  readonly name = 'HexStrike-AI Tool Gateway';
  readonly description =
    'Context & execution gateway for 150+ automated security tools (Nuclei, Nmap, FFuf, Nikto)';

  private mcpEndpoint?: string;

  constructor(options?: { mcpEndpoint?: string }) {
    super();
    this.mcpEndpoint = options?.mcpEndpoint;
  }

  async isAvailable(): Promise<boolean> {
    if (this.mcpEndpoint) {
      try {
        const res = await fetch(`${this.mcpEndpoint}/health`, { signal: AbortSignal.timeout(1000) });
        if (res.ok) return true;
      } catch {
        // Fall through to CLI/Docker checks
      }
    }

    try {
      const output = execSync(
        'docker ps --filter "name=fable-redteam-hexstrike" --format "{{.Names}}" 2>/dev/null',
        { encoding: 'utf-8', timeout: 1500 }
      ).trim();
      if (output.includes('fable-redteam-hexstrike')) return true;
    } catch {
      // Docker command failed or container not running
    }

    try {
      const bin = execSync('which hexstrike 2>/dev/null', { encoding: 'utf-8', timeout: 1000 }).trim();
      return Boolean(bin);
    } catch {
      return false;
    }
  }

  parseToolOutput(rawResults: HexStrikeToolResult[]): RedTeamFinding[] {
    return rawResults.map((item) =>
      this.createFinding({
        title: item.vulnerability || `${item.tool.toUpperCase()} Security Finding`,
        category: this.mapToolCategory(item.tool, item.vulnerability),
        severity: item.severity,
        description: item.details,
        target: item.target,
        remediation: `Review and remediate finding identified by ${item.tool}.`,
        reproCurl: item.curlCommand || `curl -i -s -X GET "${item.target}"`,
        cwe: item.cwe || 'CWE-200',
        rawOutput: JSON.stringify(item),
      })
    );
  }

  private mapToolCategory(tool: string, vuln = ''): RedTeamFinding['category'] {
    const v = (vuln + ' ' + tool).toLowerCase();
    if (v.includes('inject') || v.includes('sql')) return 'injection';
    if (v.includes('ssrf')) return 'ssrf';
    if (v.includes('cors')) return 'cors-misconfiguration';
    if (v.includes('auth') || v.includes('token') || v.includes('jwt')) return 'auth-bypass';
    if (v.includes('idor') || v.includes('bola')) return 'idor-bola';
    if (v.includes('exposure') || v.includes('leak') || v.includes('env')) return 'sensitive-exposure';
    return 'security-headers';
  }

  async run(context: AdapterContext): Promise<RedTeamFinding[]> {
    const available = await this.isAvailable();
    if (!available) {
      return [];
    }

    // 1. Try MCP HTTP endpoint if configured
    if (this.mcpEndpoint) {
      try {
        const res = await fetch(`${this.mcpEndpoint}/tools/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: context.target,
            profile: context.profile,
            safeMode: context.safeMode,
          }),
          signal: AbortSignal.timeout(context.timeoutMs || 10000),
        });
        if (res.ok) {
          const data = (await res.json()) as HexStrikeToolResult[];
          if (Array.isArray(data)) {
            return this.parseToolOutput(data);
          }
        }
      } catch {
        // Fall back to CLI / Container checks
      }
    }

    // 2. Try hexstrike CLI binary
    try {
      const bin = execSync('which hexstrike 2>/dev/null', { encoding: 'utf-8', timeout: 1000 }).trim();
      if (bin) {
        const cmd = `hexstrike scan --target "${context.target}" --profile "${context.profile}" --json 2>/dev/null`;
        const rawJson = execSync(cmd, { encoding: 'utf-8', timeout: context.timeoutMs || 15000 });
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) {
          return this.parseToolOutput(parsed);
        }
      }
    } catch {
      // CLI execution not present or non-zero exit
    }

    return [];
  }
}
