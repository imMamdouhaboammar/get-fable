import { validateScope } from './scope.js';
import type { RedTeamFinding, ScanOptions } from './types.js';

const SENSITIVE_PATHS = [
  {
    path: '/.env',
    name: 'Environment Configuration File (.env)',
    indicators: ['DATABASE_URL', 'SECRET_KEY', 'API_KEY', 'PASSWORD', 'APP_ENV'],
    severity: 'critical' as const,
    cwe: 'CWE-200',
  },
  {
    path: '/.git/HEAD',
    name: 'Git Repository Metadata (.git/HEAD)',
    indicators: ['ref: refs/'],
    severity: 'critical' as const,
    cwe: 'CWE-538',
  },
  {
    path: '/actuator/health',
    name: 'Spring Boot Actuator Health Endpoint',
    indicators: ['"status":"UP"', '"status":"UNKNOWN"'],
    severity: 'low' as const,
    cwe: 'CWE-200',
  },
];

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function runSecurityProbes(options: ScanOptions): Promise<RedTeamFinding[]> {
  validateScope(options.target, options.scopeConfig);

  const findings: RedTeamFinding[] = [];
  const profile = options.profile || 'passive';
  const targetUrl = new URL(options.target);
  const rootUrl = `${targetUrl.protocol}//${targetUrl.host}`;

  // 1. Check Root & Target for Missing Security Headers
  try {
    const res = await fetchWithTimeout(options.target, {
      method: 'GET',
      headers: options.authToken ? { Authorization: options.authToken } : {},
    });

    const headers = res.headers;

    // Check CSP
    if (!headers.get('content-security-policy')) {
      findings.push({
        id: 'SEC-HEADER-CSP',
        title: 'Missing Content-Security-Policy Header',
        category: 'security-headers',
        severity: 'medium',
        description: 'The response does not specify a Content-Security-Policy header, increasing risk of XSS and data injection.',
        target: options.target,
        evidence: {
          response: {
            status: res.status,
            headers: Object.fromEntries(headers.entries()),
          },
        },
        remediation: "Add a strict 'Content-Security-Policy' HTTP response header restricting script and object sources.",
        cwe: 'CWE-1021',
      });
    }

    // Check X-Frame-Options
    if (!headers.get('x-frame-options') && !headers.get('content-security-policy')?.includes('frame-ancestors')) {
      findings.push({
        id: 'SEC-HEADER-XFO',
        title: 'Missing X-Frame-Options (Clickjacking Protection)',
        category: 'security-headers',
        severity: 'low',
        description: 'Missing X-Frame-Options or CSP frame-ancestors directive allows the application to be embedded in iframes.',
        target: options.target,
        evidence: {
          response: {
            status: res.status,
            headers: Object.fromEntries(headers.entries()),
          },
        },
        remediation: "Configure 'X-Frame-Options: DENY' or 'X-Frame-Options: SAMEORIGIN'.",
        cwe: 'CWE-1021',
      });
    }

    // Check X-Content-Type-Options
    if (headers.get('x-content-type-options')?.toLowerCase() !== 'nosniff') {
      findings.push({
        id: 'SEC-HEADER-XCTO',
        title: 'Missing X-Content-Type-Options Header',
        category: 'security-headers',
        severity: 'low',
        description: 'Without X-Content-Type-Options: nosniff, browsers may MIME-sniff response bodies into executable scripts.',
        target: options.target,
        evidence: {
          response: {
            status: res.status,
            headers: Object.fromEntries(headers.entries()),
          },
        },
        remediation: "Set 'X-Content-Type-Options: nosniff' header on all HTTP responses.",
        cwe: 'CWE-79',
      });
    }

    // Check HSTS if HTTPS
    if (targetUrl.protocol === 'https:' && !headers.get('strict-transport-security')) {
      findings.push({
        id: 'SEC-HEADER-HSTS',
        title: 'Missing Strict-Transport-Security (HSTS) Header',
        category: 'security-headers',
        severity: 'medium',
        description: 'HTTPS endpoint does not enforce HSTS, permitting potential SSL-stripping man-in-the-middle attacks.',
        target: options.target,
        evidence: {
          response: {
            status: res.status,
            headers: Object.fromEntries(headers.entries()),
          },
        },
        remediation: "Configure 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload'.",
        cwe: 'CWE-523',
      });
    }
  } catch {
    // Continue probing other surfaces
  }

  // 2. Check CORS Misconfiguration
  try {
    const evilOrigin = 'https://fable-security-audit.com';
    const corsRes = await fetchWithTimeout(options.target, {
      method: 'GET',
      headers: {
        Origin: evilOrigin,
        ...(options.authToken ? { Authorization: options.authToken } : {}),
      },
    });

    const allowOrigin = corsRes.headers.get('access-control-allow-origin');
    const allowCreds = corsRes.headers.get('access-control-allow-credentials')?.toLowerCase() === 'true';

    if (allowOrigin === evilOrigin && allowCreds) {
      findings.push({
        id: 'CORS-ARBITRARY-ORIGIN-WITH-CREDS',
        title: 'Vulnerable CORS Policy: Arbitrary Origin Reflection with Credentials',
        category: 'cors-misconfiguration',
        severity: 'high',
        description: `The server reflects arbitrary origin reflection (${evilOrigin}) with Access-Control-Allow-Credentials enabled, allowing malicious websites to read authenticated user responses.`,
        target: options.target,
        evidence: {
          request: {
            method: 'GET',
            url: options.target,
            headers: { Origin: evilOrigin },
          },
          response: {
            status: corsRes.status,
            headers: Object.fromEntries(corsRes.headers.entries()),
          },
          reproCurl: `curl -i -H "Origin: ${evilOrigin}" "${options.target}"`,
        },
        remediation: 'Do not reflect arbitrary Origin headers. Validate incoming origins against a strict server-side allowlist.',
        cwe: 'CWE-942',
      });
    }
  } catch {
    // Ignore CORS probe network errors
  }

  // 3. Check Exposed Sensitive Files & Paths
  for (const item of SENSITIVE_PATHS) {
    try {
      const probeUrl = `${rootUrl}${item.path}`;
      const probeRes = await fetchWithTimeout(probeUrl, { method: 'GET' });
      if (probeRes.status === 200) {
        const text = await probeRes.text();
        const hasIndicator = item.indicators.some((ind) => text.includes(ind));
        if (hasIndicator) {
          findings.push({
            id: `EXPOSURE-${item.path.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`,
            title: `Exposed Sensitive File: ${item.name}`,
            category: 'sensitive-exposure',
            severity: item.severity,
            description: `The path ${item.path} returned HTTP 200 and contained verified sensitive indicators, potentially leaking credentials or source structure.`,
            target: probeUrl,
            evidence: {
              response: {
                status: probeRes.status,
                snippet: text.slice(0, 300),
              },
              reproCurl: `curl -i "${probeUrl}"`,
            },
            remediation: `Block public access to ${item.path} at the reverse proxy (Nginx, Cloudflare, Caddy) or web server configuration.`,
            cwe: item.cwe,
          });
        }
      }
    } catch {
      // Continue
    }
  }

  // 4. API Logic & Auth Verification
  if (profile === 'api-logic' || profile === 'comprehensive') {
    if (options.authToken) {
      try {
        // Authenticated baseline request
        const authedRes = await fetchWithTimeout(options.target, {
          headers: { Authorization: options.authToken },
        });

        // Unauthenticated request
        const unauthedRes = await fetchWithTimeout(options.target, {
          headers: {},
        });

        // If authenticated was 200, and unauthenticated is also 200 with identical or positive content
        if (authedRes.status === 200 && unauthedRes.status === 200) {
          const body = await unauthedRes.text();
          if (body.length > 2) {
            findings.push({
              id: 'AUTH-BYPASS-MISSING-ENFORCEMENT',
              title: 'Authentication Missing on Sensitive Resource',
              category: 'auth-bypass',
              severity: 'high',
              description: 'The endpoint returned HTTP 200 OK with data when called without any Authorization header, failing to enforce authentication.',
              target: options.target,
              evidence: {
                request: {
                  method: 'GET',
                  url: options.target,
                },
                response: {
                  status: unauthedRes.status,
                  snippet: body.slice(0, 300),
                },
                reproCurl: `curl -i "${options.target}"`,
              },
              remediation: 'Implement mandatory authentication middleware / guard before routing to this resource handler.',
              cwe: 'CWE-306',
            });
          }
        }
      } catch {
        // Ignore API probe errors
      }
    }
  }

  return findings;
}
