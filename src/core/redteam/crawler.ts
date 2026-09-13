import { EnvelopeHttpClient } from './envelope.js';
import type {
  DiscoveredEndpoint,
  DiscoveredParameter,
  DiscoveredSurface,
  ExecutionEnvelope,
} from './types.js';

const COMMON_SPEC_PATHS = [
  '/openapi.json',
  '/swagger.json',
  '/api-docs',
  '/v3/api-docs',
  '/api/openapi.json',
  '/api/swagger.json',
  '/docs/openapi.json',
  '/docs/swagger.json',
];

const COMMON_API_PROBES = [
  '/api',
  '/api/v1',
  '/api/v2',
  '/graphql',
  '/health',
  '/status',
  '/robots.txt',
  '/sitemap.xml',
];

/**
 * Extracts links, script tags, forms, and fetch call endpoints from HTML text.
 */
export function extractEndpointsFromHtml(html: string, baseUrl: string): {
  endpoints: DiscoveredEndpoint[];
  links: string[];
  forms: { action: string; method: string; fields: string[] }[];
} {
  const endpoints: DiscoveredEndpoint[] = [];
  const links: string[] = [];
  const forms: { action: string; method: string; fields: string[] }[] = [];

  const origin = new URL(baseUrl).origin;

  // 1. Extract <a href="...">
  const hrefRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    const raw = match[1].trim();
    if (raw.startsWith('javascript:') || raw.startsWith('mailto:')) continue;
    try {
      const resolved = new URL(raw, baseUrl);
      if (resolved.origin === origin) {
        links.push(resolved.toString());
        endpoints.push({
          url: resolved.toString(),
          path: resolved.pathname,
          method: 'GET',
          source: 'html',
        });
      }
    } catch {
      // Ignore malformed URLs
    }
  }

  // 2. Extract <form action="..." method="...">
  const formRegex = /<form\s+([^>]*?)>([\s\S]*?)<\/form>/gi;
  while ((match = formRegex.exec(html)) !== null) {
    const formAttrs = match[1];
    const formBody = match[2];

    const actionMatch = /action=["']([^"']*)["']/i.exec(formAttrs);
    const methodMatch = /method=["']([^"']*)["']/i.exec(formAttrs);

    const rawAction = actionMatch ? actionMatch[1] : '';
    const method = (methodMatch ? methodMatch[1] : 'GET').toUpperCase();

    const fields: string[] = [];
    const inputRegex = /<input\s+[^>]*?name=["']([^"']+)["']/gi;
    let inputMatch: RegExpExecArray | null;
    while ((inputMatch = inputRegex.exec(formBody)) !== null) {
      fields.push(inputMatch[1]);
    }

    try {
      const resolvedUrl = new URL(rawAction || '', baseUrl);
      if (resolvedUrl.origin === origin) {
        forms.push({ action: resolvedUrl.toString(), method, fields });
        endpoints.push({
          url: resolvedUrl.toString(),
          path: resolvedUrl.pathname,
          method,
          parameters: fields.map((f) => ({ name: f, in: method === 'GET' ? 'query' : 'body' })),
          source: 'html',
        });
      }
    } catch {
      // Ignore
    }
  }

  // 3. Extract API fetch/axios endpoints in inline scripts
  const apiCallRegex = /(?:fetch|axios\.(?:get|post|put|delete|patch))\s*\(\s*["']([^"']+)["']/gi;
  while ((match = apiCallRegex.exec(html)) !== null) {
    const rawPath = match[1];
    try {
      const resolved = new URL(rawPath, baseUrl);
      if (resolved.origin === origin) {
        endpoints.push({
          url: resolved.toString(),
          path: resolved.pathname,
          method: 'GET',
          source: 'html',
        });
      }
    } catch {
      // Ignore
    }
  }

  return { endpoints, links, forms };
}

/**
 * Parses OpenAPI / Swagger specification into typed DiscoveredEndpoints.
 */
export function parseOpenApiSpec(spec: Record<string, unknown>, baseUrl: string): DiscoveredEndpoint[] {
  const endpoints: DiscoveredEndpoint[] = [];
  const paths = spec.paths;
  if (!paths || typeof paths !== 'object') return endpoints;

  for (const [routePath, methods] of Object.entries(paths as Record<string, unknown>)) {
    if (!methods || typeof methods !== 'object') continue;

    for (const [method, def] of Object.entries(methods as Record<string, unknown>)) {
      const upperMethod = method.toUpperCase();
      if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(upperMethod)) continue;

      const defObj = def as Record<string, unknown>;
      const hasAuth = Boolean(defObj.security || spec.security);
      const summary = typeof defObj.summary === 'string' ? defObj.summary : undefined;

      const params: DiscoveredParameter[] = [];
      if (Array.isArray(defObj.parameters)) {
        for (const p of defObj.parameters) {
          if (p && typeof p === 'object' && 'name' in p) {
            const pObj = p as { name: string; in?: string; required?: boolean };
            params.push({
              name: String(pObj.name),
              in: (pObj.in as DiscoveredParameter['in']) || 'query',
              required: Boolean(pObj.required),
            });
          }
        }
      }

      try {
        const fullUrl = new URL(routePath, baseUrl).toString();
        endpoints.push({
          url: fullUrl,
          path: routePath,
          method: upperMethod,
          parameters: params,
          hasAuth,
          summary,
          source: 'openapi',
        });
      } catch {
        // Skip invalid URL resolve
      }
    }
  }

  return endpoints;
}

/**
 * Crawls target root URL and discovers routes, endpoints, forms, and live OpenAPI specs.
 */
export async function discoverTargetSurface(
  targetUrl: string,
  envelope: ExecutionEnvelope,
  client?: EnvelopeHttpClient
): Promise<DiscoveredSurface> {
  const httpClient = client || new EnvelopeHttpClient(envelope);
  const target = new URL(targetUrl);
  const rootUrl = `${target.protocol}//${target.host}`;

  const allEndpoints: Map<string, DiscoveredEndpoint> = new Map();
  const allLinks: Set<string> = new Set();
  const allForms: { action: string; method: string; fields: string[] }[] = [];
  let discoveredOpenApiSpec: Record<string, unknown> | undefined;

  // Add the base target itself
  allEndpoints.set(`GET:${target.pathname}`, {
    url: targetUrl,
    path: target.pathname,
    method: 'GET',
    source: 'probe',
  });

  // 1. Fetch Root / Target HTML
  try {
    const rootRes = await httpClient.fetchText(targetUrl);
    if (rootRes.status === 200 && rootRes.text) {
      const extracted = extractEndpointsFromHtml(rootRes.text, targetUrl);
      for (const ep of extracted.endpoints) {
        const key = `${ep.method}:${ep.path}`;
        if (!allEndpoints.has(key)) allEndpoints.set(key, ep);
      }
      for (const l of extracted.links) allLinks.add(l);
      allForms.push(...extracted.forms);
    }
  } catch {
    // Ignore network failures on root
  }

  // 2. Discover OpenAPI / Swagger Schemas
  for (const specPath of COMMON_SPEC_PATHS) {
    try {
      const specUrl = `${rootUrl}${specPath}`;
      const res = await httpClient.fetchText(specUrl, { timeoutMs: 3000 });
      if (res.status === 200 && res.text) {
        try {
          const parsed = JSON.parse(res.text);
          if (parsed && (parsed.openapi || parsed.swagger || parsed.paths)) {
            discoveredOpenApiSpec = parsed;
            const openApiEndpoints = parseOpenApiSpec(parsed, rootUrl);
            for (const ep of openApiEndpoints) {
              const key = `${ep.method}:${ep.path}`;
              allEndpoints.set(key, ep);
            }
            break; // Found working spec
          }
        } catch {
          // Not JSON
        }
      }
    } catch {
      // Continue next spec candidate
    }
  }

  // 3. Probe robots.txt for hidden paths
  try {
    const robotsUrl = `${rootUrl}/robots.txt`;
    const robotsRes = await httpClient.fetchText(robotsUrl, { timeoutMs: 2000 });
    if (robotsRes.status === 200 && robotsRes.text) {
      const lines = robotsRes.text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        const disallowMatch = /^(?:Disallow|Allow):\s*(\S+)/i.exec(trimmed);
        if (disallowMatch && disallowMatch[1] && !disallowMatch[1].includes('*')) {
          const p = disallowMatch[1];
          try {
            const resolved = new URL(p, rootUrl);
            const key = `GET:${resolved.pathname}`;
            if (!allEndpoints.has(key)) {
              allEndpoints.set(key, {
                url: resolved.toString(),
                path: resolved.pathname,
                method: 'GET',
                source: 'robots',
              });
            }
          } catch {
            // Ignore
          }
        }
      }
    }
  } catch {
    // Ignore robots.txt error
  }

  // 4. Probe common API roots
  for (const probePath of COMMON_API_PROBES) {
    if (probePath === '/robots.txt' || probePath === '/sitemap.xml') continue;
    try {
      const probeUrl = `${rootUrl}${probePath}`;
      const res = await httpClient.fetch(probeUrl, { method: 'HEAD', timeoutMs: 1500 });
      if (res.status < 400 || res.status === 401 || res.status === 403) {
        const key = `GET:${probePath}`;
        if (!allEndpoints.has(key)) {
          allEndpoints.set(key, {
            url: probeUrl,
            path: probePath,
            method: 'GET',
            hasAuth: res.status === 401 || res.status === 403,
            source: 'probe',
          });
        }
      }
    } catch {
      // Continue
    }
  }

  return {
    endpoints: Array.from(allEndpoints.values()),
    links: Array.from(allLinks),
    forms: allForms,
    openApiSpec: discoveredOpenApiSpec,
  };
}
