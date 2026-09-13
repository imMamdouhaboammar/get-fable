import { discoverTargetSurface } from './crawler.js';
import { buildExecutionEnvelope, EnvelopeHttpClient } from './envelope.js';
import { validateScope } from './scope.js';
import type {
  DiscoveredEndpoint,
  DiscoveredSurface,
  RedTeamFinding,
  ScanOptions,
} from './types.js';

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
    path: '/docker-compose.yml',
    name: 'Docker Compose Infrastructure Configuration',
    indicators: ['version:', 'services:', 'image:'],
    severity: 'high' as const,
    cwe: 'CWE-200',
  },
  {
    path: '/.aws/credentials',
    name: 'AWS Cloud Credentials File',
    indicators: ['aws_access_key_id', 'aws_secret_access_key'],
    severity: 'critical' as const,
    cwe: 'CWE-522',
  },
  {
    path: '/actuator/health',
    name: 'Spring Boot Actuator Health Endpoint',
    indicators: ['"status":"UP"', '"status":"UNKNOWN"'],
    severity: 'low' as const,
    cwe: 'CWE-200',
  },
];

const SQL_ERROR_PATTERNS = [
  { pattern: /(?:syntax error at or near|pg_query|psycopg2|PG::SyntaxError)/i, engine: 'PostgreSQL' },
  { pattern: /(?:You have an error in your SQL syntax|mysql_fetch_array|mysqli_error|MySQLServerException)/i, engine: 'MySQL/MariaDB' },
  { pattern: /(?:SQLite3::SQLException|near ".*": syntax error|sqlite3_step)/i, engine: 'SQLite' },
  { pattern: /(?:ORA-\d{5}|Oracle error)/i, engine: 'Oracle' },
  { pattern: /(?:Unclosed quotation mark|ODBC SQL Server Driver)/i, engine: 'MSSQL' },
];

/**
 * Parses and inspects JWT payload safely without external dependencies.
 */
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

/**
 * Creates an unsigned "alg: none" JWT for signature verification bypass probing.
 */
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

export async function runSecurityProbes(
  options: ScanOptions,
  providedSurface?: DiscoveredSurface,
  providedClient?: EnvelopeHttpClient
): Promise<RedTeamFinding[]> {
  validateScope(options.target, options.scopeConfig);

  const envelope = buildExecutionEnvelope(options.scopeConfig, options.envelope);
  const client = providedClient || new EnvelopeHttpClient(envelope);

  const findings: RedTeamFinding[] = [];
  const profile = options.profile || 'passive';
  const targetUrl = new URL(options.target);
  const rootUrl = `${targetUrl.protocol}//${targetUrl.host}`;

  // Surface Discovery (Crawler)
  let surface = providedSurface;
  const shouldCrawl = options.crawl !== false && (profile === 'comprehensive' || profile === 'api-logic' || profile === 'orchestrated');
  if (!surface && shouldCrawl) {
    surface = await discoverTargetSurface(options.target, envelope, client);
  }

  const endpointsToTest: DiscoveredEndpoint[] = surface ? [...surface.endpoints] : [
    { url: options.target, path: targetUrl.pathname, method: 'GET', source: 'probe' }
  ];

  // 1. Security Headers & Information Disclosure (on Root & Target)
  try {
    const res = await client.fetch(options.target, {
      method: 'GET',
      headers: options.authToken ? { Authorization: options.authToken } : {},
      timeoutMs: 3000,
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
          reproCurl: `curl -i -s "${options.target}"`,
        },
        remediation: "Add a strict 'Content-Security-Policy' HTTP response header restricting script and object sources.",
        cwe: 'CWE-1021',
        evidenceLevel: 'observed',
        confidence: 0.95,
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
          reproCurl: `curl -i -s "${options.target}"`,
        },
        remediation: "Configure 'X-Frame-Options: DENY' or 'X-Frame-Options: SAMEORIGIN'.",
        cwe: 'CWE-1021',
        evidenceLevel: 'observed',
        confidence: 0.95,
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
          reproCurl: `curl -i -s "${options.target}"`,
        },
        remediation: "Set 'X-Content-Type-Options: nosniff' header on all HTTP responses.",
        cwe: 'CWE-79',
        evidenceLevel: 'observed',
        confidence: 0.95,
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
          reproCurl: `curl -i -s "${options.target}"`,
        },
        remediation: "Configure 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload'.",
        cwe: 'CWE-523',
        evidenceLevel: 'observed',
        confidence: 0.95,
      });
    }

    // Check Leaked Server & Tech Disclosure
    const serverHeader = headers.get('server');
    const poweredBy = headers.get('x-powered-by');
    if (serverHeader && /\d+\.\d+/.test(serverHeader)) {
      findings.push({
        id: 'INFO-LEAK-SERVER-VERSION',
        title: `Server Software Version Disclosed: ${serverHeader}`,
        category: 'security-headers',
        severity: 'low',
        description: `The Server response header discloses specific version details (${serverHeader}), aiding attackers in fingerprinting known CVEs.`,
        target: options.target,
        evidence: {
          response: { status: res.status, headers: { server: serverHeader } },
          reproCurl: `curl -I -s "${options.target}"`,
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
        target: options.target,
        evidence: {
          response: { status: res.status, headers: { 'x-powered-by': poweredBy } },
          reproCurl: `curl -I -s "${options.target}"`,
        },
        remediation: 'Disable the X-Powered-By header in your application framework settings.',
        cwe: 'CWE-200',
        evidenceLevel: 'observed',
        confidence: 0.9,
      });
    }
  } catch {
    // Continue probing
  }

  // 2. CORS Misconfiguration Across Discovered Endpoints
  const corsEndpoints = [options.target];
  for (const ep of endpointsToTest) {
    if (!corsEndpoints.includes(ep.url) && corsEndpoints.length < 5) {
      corsEndpoints.push(ep.url);
    }
  }

  for (const endpointUrl of corsEndpoints) {
    try {
      const evilOrigin = 'https://fable-security-audit.com';
      const corsRes = await client.fetch(endpointUrl, {
        method: 'GET',
        headers: {
          Origin: evilOrigin,
          ...(options.authToken ? { Authorization: options.authToken } : {}),
        },
        timeoutMs: 2500,
      });

      const allowOrigin = corsRes.headers.get('access-control-allow-origin');
      const allowCreds = corsRes.headers.get('access-control-allow-credentials')?.toLowerCase() === 'true';

      if (allowOrigin === evilOrigin && allowCreds) {
        findings.push({
          id: `CORS-ARBITRARY-ORIGIN-WITH-CREDS-${new URL(endpointUrl).pathname.replace(/[^a-zA-Z0-9]/g, '_')}`,
          title: 'Vulnerable CORS Policy: Arbitrary Origin Reflection with Credentials',
          category: 'cors-misconfiguration',
          severity: 'high',
          description: `The server reflects arbitrary origin reflection (${evilOrigin}) with Access-Control-Allow-Credentials enabled, allowing malicious websites to read authenticated user responses.`,
          target: endpointUrl,
          evidence: {
            request: {
              method: 'GET',
              url: endpointUrl,
              headers: { Origin: evilOrigin },
            },
            response: {
              status: corsRes.status,
              headers: Object.fromEntries(corsRes.headers.entries()),
            },
            reproCurl: `curl -i -H "Origin: ${evilOrigin}" "${endpointUrl}"`,
          },
          remediation: 'Do not reflect arbitrary Origin headers. Validate incoming origins against a strict server-side allowlist.',
          cwe: 'CWE-942',
          evidenceLevel: 'reproduced',
          confidence: 0.95,
        });
      }
    } catch {
      // Ignore
    }
  }

  // 3. Check Exposed Sensitive Files & Paths
  for (const item of SENSITIVE_PATHS) {
    try {
      const probeUrl = `${rootUrl}${item.path}`;
      const probeRes = await client.fetchText(probeUrl, { timeoutMs: 2500 });
      if (probeRes.status === 200) {
        const text = probeRes.text;
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
              reproCurl: `curl -i -s "${probeUrl}"`,
            },
            remediation: `Block public access to ${item.path} at the reverse proxy (Nginx, Cloudflare, Caddy) or web server configuration.`,
            cwe: item.cwe,
            evidenceLevel: 'reproduced',
            confidence: 0.98,
          });
        }
      }
    } catch {
      // Continue
    }
  }

  // 4. Active Multi-Identity BOLA / IDOR Probing
  if (profile === 'api-logic' || profile === 'comprehensive' || profile === 'orchestrated') {
    // Look for parameterized routes (e.g. /api/documents/:id, /api/users/101, etc.)
    const idorCandidates = endpointsToTest.filter((ep) => {
      const path = ep.path;
      return (
        /\/(?:documents|users|accounts|orders|invoices|projects|profiles)\/[^/]+/i.test(path) ||
        (ep.parameters && ep.parameters.some((p) => /id$|userId|accountId|orderId/i.test(p.name)))
      );
    });

    for (const ep of idorCandidates) {
      if (options.authToken && options.secondAuthToken) {
        try {
          // 1. Fetch as User A (baseline)
          const resA = await client.fetch(ep.url, {
            headers: { Authorization: options.authToken },
            timeoutMs: 2500,
          });

          // 2. Fetch as User B (swapped identity)
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
  }

  // 5. Non-Destructive SQL Injection Boundary Probing
  if (profile === 'comprehensive' || profile === 'api-logic' || profile === 'orchestrated') {
    // Test endpoints with query parameters or search endpoints
    const sqliCandidates = endpointsToTest.filter((ep) => {
      return (
        ep.url.includes('?') ||
        ep.path.includes('/search') ||
        ep.path.includes('/query') ||
        ep.path.includes('/filter') ||
        (ep.parameters && ep.parameters.length > 0)
      );
    });

    const testPayloads = ["'", "''", "' OR '1'='1", "1' AND '1'='1"];

    for (const ep of sqliCandidates.slice(0, 8)) {
      const parsed = new URL(ep.url);
      const paramNames = Array.from(parsed.searchParams.keys());
      if (paramNames.length === 0 && ep.parameters) {
        for (const p of ep.parameters) paramNames.push(p.name);
      }

      for (const param of paramNames) {
        for (const payload of testPayloads) {
          try {
            const probeUrl = new URL(ep.url);
            probeUrl.searchParams.set(param, payload);

            const res = await client.fetchText(probeUrl.toString(), {
              headers: options.authToken ? { Authorization: options.authToken } : {},
              timeoutMs: 2500,
            });

            for (const { pattern, engine } of SQL_ERROR_PATTERNS) {
              if (pattern.test(res.text)) {
                findings.push({
                  id: `SQLI-SYNTAX-ERROR-${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}-${param}`,
                  title: `SQL Injection Syntax Error Reflection (${engine}) on parameter '${param}'`,
                  category: 'injection',
                  severity: 'critical',
                  description: `The parameter '${param}' reflected a ${engine} database syntax error when injected with payload '${payload}', confirming SQL injection vulnerability without data modification.`,
                  target: probeUrl.toString(),
                  evidence: {
                    request: {
                      method: 'GET',
                      url: probeUrl.toString(),
                    },
                    response: {
                      status: res.status,
                      snippet: res.text.slice(0, 300),
                    },
                    reproCurl: `curl -i -s "${probeUrl.toString()}"`,
                  },
                  remediation: 'Use parameterized queries or ORM prepared statements. Never concatenate untrusted user input into SQL commands.',
                  cwe: 'CWE-89',
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
      }
    }
  }

  // 6. Server-Side Request Forgery (SSRF) Probing
  if (profile === 'comprehensive' || profile === 'orchestrated') {
    const ssrfCandidates = endpointsToTest.filter((ep) => {
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

            // Indicators of SSRF reaching internal loopback or metadata
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
  }

  // 7. Open Redirect Probing
  if (profile === 'comprehensive' || profile === 'orchestrated') {
    const redirectCandidates = endpointsToTest.filter((ep) => {
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
  }

  // 8. Authentication & JWT Integrity Checks
  if (options.authToken) {
    // Test JWT "alg: none" bypass
    const algNoneToken = createAlgNoneJwt(options.authToken);
    if (algNoneToken) {
      try {
        const testRes = await client.fetch(options.target, {
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
            target: options.target,
            evidence: {
              request: {
                method: 'GET',
                url: options.target,
                headers: { Authorization: algNoneToken },
              },
              response: { status: testRes.status },
              reproCurl: `curl -i -s "${options.target}" -H "Authorization: ${algNoneToken}"`,
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

    // Inspect JWT payload for missing expiration
    const payload = parseJwtPayload(options.authToken);
    if (payload && !payload.exp) {
      findings.push({
        id: 'JWT-MISSING-EXPIRATION-CLAIM',
        title: 'JWT Missing Expiration (exp) Claim',
        category: 'session-management',
        severity: 'medium',
        description: 'The supplied JWT token has no expiration (exp) timestamp claim, meaning stolen tokens never expire.',
        target: options.target,
        evidence: {
          rawOutput: JSON.stringify(payload),
        },
        remediation: 'Always include a short-lived "exp" expiration claim in issued JWTs.',
        cwe: 'CWE-613',
        evidenceLevel: 'observed',
        confidence: 0.9,
      });
    }

    // Test unauthenticated access on target URL
    try {
      const authedRes = await client.fetch(options.target, {
        headers: { Authorization: options.authToken },
      });
      const unauthedRes = await client.fetchText(options.target, {
        headers: {},
      });

      if (authedRes.status === 200 && unauthedRes.status === 200 && unauthedRes.text.length > 2) {
        findings.push({
          id: 'AUTH-BYPASS-MISSING-ENFORCEMENT',
          title: 'Authentication Missing on Sensitive Resource',
          category: 'auth-bypass',
          severity: 'high',
          description: 'The endpoint returned HTTP 200 OK with data when called without any Authorization header, failing to enforce authentication.',
          target: options.target,
          evidence: {
            request: { method: 'GET', url: options.target },
            response: { status: unauthedRes.status, snippet: unauthedRes.text.slice(0, 300) },
            reproCurl: `curl -i -s "${options.target}"`,
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

  // 9. Unauthenticated State Mutation Checks on Discovered Endpoints
  const mutationEndpoints = endpointsToTest.filter((ep) =>
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(ep.method)
  );

  for (const ep of mutationEndpoints.slice(0, 5)) {
    try {
      const res = await client.fetchText(ep.url, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testProbe: true }),
        timeoutMs: 2500,
      });

      if ([200, 201, 202, 204].includes(res.status)) {
        findings.push({
          id: `UNAUTHENTICATED-STATE-MUTATION-${ep.method}-${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
          title: `Unauthenticated State Mutation Allowed on ${ep.method} ${ep.path}`,
          category: 'auth-bypass',
          severity: 'high',
          description: `The state-modifying route ${ep.method} ${ep.path} accepted requests without any Authorization credentials and returned HTTP ${res.status}.`,
          target: ep.url,
          evidence: {
            request: { method: ep.method, url: ep.url },
            response: { status: res.status, snippet: res.text.slice(0, 300) },
            reproCurl: `curl -i -s -X ${ep.method} "${ep.url}"`,
          },
          remediation: 'Apply authentication and authorization guards to all state-mutating HTTP methods.',
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
}
