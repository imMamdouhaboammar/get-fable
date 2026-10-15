import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

export const prototypePollutionProbe: SecurityProbeModule = {
  id: 'prototype-pollution',
  name: 'Client/Server Prototype Pollution Boundary Probing',
  category: 'prototype-pollution',
  defaultSeverity: 'high',
  cwe: 'CWE-1321',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L',
  profiles: ['comprehensive', 'orchestrated', 'playbook'],

  match: (context: ProbeContext) => {
    return context.endpoints.some((ep) =>
      ep.url.includes('?') ||
      ['POST', 'PUT', 'PATCH'].includes(ep.method) ||
      (ep.parameters && ep.parameters.length > 0)
    );
  },

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, endpoints, options } = context;

    // 1. Query parameter prototype pollution: ?__proto__[polluted]=true
    const queryCandidates = endpoints.filter((ep) => ep.url.includes('?') || (ep.parameters && ep.parameters.length > 0));

    for (const ep of queryCandidates.slice(0, 4)) {
      try {
        const probeUrl = new URL(ep.url);
        probeUrl.searchParams.set('__proto__[__fable_proto_test__]', 'polluted');

        const res = await client.fetchText(probeUrl.toString(), {
          headers: options.authToken ? { Authorization: options.authToken } : {},
          timeoutMs: 2500,
        });

        // Indicators of insecure parameter parser (e.g. qs / Express extended parser parsing __proto__ into prototype)
        if (
          res.text.includes('"__fable_proto_test__":"polluted"') ||
          res.text.includes('TypeError: Cannot set property') ||
          res.text.includes('TypeError: Cannot create property')
        ) {
          findings.push({
            id: `PROTO-POLLUTION-QUERY-${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
            title: `Prototype Property Assignment via Query String on ${ep.path}`,
            category: 'prototype-pollution',
            severity: 'high',
            description: `The query parser on ${ep.path} processed '__proto__' properties directly, indicating potential prototype pollution vulnerability.`,
            target: probeUrl.toString(),
            evidence: {
              request: { method: 'GET', url: probeUrl.toString() },
              response: { status: res.status, snippet: res.text.slice(0, 300) },
              reproCurl: `curl -i -s "${probeUrl.toString()}"`,
            },
            remediation: 'Configure query parsers with { allowPrototypes: false } (e.g. app.set("query parser", "simple") or configure qs safely).',
            cwe: 'CWE-1321',
            evidenceLevel: 'reproduced',
            confidence: 0.92,
          });
          break;
        }
      } catch {
        // Continue
      }
    }

    // 2. JSON Body prototype pollution on mutating routes
    const jsonCandidates = endpoints.filter((ep) =>
      ['POST', 'PUT', 'PATCH'].includes(ep.method)
    );

    for (const ep of jsonCandidates.slice(0, 3)) {
      try {
        const payload = JSON.stringify({
          __proto__: { __fable_proto_test__: 'polluted' },
        });

        const res = await client.fetchText(ep.url, {
          method: ep.method,
          headers: {
            'Content-Type': 'application/json',
            ...(options.authToken ? { Authorization: options.authToken } : {}),
          },
          body: payload,
          timeoutMs: 2500,
        });

        if (
          res.text.includes('"__fable_proto_test__":"polluted"') ||
          res.text.includes('TypeError: Cannot assign to read only property') ||
          res.text.includes('TypeError: Cannot create property')
        ) {
          findings.push({
            id: `PROTO-POLLUTION-JSON-${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
            title: `JSON Body Prototype Pollution Vulnerability on ${ep.method} ${ep.path}`,
            category: 'prototype-pollution',
            severity: 'high',
            description: `The JSON deserialization or object-merge handler on ${ep.method} ${ep.path} accepted '__proto__' without filtering.`,
            target: ep.url,
            evidence: {
              request: { method: ep.method, url: ep.url, headers: { 'Content-Type': 'application/json' }, body: payload },
              response: { status: res.status, snippet: res.text.slice(0, 300) },
              reproCurl: `curl -i -s -X ${ep.method} "${ep.url}" -H "Content-Type: application/json" -d '${payload}'`,
            },
            remediation: 'Use Object.create(null) for dictionary maps or use recursive merge utilities with prototype protection.',
            cwe: 'CWE-1321',
            evidenceLevel: 'reproduced',
            confidence: 0.92,
          });
        }
      } catch {
        // Continue
      }
    }

    return findings;
  },
};
