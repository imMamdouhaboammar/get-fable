import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

export const cookieProbe: SecurityProbeModule = {
  id: 'cookie-governance-csrf',
  name: 'Cookie Security Governance & CSRF Protection',
  category: 'csrf',
  defaultSeverity: 'medium',
  cwe: 'CWE-1275',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N',
  profiles: ['passive', 'api-logic', 'comprehensive', 'orchestrated', 'playbook', 'audit'],

  match: () => true,

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, options, target } = context;
    const isHttps = new URL(target).protocol === 'https:';

    try {
      const res = await client.fetch(target, {
        method: 'GET',
        headers: options.authToken ? { Authorization: options.authToken } : {},
        timeoutMs: 3000,
      });

      const rawSetCookie = res.headers.get('set-cookie');
      if (!rawSetCookie) return findings;

      // May be comma-delimited or multiple cookies
      const cookieLines = rawSetCookie.split(/,\s*(?=[a-zA-Z0-9_-]+=)/);

      for (const line of cookieLines) {
        const parts = line.split(';').map((p) => p.trim());
        const cookieName = parts[0]?.split('=')[0] || 'cookie';
        const isSessionCookie = /(?:sess|token|auth|jwt|id|sid|user)/i.test(cookieName);

        const hasHttpOnly = parts.some((p) => p.toLowerCase() === 'httponly');
        const hasSecure = parts.some((p) => p.toLowerCase() === 'secure');
        const sameSitePart = parts.find((p) => p.toLowerCase().startsWith('samesite='));
        const sameSiteValue = sameSitePart ? sameSitePart.split('=')[1]?.toLowerCase() : undefined;

        // 1. Missing SameSite or SameSite=None without proper protection (CSRF)
        if (!sameSiteValue || sameSiteValue === 'none') {
          findings.push({
            id: `COOKIE-SAMESITE-MISSING-${cookieName.replace(/[^a-zA-Z0-9]/g, '_')}`,
            title: `Cookie '${cookieName}' Missing SameSite Protection (CSRF Risk)`,
            category: 'csrf',
            severity: isSessionCookie ? 'medium' : 'low',
            description: `The cookie '${cookieName}' does not declare 'SameSite=Lax' or 'SameSite=Strict', allowing the browser to send it with cross-site requests.`,
            target,
            evidence: {
              response: { status: res.status, snippet: line },
              reproCurl: `curl -i -s "${target}"`,
            },
            remediation: `Configure 'SameSite=Lax' or 'SameSite=Strict' on the '${cookieName}' cookie.`,
            cwe: 'CWE-1275',
            evidenceLevel: 'observed',
            confidence: 0.95,
          });
        }

        // 2. Missing HttpOnly on session cookie
        if (isSessionCookie && !hasHttpOnly) {
          findings.push({
            id: `COOKIE-HTTPONLY-MISSING-${cookieName.replace(/[^a-zA-Z0-9]/g, '_')}`,
            title: `Sensitive Cookie '${cookieName}' Missing HttpOnly Flag`,
            category: 'csrf',
            severity: 'medium',
            description: `The session/authentication cookie '${cookieName}' is accessible via client-side JavaScript (missing HttpOnly), increasing XSS session theft risk.`,
            target,
            evidence: {
              response: { status: res.status, snippet: line },
              reproCurl: `curl -i -s "${target}"`,
            },
            remediation: `Set the 'HttpOnly' flag on the '${cookieName}' cookie header.`,
            cwe: 'CWE-1004',
            evidenceLevel: 'observed',
            confidence: 0.95,
          });
        }

        // 3. Missing Secure flag on HTTPS
        if (isHttps && isSessionCookie && !hasSecure) {
          findings.push({
            id: `COOKIE-SECURE-MISSING-${cookieName.replace(/[^a-zA-Z0-9]/g, '_')}`,
            title: `Cookie '${cookieName}' Transmitted Without Secure Flag Over HTTPS`,
            category: 'csrf',
            severity: 'medium',
            description: `The cookie '${cookieName}' was set over HTTPS without the 'Secure' directive, risking interception over plaintext HTTP fallback.`,
            target,
            evidence: {
              response: { status: res.status, snippet: line },
              reproCurl: `curl -i -s "${target}"`,
            },
            remediation: `Set the 'Secure' flag on the '${cookieName}' cookie header.`,
            cwe: 'CWE-614',
            evidenceLevel: 'observed',
            confidence: 0.95,
          });
        }
      }
    } catch {
      // Continue
    }

    return findings;
  },
};
