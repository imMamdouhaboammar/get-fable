import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

export const graphqlProbe: SecurityProbeModule = {
  id: 'graphql-introspection',
  name: 'GraphQL Schema Introspection & Security Probing',
  category: 'graphql',
  defaultSeverity: 'medium',
  cwe: 'CWE-200',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
  profiles: ['passive', 'api-logic', 'comprehensive', 'orchestrated', 'playbook', 'audit'],

  match: (context: ProbeContext) => {
    return (
      context.target.includes('graphql') ||
      context.endpoints.some((ep) => ep.path.includes('graphql'))
    );
  },

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, endpoints, rootUrl, target } = context;

    const graphqlEndpoints = new Set<string>();
    if (target.includes('graphql')) graphqlEndpoints.add(target);
    for (const ep of endpoints) {
      if (ep.path.includes('graphql')) graphqlEndpoints.add(ep.url);
    }
    // Also test common standard GraphQL locations on the root domain
    graphqlEndpoints.add(`${rootUrl}/graphql`);
    graphqlEndpoints.add(`${rootUrl}/api/graphql`);

    const introspectionQuery = JSON.stringify({
      query: '{ __schema { types { name } } }',
    });

    for (const epUrl of Array.from(graphqlEndpoints).slice(0, 4)) {
      try {
        const res = await client.fetchText(epUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: introspectionQuery,
          timeoutMs: 2500,
        });

        if (res.status === 200 && res.text.includes('__schema') && res.text.includes('types')) {
          findings.push({
            id: `GRAPHQL-INTROSPECTION-ENABLED-${new URL(epUrl).pathname.replace(/[^a-zA-Z0-9]/g, '_')}`,
            title: `GraphQL Schema Introspection Enabled on ${new URL(epUrl).pathname}`,
            category: 'graphql',
            severity: 'medium',
            description: `The GraphQL endpoint at ${epUrl} allows unrestricted schema introspection, exposing internal types, fields, queries, and mutations to unauthenticated callers.`,
            target: epUrl,
            evidence: {
              request: {
                method: 'POST',
                url: epUrl,
                headers: { 'Content-Type': 'application/json' },
                body: introspectionQuery,
              },
              response: { status: res.status, snippet: res.text.slice(0, 300) },
              reproCurl: `curl -i -s -X POST "${epUrl}" -H "Content-Type: application/json" -d '${introspectionQuery}'`,
            },
            remediation: 'Disable GraphQL schema introspection in production environments (e.g., introspection: false in Apollo Server / Yoga / GraphQL Helix).',
            cwe: 'CWE-200',
            evidenceLevel: 'reproduced',
            confidence: 0.98,
          });
        }
      } catch {
        // Continue
      }
    }

    return findings;
  },
};
