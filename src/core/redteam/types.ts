export type RedTeamProfile = 'passive' | 'api-logic' | 'comprehensive';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingCategory =
  | 'auth-bypass'
  | 'idor-bola'
  | 'injection'
  | 'ssrf'
  | 'security-headers'
  | 'sensitive-exposure'
  | 'cors-misconfiguration';

export interface ScopeConfig {
  allowedHosts: string[];
  allowedPorts?: number[];
  allowLocalhost?: boolean;
  maxRequestsPerSecond?: number;
  safeMode?: boolean;
  excludedPaths?: string[];
}

export interface FindingEvidence {
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  };
  response?: {
    status: number;
    headers?: Record<string, string>;
    snippet?: string;
  };
  reproCurl?: string;
}

export interface RedTeamFinding {
  id: string;
  title: string;
  category: FindingCategory;
  severity: FindingSeverity;
  description: string;
  target: string;
  evidence: FindingEvidence;
  remediation: string;
  cwe?: string;
}

export interface RedTeamSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

export interface RedTeamResult {
  target: string;
  profile: RedTeamProfile;
  startTime: string;
  endTime: string;
  findings: RedTeamFinding[];
  summary: RedTeamSummary;
}

export interface ScanOptions {
  target: string;
  profile?: RedTeamProfile;
  scopeConfig?: ScopeConfig;
  scopeFilePath?: string;
  authToken?: string;
  secondAuthToken?: string;
  timeoutMs?: number;
  safeMode?: boolean;
  outputFormat?: 'json' | 'text';
}
