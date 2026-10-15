import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

export const corsProbe: SecurityProbeModule = {
  id: 'cors-misconfiguration',
  name: 'CORS Origin Reflection with Credentials',
  category: 'cors-misconfiguration',
  defaultSeverity: 'high',
  cwe: 'CWE-942',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:L/A:N',
  profiles: ['passive', 'api-logic', 'comprehensive', 'orchestrated', 'playbook', 'audit'],

  match: () => true,

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, endpoints, options, target } = context;

    const corsEndpoints = [target];
    for (const ep of endpoints) {
      if (!corsEndpoints.includes(ep.url) && corsEndpoints.length < 5) {
        corsEndpoints.push(ep.url);
      }
    }

    for (const endpointUrl of corsEndpoints) {
      try {
        const evilOrigin = 'https://fable-security-audit.com';
        const corsRes = await client.fetch(endpointUrl, {
          method: 'GET',
          headers: {
            Origin: evilOrigin,
            ...(options.authToken ? { Authorization: options.authToken } : {}),
          },
          timeoutMs: 2500,
        });

        const allowOrigin = corsRes.headers.get('access-control-allow-origin');
        const allowCreds = corsRes.headers.get('access-control-allow-credentials')?.toLowerCase() === 'true';

        if (allowOrigin === evilOrigin && allowCreds) {
          findings.push({
            id: `CORS-ARBITRARY-ORIGIN-WITH-CREDS-${new URL(endpointUrl).pathname.replace(/[^a-zA-Z0-9]/g, '_')}`,
            title: 'Vulnerable CORS Policy: Arbitrary Origin Reflection with Credentials',
            category: 'cors-misconfiguration',
            severity: 'high',
            description: `The server reflects arbitrary origin reflection (${evilOrigin}) with Access-Control-Allow-Credentials enabled, allowing malicious websites to read authenticated user responses.`,
            target: endpointUrl,
            evidence: {
              request: {
                method: 'GET',
                url: endpointUrl,
                headers: { Origin: evilOrigin },
              },
              response: {
                status: corsRes.status,
                headers: Object.fromEntries(corsRes.headers.entries()),
              },
              reproCurl: `curl -i -H "Origin: ${evilOrigin}" "${endpointUrl}"`,
            },
            remediation: 'Do not reflect arbitrary Origin headers. Validate incoming origins against a strict server-side allowlist.',
            cwe: 'CWE-942',
            evidenceLevel: 'reproduced',
            confidence: 0.95,
          });
        }
      } catch {
        // Ignore
      }
    }

    return findings;
  },
};
