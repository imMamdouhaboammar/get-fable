import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const raw = token.replace(/^Bearer\s+/i, '').trim();
    const parts = raw.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function createAlgNoneJwt(token: string): string | null {
  try {
    const raw = token.replace(/^Bearer\s+/i, '').trim();
    const parts = raw.split('.');
    if (parts.length !== 3) return null;
    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    return `Bearer ${noneHeader}.${parts[1]}.`;
  } catch {
    return null;
  }
}

export const jwtProbe: SecurityProbeModule = {
  id: 'jwt-auth-integrity',
  name: 'JWT & Authentication Boundary Verification',
  category: 'auth-bypass',
  defaultSeverity: 'critical',
  cwe: 'CWE-347',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
  profiles: ['passive', 'api-logic', 'comprehensive', 'orchestrated', 'playbook', 'audit'],

  match: () => true,

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, options, target } = context;

    if (options.authToken) {
      // 1. Test JWT "alg: none" bypass
      const algNoneToken = createAlgNoneJwt(options.authToken);
      if (algNoneToken) {
        try {
          const testRes = await client.fetch(target, {
            headers: { Authorization: algNoneToken },
            timeoutMs: 2500,
          });

          if (testRes.status === 200) {
            findings.push({
              id: 'JWT-ALG-NONE-SIGNATURE-BYPASS',
              title: 'Critical JWT Signature Bypass (alg: none accepted)',
              category: 'auth-bypass',
              severity: 'critical',
              description: 'The API accepted an unsigned JWT with "alg: none", permitting arbitrary token forgery without a private key.',
              target,
              evidence: {
                request: {
                  method: 'GET',
                  url: target,
                  headers: { Authorization: algNoneToken },
                },
                response: { status: testRes.status },
                reproCurl: `curl -i -s "${target}" -H "Authorization: ${algNoneToken}"`,
              },
              remediation: 'Reject JWTs with "alg: none" explicitly in token verification configuration.',
              cwe: 'CWE-347',
              evidenceLevel: 'reproduced',
              confidence: 0.99,
            });
          }
        } catch {
          // Continue
        }
      }

      // 2. Inspect JWT payload for missing expiration
      const payload = parseJwtPayload(options.authToken);
      if (payload && !payload.exp) {
        findings.push({
          id: 'JWT-MISSING-EXPIRATION-CLAIM',
          title: 'JWT Missing Expiration (exp) Claim',
          category: 'session-management',
          severity: 'medium',
          description: 'The supplied JWT token has no expiration (exp) timestamp claim, meaning stolen tokens never expire.',
          target,
          evidence: {
            rawOutput: JSON.stringify(payload),
          },
          remediation: 'Always include a short-lived "exp" expiration claim in issued JWTs.',
          cwe: 'CWE-613',
          evidenceLevel: 'observed',
          confidence: 0.9,
        });
      }

      // 3. Test unauthenticated access on target URL
      try {
        const authedRes = await client.fetch(target, {
          headers: { Authorization: options.authToken },
        });
        const unauthedRes = await client.fetchText(target, {
          headers: {},
        });

        if (authedRes.status === 200 && unauthedRes.status === 200 && unauthedRes.text.length > 2) {
          findings.push({
            id: 'AUTH-BYPASS-MISSING-ENFORCEMENT',
            title: 'Authentication Missing on Sensitive Resource',
            category: 'auth-bypass',
            severity: 'high',
            description: 'The endpoint returned HTTP 200 OK with data when called without any Authorization header, failing to enforce authentication.',
            target,
            evidence: {
              request: { method: 'GET', url: target },
              response: { status: unauthedRes.status, snippet: unauthedRes.text.slice(0, 300) },
              reproCurl: `curl -i -s "${target}"`,
            },
            remediation: 'Implement mandatory authentication middleware / guard before routing to this resource handler.',
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
