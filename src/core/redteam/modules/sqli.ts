import type { RedTeamFinding } from '../types.js';
import type { ProbeContext, SecurityProbeModule } from './types.js';

const SQL_ERROR_PATTERNS = [
  { pattern: /(?:syntax error at or near|pg_query|psycopg2|PG::SyntaxError)/i, engine: 'PostgreSQL' },
  { pattern: /(?:You have an error in your SQL syntax|mysql_fetch_array|mysqli_error|MySQLServerException)/i, engine: 'MySQL/MariaDB' },
  { pattern: /(?:SQLite3::SQLException|near ".*": syntax error|sqlite3_step)/i, engine: 'SQLite' },
  { pattern: /(?:ORA-\d{5}|Oracle error)/i, engine: 'Oracle' },
  { pattern: /(?:Unclosed quotation mark|ODBC SQL Server Driver)/i, engine: 'MSSQL' },
];

export const sqliProbe: SecurityProbeModule = {
  id: 'injection',
  name: 'Non-Destructive SQL Injection Boundary Probing',
  category: 'injection',
  defaultSeverity: 'critical',
  cwe: 'CWE-89',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
  profiles: ['comprehensive', 'api-logic', 'orchestrated', 'playbook'],

  match: () => true,

  run: async (context: ProbeContext): Promise<RedTeamFinding[]> => {
    const findings: RedTeamFinding[] = [];
    const { client, endpoints, options } = context;

    const sqliCandidates = endpoints.filter((ep) => {
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

    return findings;
  },
};
