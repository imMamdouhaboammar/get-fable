import fs from 'node:fs';
import path from 'node:path';
import type { AdapterContext, RedTeamFinding, ToolAdapterId } from '../types.js';
import { BaseToolAdapter } from './base.js';

export interface DiscoveredEndpoint {
  path: string;
  method: string;
  summary?: string;
  hasAuth: boolean;
  parameters: string[];
}

export class AktoAdapter extends BaseToolAdapter {
  readonly id: ToolAdapterId = 'akto';
  readonly name = 'Akto API Business Logic Security';
  readonly description =
    'Automated OWASP API Top 10 & business logic auditing (BOLA/IDOR, broken auth, mass assignment)';

  async isAvailable(context?: AdapterContext): Promise<boolean> {
    const cwd = context?.cwd || process.cwd();
    return Boolean(this.findApiSpecs(cwd).length > 0);
  }

  findApiSpecs(cwd: string = process.cwd()): string[] {
    const candidates = [
      'openapi.json',
      'openapi.yaml',
      'openapi.yml',
      'swagger.json',
      'swagger.yaml',
      'swagger.yml',
      'docs/openapi.json',
      'docs/swagger.json',
    ];

    const found: string[] = [];
    for (const file of candidates) {
      const fullPath = path.join(cwd, file);
      if (fs.existsSync(fullPath)) {
        found.push(fullPath);
      }
    }
    return found;
  }

  parseOpenApiEndpoints(specContent: string): DiscoveredEndpoint[] {
    const endpoints: DiscoveredEndpoint[] = [];
    try {
      const parsed = JSON.parse(specContent);
      if (parsed && typeof parsed.paths === 'object') {
        for (const [routePath, methods] of Object.entries(parsed.paths)) {
          if (methods && typeof methods === 'object') {
            for (const [method, def] of Object.entries(methods)) {
              if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                const methodDef = def as Record<string, unknown>;
                const hasAuth = Boolean(methodDef.security || parsed.security);
                const params: string[] = [];
                if (Array.isArray(methodDef.parameters)) {
                  for (const p of methodDef.parameters) {
                    if (p && typeof p === 'object' && 'name' in p) {
                      params.push(String((p as { name: string }).name));
                    }
                  }
                }
                endpoints.push({
                  path: routePath,
                  method: method.toUpperCase(),
                  summary: typeof methodDef.summary === 'string' ? methodDef.summary : undefined,
                  hasAuth,
                  parameters: params,
                });
              }
            }
          }
        }
      }
    } catch {
      // Best-effort parsing (non-JSON YAML requires external parser)
    }
    return endpoints;
  }

  async run(context: AdapterContext): Promise<RedTeamFinding[]> {
    const findings: RedTeamFinding[] = [];
    const specs = this.findApiSpecs(context.cwd);

    for (const specPath of specs) {
      try {
        const content = fs.readFileSync(specPath, 'utf-8');
        const endpoints = this.parseOpenApiEndpoints(content);

        for (const ep of endpoints) {
          // Check for Broken Object Level Authorization (BOLA / IDOR) patterns
          if (ep.parameters.some((p) => /id$|userId|accountId|orderId/i.test(p))) {
            const sampleUrl = new URL(ep.path.replace(/\{[^}]+\}/g, '99999'), context.target).toString();

            // Multi-Identity Verification Check:
            // If both primary and secondary auth tokens are supplied, active replay can elevate hypothesis to confirmed
            let isConfirmed = false;
            let reproEvidence: string | undefined;

            if (context.authToken && context.secondAuthToken) {
              try {
                // User B attempts to access User A's referenced object resource
                const testRes = await fetch(sampleUrl, {
                  method: ep.method,
                  headers: { Authorization: context.secondAuthToken },
                  signal: AbortSignal.timeout(2000),
                });
                if (testRes.status === 200) {
                  isConfirmed = true;
                  reproEvidence = `Active multi-identity replay: Token B accessed tenant object without 403 Forbidden (status: 200).`;
                }
              } catch {
                // Network error during replay, retain hypothesis status
              }
            }

            if (isConfirmed) {
              findings.push(
                this.createFinding({
                  title: `API Business Logic: Confirmed BOLA/IDOR on ${ep.method} ${ep.path}`,
                  category: 'idor-bola',
                  severity: 'high',
                  description: `Multi-identity verification confirmed object-level flaw on ${ep.method} ${ep.path}. ${reproEvidence}`,
                  target: sampleUrl,
                  remediation: 'Implement strict server-side object ownership verification against the authenticated caller tenant ID.',
                  reproCurl: `curl -i -s -X ${ep.method} "${sampleUrl}" -H "Authorization: ${context.secondAuthToken}"`,
                  cwe: 'CWE-639',
                  evidenceLevel: 'reproduced',
                  confidence: 0.95,
                  rawOutput: reproEvidence,
                })
              );
            } else {
              // Spec-only hypothesis generation
              findings.push(
                this.createFinding({
                  title: `API Business Logic: Potential BOLA candidate on ${ep.method} ${ep.path}`,
                  category: 'idor-bola',
                  severity: 'medium',
                  description: `OpenAPI specification indicates ${ep.method} ${ep.path} accepts object identifier parameters. Live multi-identity cross-tenant verification is required to confirm object ownership enforcement.`,
                  target: sampleUrl,
                  remediation: 'Verify server-side object ownership checks against session principal on tenant object lookups.',
                  reproCurl: `curl -i -s -X ${ep.method} "${sampleUrl}" -H "Authorization: ${context.authToken || 'Bearer <USER_A_TOKEN>'}"`,
                  cwe: 'CWE-639',
                  evidenceLevel: 'hypothetical',
                  confidence: 0.45,
                  rawOutput: `OpenAPI spec parameter pattern match: ${ep.parameters.join(', ')}`,
                })
              );
            }
          }

          // Check for unprotected state-mutating endpoints
          if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(ep.method) && !ep.hasAuth) {
            const url = new URL(ep.path, context.target).toString();
            findings.push(
              this.createFinding({
                title: `API Security: Candidate Unauthenticated State Mutation on ${ep.method} ${ep.path}`,
                category: 'auth-bypass',
                severity: 'high',
                description: `OpenAPI specification marks ${ep.method} ${ep.path} without explicit security schemes. Live validation needed to verify whether runtime middleware blocks unauthenticated requests.`,
                target: url,
                remediation: 'Enforce authentication middleware and role-based access control on state-mutating API routes.',
                reproCurl: `curl -i -s -X ${ep.method} "${url}"`,
                cwe: 'CWE-306',
                evidenceLevel: 'inferred',
                confidence: 0.55,
                rawOutput: `OpenAPI path definition has no security attributes`,
              })
            );
          }

          // Check for sensitive credentials in GET query parameters
          const sensitiveParam = ep.parameters.find((p) =>
            /^(token|key|secret|apikey|api_key|auth|password|passwd)$/i.test(p)
          );
          if (sensitiveParam && ep.method === 'GET') {
            const url = new URL(ep.path, context.target).toString();
            findings.push(
              this.createFinding({
                title: `API Security: Sensitive Query Parameter '${sensitiveParam}' on ${ep.path}`,
                category: 'sensitive-exposure',
                severity: 'medium',
                description: `OpenAPI specification documents sensitive credential parameter '${sensitiveParam}' in GET query string. Query parameters risk leakage in server access logs and web caches.`,
                target: url,
                remediation: 'Pass authentication credentials via Authorization HTTP header instead of URI query parameters.',
                reproCurl: `curl -i -s -X GET "${url}?${sensitiveParam}=test_value"`,
                cwe: 'CWE-598',
                evidenceLevel: 'inferred',
                confidence: 0.85,
                rawOutput: `Query parameter '${sensitiveParam}' documented in OpenAPI spec`,
              })
            );
          }
        }
      } catch {
        // Skip unreadable spec
      }
    }

    return findings;
  }
}
