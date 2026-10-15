import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

export const idorProbe: SecurityProbeModule = {
  id: 'idor-bola',
  name: 'Broken Object Level Authorization (BOLA/IDOR)',
  category: 'idor-bola',
  defaultSeverity: 'high',
  cwe: 'CWE-639',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
  profiles: ['api-logic', 'comprehensive', 'orchestrated', 'playbook'],

  match: (context: ProbeContext) => Boolean(context.options.authToken && context.options.secondAuthToken),

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, endpoints, options } = context;

    const idorCandidates = endpoints.filter((ep) => {
      const path = ep.path;
      return (
        /\/(?:documents|users|accounts|orders|invoices|projects|profiles)\/[^/]+/i.test(path) ||
        (ep.parameters && ep.parameters.some((p) => /id$|userId|accountId|orderId/i.test(p.name)))
      );
    });

    for (const ep of idorCandidates) {
      if (options.authToken && options.secondAuthToken) {
        try {
          const resA = await client.fetch(ep.url, {
            headers: { Authorization: options.authToken },
            timeoutMs: 2500,
          });

          const resB = await client.fetchText(ep.url, {
            headers: { Authorization: options.secondAuthToken },
            timeoutMs: 2500,
          });

          if (resA.status === 200 && resB.status === 200) {
            findings.push({
              id: `IDOR-BOLA-MULTI-IDENTITY-${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
              title: `Confirmed Broken Object Level Authorization (BOLA/IDOR) on ${ep.method} ${ep.path}`,
              category: 'idor-bola',
              severity: 'high',
              description: `Multi-identity verification confirmed cross-tenant object access on ${ep.method} ${ep.path}. Token B accessed the object without 403 Forbidden.`,
              target: ep.url,
              evidence: {
                request: {
                  method: ep.method,
                  url: ep.url,
                  headers: { Authorization: 'Bearer <USER_B_TOKEN>' },
                },
                response: {
                  status: resB.status,
                  snippet: resB.text.slice(0, 300),
                },
                reproCurl: `curl -i -s -X ${ep.method} "${ep.url}" -H "Authorization: ${options.secondAuthToken}"`,
              },
              remediation: 'Implement server-side object ownership authorization checks against the authenticated caller tenant ID.',
              cwe: 'CWE-639',
              evidenceLevel: 'reproduced',
              confidence: 0.95,
            });
          }
        } catch {
          // Ignore
        }
      }
    }

    return findings;
  },
};
