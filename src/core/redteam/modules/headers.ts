import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

export const headersProbe: SecurityProbeModule = {
  id: 'security-headers',
  name: 'HTTP Security Headers & Information Disclosure',
  category: 'security-headers',
  defaultSeverity: 'medium',
  cwe: 'CWE-1021',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N',
  profiles: ['passive', 'api-logic', 'comprehensive', 'orchestrated', 'playbook', 'audit'],

  match: () => true,

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, options, target } = context;
    const targetUrl = new URL(target);

    try {
      const res = await client.fetch(target, {
        method: 'GET',
        headers: options.authToken ? { Authorization: options.authToken } : {},
        timeoutMs: 3000,
      });

      const headers = res.headers;

      // 1. Check CSP
      if (!headers.get('content-security-policy')) {
        findings.push({
          id: 'SEC-HEADER-CSP',
          title: 'Missing Content-Security-Policy Header',
          category: 'security-headers',
          severity: 'medium',
          description: 'The response does not specify a Content-Security-Policy header, increasing risk of XSS and data injection.',
          target,
          evidence: {
            response: {
              status: res.status,
              headers: Object.fromEntries(headers.entries()),
            },
            reproCurl: `curl -i -s "${target}"`,
          },
          remediation: "Add a strict 'Content-Security-Policy' HTTP response header restricting script and object sources.",
          cwe: 'CWE-1021',
          evidenceLevel: 'observed',
          confidence: 0.95,
        });
      }

      // 2. Check X-Frame-Options
      if (!headers.get('x-frame-options') && !headers.get('content-security-policy')?.includes('frame-ancestors')) {
        findings.push({
          id: 'SEC-HEADER-XFO',
          title: 'Missing X-Frame-Options (Clickjacking Protection)',
          category: 'security-headers',
          severity: 'low',
          description: 'Missing X-Frame-Options or CSP frame-ancestors directive allows the application to be embedded in iframes.',
          target,
          evidence: {
            response: {
              status: res.status,
              headers: Object.fromEntries(headers.entries()),
            },
            reproCurl: `curl -i -s "${target}"`,
          },
          remediation: "Configure 'X-Frame-Options: DENY' or 'X-Frame-Options: SAMEORIGIN'.",
          cwe: 'CWE-1021',
          evidenceLevel: 'observed',
          confidence: 0.95,
        });
      }

      // 3. Check X-Content-Type-Options
      if (headers.get('x-content-type-options')?.toLowerCase() !== 'nosniff') {
        findings.push({
          id: 'SEC-HEADER-XCTO',
          title: 'Missing X-Content-Type-Options Header',
          category: 'security-headers',
          severity: 'low',
          description: 'Without X-Content-Type-Options: nosniff, browsers may MIME-sniff response bodies into executable scripts.',
          target,
          evidence: {
            response: {
              status: res.status,
              headers: Object.fromEntries(headers.entries()),
            },
            reproCurl: `curl -i -s "${target}"`,
          },
          remediation: "Set 'X-Content-Type-Options: nosniff' header on all HTTP responses.",
          cwe: 'CWE-79',
          evidenceLevel: 'observed',
          confidence: 0.95,
        });
      }

      // 4. Check HSTS if HTTPS
      if (targetUrl.protocol === 'https:' && !headers.get('strict-transport-security')) {
        findings.push({
          id: 'SEC-HEADER-HSTS',
          title: 'Missing Strict-Transport-Security (HSTS) Header',
          category: 'security-headers',
          severity: 'medium',
          description: 'HTTPS endpoint does not enforce HSTS, permitting potential SSL-stripping man-in-the-middle attacks.',
          target,
          evidence: {
            response: {
              status: res.status,
              headers: Object.fromEntries(headers.entries()),
            },
            reproCurl: `curl -i -s "${target}"`,
          },
          remediation: "Configure 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload'.",
          cwe: 'CWE-523',
          evidenceLevel: 'observed',
          confidence: 0.95,
        });
      }

      // 5. Check Leaked Server & Tech Disclosure
      const serverHeader = headers.get('server');
      const poweredBy = headers.get('x-powered-by');
      if (serverHeader && /\d+\.\d+/.test(serverHeader)) {
        findings.push({
          id: 'INFO-LEAK-SERVER-VERSION',
          title: `Server Software Version Disclosed: ${serverHeader}`,
          category: 'security-headers',
          severity: 'low',
          description: `The Server response header discloses specific version details (${serverHeader}), aiding attackers in fingerprinting known CVEs.`,
          target,
          evidence: {
            response: { status: res.status, headers: { server: serverHeader } },
            reproCurl: `curl -I -s "${target}"`,
          },
          remediation: 'Configure your web server or reverse proxy to omit detailed version banners from the Server header.',
          cwe: 'CWE-200',
          evidenceLevel: 'observed',
          confidence: 0.9,
        });
      }

      if (poweredBy) {
        findings.push({
          id: 'INFO-LEAK-X-POWERED-BY',
          title: `Technology Stack Disclosed in X-Powered-By: ${poweredBy}`,
          category: 'security-headers',
          severity: 'low',
          description: `The X-Powered-By header discloses backend framework details (${poweredBy}).`,
          target,
          evidence: {
            response: { status: res.status, headers: { 'x-powered-by': poweredBy } },
            reproCurl: `curl -I -s "${target}"`,
          },
          remediation: 'Disable the X-Powered-By header in your application framework settings.',
          cwe: 'CWE-200',
          evidenceLevel: 'observed',
          confidence: 0.9,
        });
      }
    } catch {
      // Continue
    }

    return findings;
  },
};
