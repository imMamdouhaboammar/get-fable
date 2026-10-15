import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

const SENSITIVE_PATHS = [
  {
    path: '/.env',
    name: 'Environment Configuration File (.env)',
    indicators: ['DATABASE_URL', 'SECRET_KEY', 'API_KEY', 'PASSWORD', 'APP_ENV'],
    severity: 'critical' as const,
    cwe: 'CWE-200',
  },
  {
    path: '/.git/HEAD',
    name: 'Git Repository Metadata (.git/HEAD)',
    indicators: ['ref: refs/'],
    severity: 'critical' as const,
    cwe: 'CWE-538',
  },
  {
    path: '/docker-compose.yml',
    name: 'Docker Compose Infrastructure Configuration',
    indicators: ['version:', 'services:', 'image:'],
    severity: 'high' as const,
    cwe: 'CWE-200',
  },
  {
    path: '/.aws/credentials',
    name: 'AWS Cloud Credentials File',
    indicators: ['aws_access_key_id', 'aws_secret_access_key'],
    severity: 'critical' as const,
    cwe: 'CWE-522',
  },
  {
    path: '/actuator/health',
    name: 'Spring Boot Actuator Health Endpoint',
    indicators: ['"status":"UP"', '"status":"UNKNOWN"'],
    severity: 'low' as const,
    cwe: 'CWE-200',
  },
];

export const exposureProbe: SecurityProbeModule = {
  id: 'sensitive-exposure',
  name: 'Sensitive File & Infrastructure Exposure',
  category: 'sensitive-exposure',
  defaultSeverity: 'critical',
  cwe: 'CWE-200',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
  profiles: ['passive', 'api-logic', 'comprehensive', 'orchestrated', 'playbook', 'audit'],

  match: () => true,

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, rootUrl } = context;

    for (const item of SENSITIVE_PATHS) {
      try {
        const probeUrl = `${rootUrl}${item.path}`;
        const probeRes = await client.fetchText(probeUrl, { timeoutMs: 2500 });
        if (probeRes.status === 200) {
          const text = probeRes.text;
          const hasIndicator = item.indicators.some((ind) => text.includes(ind));
          if (hasIndicator) {
            findings.push({
              id: `EXPOSURE-${item.path.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`,
              title: `Exposed Sensitive File: ${item.name}`,
              category: 'sensitive-exposure',
              severity: item.severity,
              description: `The path ${item.path} returned HTTP 200 and contained verified sensitive indicators, potentially leaking credentials or source structure.`,
              target: probeUrl,
              evidence: {
                response: {
                  status: probeRes.status,
                  snippet: text.slice(0, 300),
                },
                reproCurl: `curl -i -s "${probeUrl}"`,
              },
              remediation: `Block public access to ${item.path} at the reverse proxy (Nginx, Cloudflare, Caddy) or web server configuration.`,
              cwe: item.cwe,
              evidenceLevel: 'reproduced',
              confidence: 0.98,
            });
          }
        }
      } catch {
        // Continue
      }
    }

    return findings;
  },
};
