import type { RedTeamFinding, RedTeamResult } from './types.js';

export interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  helpUri?: string;
  help?: { text: string; markdown?: string };
  properties?: {
    tags?: string[];
    precision?: 'very-high' | 'high' | 'medium' | 'low';
    'problem.severity'?: 'error' | 'warning' | 'recommendation';
  };
}

export interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  level: 'error' | 'warning' | 'note' | 'none';
  message: { text: string };
  locations: {
    physicalLocation: {
      artifactLocation: { uri: string };
      region?: { startLine: number };
    };
  }[];
  properties?: Record<string, unknown>;
}

export interface SarifLog {
  $schema: string;
  version: '2.1.0';
  runs: {
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: SarifRule[];
      };
    };
    results: SarifResult[];
  }[];
}

/**
 * Maps RedTeam severity to standard SARIF 2.1.0 levels.
 */
export function mapSeverityToSarifLevel(severity: string): 'error' | 'warning' | 'note' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
    case 'info':
    default:
      return 'note';
  }
}

/**
 * Converts RedTeam scan results into OASIS SARIF v2.1.0 format.
 */
export function generateSarifReport(result: RedTeamResult): SarifLog {
  const rulesMap = new Map<string, SarifRule>();
  const results: SarifResult[] = [];

  for (const finding of result.findings) {
    const ruleId = finding.cwe || finding.id;

    if (!rulesMap.has(ruleId)) {
      const cweNum = finding.cwe ? finding.cwe.replace('CWE-', '') : undefined;
      const helpUri = cweNum ? `https://cwe.mitre.org/data/definitions/${cweNum}.html` : undefined;

      const rule: SarifRule = {
        id: ruleId,
        name: finding.title.replace(/[^a-zA-Z0-9_-]/g, '_'),
        shortDescription: { text: finding.title },
        fullDescription: { text: finding.description },
        helpUri,
        help: {
          text: finding.remediation,
          markdown: `### Remediation\n\n${finding.remediation}\n\n${finding.evidence.reproCurl ? `**Reproduction:**\n\`\`\`bash\n${finding.evidence.reproCurl}\n\`\`\`` : ''}`,
        },
        properties: {
          tags: [
            finding.category,
            finding.cwe ? `external/cwe/${finding.cwe.toLowerCase()}` : undefined,
            finding.cwe || 'security',
            finding.compliance?.owaspTop10,
            finding.compliance?.owaspApi,
            finding.compliance?.pciDss,
            finding.compliance?.soc2,
          ].filter(Boolean) as string[],
          precision: finding.confidence && finding.confidence >= 0.9 ? 'very-high' : 'high',
          'problem.severity': finding.severity === 'critical' || finding.severity === 'high' ? 'error' : 'warning',
          ...(finding.cvss ? { 'security-severity': finding.cvss.score.toFixed(1), 'cvss-vector': finding.cvss.vector } : {}),
        },
      };
      rulesMap.set(ruleId, rule);
    }

    const ruleIndex = Array.from(rulesMap.keys()).indexOf(ruleId);
    const level = mapSeverityToSarifLevel(finding.severity);

    results.push({
      ruleId,
      ruleIndex,
      level,
      message: { text: `${finding.title}: ${finding.description}` },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: finding.target },
          },
        },
      ],
      properties: {
        id: finding.id,
        category: finding.category,
        severity: finding.severity,
        cwe: finding.cwe,
        confidence: finding.confidence,
        evidenceLevel: finding.evidenceLevel,
        reproCurl: finding.evidence.reproCurl,
        priority: finding.priority?.score,
        cvssScore: finding.cvss?.score,
        cvssVector: finding.cvss?.vector,
        compliance: finding.compliance,
      },
    });
  }

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'get-fable-redteam',
            version: '1.0.0',
            informationUri: 'https://github.com/imMamdouhaboammar/get-fable',
            rules: Array.from(rulesMap.values()),
          },
        },
        results,
      },
    ],
  };
}
