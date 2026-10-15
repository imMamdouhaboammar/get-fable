import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

export const mutationProbe: SecurityProbeModule = {
  id: 'unauthenticated-state-mutation',
  name: 'Unauthenticated State Mutation Allowed',
  category: 'auth-bypass',
  defaultSeverity: 'high',
  cwe: 'CWE-306',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N',
  profiles: ['passive', 'api-logic', 'comprehensive', 'orchestrated', 'playbook', 'audit'],

  match: (context: ProbeContext) => context.endpoints.some((ep) => ['POST', 'PUT', 'DELETE', 'PATCH'].includes(ep.method)),

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, endpoints } = context;

    const mutationEndpoints = endpoints.filter((ep) =>
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(ep.method)
    );

    for (const ep of mutationEndpoints.slice(0, 5)) {
      try {
        const res = await client.fetchText(ep.url, {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testProbe: true }),
          timeoutMs: 2500,
        });

        if ([200, 201, 202, 204].includes(res.status)) {
          findings.push({
            id: `UNAUTHENTICATED-STATE-MUTATION-${ep.method}-${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
            title: `Unauthenticated State Mutation Allowed on ${ep.method} ${ep.path}`,
            category: 'auth-bypass',
            severity: 'high',
            description: `The state-modifying route ${ep.method} ${ep.path} accepted requests without any Authorization credentials and returned HTTP ${res.status}.`,
            target: ep.url,
            evidence: {
              request: { method: ep.method, url: ep.url },
              response: { status: res.status, snippet: res.text.slice(0, 300) },
              reproCurl: `curl -i -s -X ${ep.method} "${ep.url}"`,
            },
            remediation: 'Apply authentication and authorization guards to all state-mutating HTTP methods.',
            cwe: 'CWE-306',
            evidenceLevel: 'reproduced',
            confidence: 0.95,
          });
        }
      } catch {
        // Continue
      }
    }

    return findings;
  },
};
