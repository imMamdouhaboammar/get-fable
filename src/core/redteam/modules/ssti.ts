import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

const TEMPLATE_ERROR_PATTERNS = [
  { pattern: /(?:jinja2\.exceptions\.|TemplateSyntaxError)/i, engine: 'Jinja2/Python' },
  { pattern: /(?:Twig_Error_Syntax|Twig\\Error)/i, engine: 'Twig/PHP' },
  { pattern: /(?:freemarker\.core\.|FreeMarker template error)/i, engine: 'FreeMarker/Java' },
  { pattern: /(?:org\.apache\.velocity\.|VelocityViewServlet)/i, engine: 'Velocity/Java' },
  { pattern: /(?:Handlebars\.compile|handlebars\.js)/i, engine: 'Handlebars/Node' },
  { pattern: /(?:SmartyCompilerException|Smarty error:)/i, engine: 'Smarty/PHP' },
];

export const sstiProbe: SecurityProbeModule = {
  id: 'ssti',
  name: 'Server-Side Template Injection (SSTI) Sentinel Evaluation',
  category: 'ssti',
  defaultSeverity: 'critical',
  cwe: 'CWE-1336',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
  profiles: ['comprehensive', 'orchestrated', 'playbook'],

  match: (context: ProbeContext) => {
    return context.endpoints.some((ep) =>
      ep.url.includes('?') ||
      ep.path.includes('/search') ||
      ep.path.includes('/render') ||
      ep.path.includes('/preview') ||
      ep.path.includes('/template') ||
      (ep.parameters && ep.parameters.length > 0)
    );
  },

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, endpoints, options } = context;

    // Use a unique prime calculation sentinel: 4919 * 7 = 34433
    const sentinelExpression = '{{4919*7}}';
    const altSentinelExpression = '${4919*7}';
    const expectedReflection = '34433';

    const candidates = endpoints.filter((ep) =>
      ep.url.includes('?') ||
      ep.path.includes('/search') ||
      ep.path.includes('/render') ||
      ep.path.includes('/preview') ||
      ep.path.includes('/template') ||
      (ep.parameters && ep.parameters.length > 0)
    );

    for (const ep of candidates.slice(0, 6)) {
      const parsed = new URL(ep.url);
      const paramNames = Array.from(parsed.searchParams.keys());
      if (paramNames.length === 0 && ep.parameters) {
        for (const p of ep.parameters) paramNames.push(p.name);
      }
      if (paramNames.length === 0) paramNames.push('q');

      for (const param of paramNames) {
        for (const expr of [sentinelExpression, altSentinelExpression]) {
          try {
            const probeUrl = new URL(ep.url);
            probeUrl.searchParams.set(param, expr);

            const res = await client.fetchText(probeUrl.toString(), {
              headers: options.authToken ? { Authorization: options.authToken } : {},
              timeoutMs: 2500,
            });

            // 1. Check for arithmetic evaluation reflection
            if (res.text.includes(expectedReflection) && !res.text.includes('4919*7')) {
              findings.push({
                id: `SSTI-EVALUATION-${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}-${param}`,
                title: `Server-Side Template Injection (SSTI) Confirmed on parameter '${param}'`,
                category: 'ssti',
                severity: 'critical',
                description: `Parameter '${param}' evaluated mathematical template expression '${expr}' to '${expectedReflection}', confirming remote template execution without dangerous payloads.`,
                target: probeUrl.toString(),
                evidence: {
                  request: { method: 'GET', url: probeUrl.toString() },
                  response: { status: res.status, snippet: res.text.slice(0, 300) },
                  reproCurl: `curl -i -s "${probeUrl.toString()}"`,
                },
                remediation: 'Do not render user input as template code. Pass untrusted input strictly as context variables to logic-less template engines with auto-escaping enabled.',
                cwe: 'CWE-1336',
                evidenceLevel: 'reproduced',
                confidence: 0.98,
              });
              break;
            }

            // 2. Check for template syntax error reflection
            for (const { pattern, engine } of TEMPLATE_ERROR_PATTERNS) {
              if (pattern.test(res.text)) {
                findings.push({
                  id: `SSTI-SYNTAX-ERROR-${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}-${param}`,
                  title: `Template Syntax Error Reflection (${engine}) on parameter '${param}'`,
                  category: 'ssti',
                  severity: 'high',
                  description: `Parameter '${param}' reflected a template engine syntax error (${engine}) upon injecting expression '${expr}', indicating server-side template compilation.`,
                  target: probeUrl.toString(),
                  evidence: {
                    request: { method: 'GET', url: probeUrl.toString() },
                    response: { status: res.status, snippet: res.text.slice(0, 300) },
                    reproCurl: `curl -i -s "${probeUrl.toString()}"`,
                  },
                  remediation: 'Disable dynamic template string compilation from request parameters. Enforce parameter typing.',
                  cwe: 'CWE-1336',
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
    }

    return findings;
  },
};
