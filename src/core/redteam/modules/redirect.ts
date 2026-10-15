import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

export const redirectProbe: SecurityProbeModule = {
  id: 'open-redirect',
  name: 'Unvalidated Open Redirect Probing',
  category: 'business-logic',
  defaultSeverity: 'medium',
  cwe: 'CWE-601',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N',
  profiles: ['comprehensive', 'orchestrated'],

  match: () => true,

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, endpoints } = context;

    const redirectCandidates = endpoints.filter((ep) => {
      const url = ep.url.toLowerCase();
      return (
        url.includes('redirect') ||
        url.includes('next=') ||
        url.includes('return=') ||
        url.includes('return_to=')
      );
    });

    for (const ep of redirectCandidates) {
      try {
        const evilUrl = 'https://fable-security-audit.com';
        const probeUrl = new URL(ep.url);
        const paramNames = Array.from(probeUrl.searchParams.keys());
        if (paramNames.length === 0) paramNames.push('url');

        for (const p of paramNames) {
          probeUrl.searchParams.set(p, evilUrl);
          const res = await client.fetch(probeUrl.toString(), {
            redirect: 'manual',
            timeoutMs: 2500,
          });

          const location = res.headers.get('location');
          if ([301, 302, 303, 307, 308].includes(res.status) && location && location.includes('fable-security-audit.com')) {
            findings.push({
              id: `OPEN-REDIRECT-${p}`,
              title: `Unvalidated Open Redirect on parameter '${p}'`,
              category: 'business-logic',
              severity: 'medium',
              description: `Endpoint performs an open redirect to an arbitrary attacker-controlled domain (${evilUrl}) specified in parameter '${p}'.`,
              target: probeUrl.toString(),
              evidence: {
                request: { method: 'GET', url: probeUrl.toString() },
                response: { status: res.status, headers: { location } },
                reproCurl: `curl -i -s "${probeUrl.toString()}"`,
              },
              remediation: 'Validate redirect target URLs against an internal relative path pattern or strict domain allowlist.',
              cwe: 'CWE-601',
              evidenceLevel: 'reproduced',
              confidence: 0.95,
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
