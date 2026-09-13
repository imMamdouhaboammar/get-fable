import type { RedTeamFinding, RedTeamResult, RedTeamSummary } from './types.js';

export function summarizeFindings(findings: RedTeamFinding[]): RedTeamSummary {
  const summary: RedTeamSummary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    total: findings.length,
  };

  for (const f of findings) {
    if (f.severity in summary) {
      summary[f.severity]++;
    }
  }

  return summary;
}

export function generateMarkdownReport(result: RedTeamResult): string {
  const lines: string[] = [];

  lines.push('# Fable RedTeam Security Audit Report');
  lines.push('');
  lines.push(`- **Target:** \`${result.target}\``);
  lines.push(`- **Scan Profile:** \`${result.profile}\``);
  lines.push(`- **Execution Period:** ${result.startTime} to ${result.endTime}`);
  if (result.executiveGrade) {
    lines.push(`- **Enterprise Security Posture Grade:** **\`${result.executiveGrade}\`**`);
  }
  if (result.estimatedMttrHours !== undefined) {
    lines.push(`- **Estimated Remediation Effort (MTTR):** ~${result.estimatedMttrHours} engineering hours`);
  }
  if (result.activeAdapters && result.activeAdapters.length > 0) {
    lines.push(`- **Participating Adapters:** ${result.activeAdapters.map((a) => `\`${a}\``).join(', ')}`);
  }
  if (result.attestation) {
    lines.push(`- **Cryptographic Attestation Hash:** \`${result.attestation.attestationHash}\``);
  }
  lines.push('');
  lines.push('## Executive Summary & Scorecard');
  lines.push('');
  lines.push('| Severity | Count | SLA Remediate |');
  lines.push('| :--- | :---: | :--- |');
  lines.push(`| Critical | ${result.summary.critical} | Immediate (24h) |`);
  lines.push(`| High | ${result.summary.high} | 7 Days |`);
  lines.push(`| Medium | ${result.summary.medium} | 30 Days |`);
  lines.push(`| Low | ${result.summary.low} | 90 Days |`);
  lines.push(`| Info | ${result.summary.info} | Best Effort |`);
  lines.push(`| **Total Findings** | **${result.summary.total}** | **Grade: ${result.executiveGrade || 'A'}** |`);
  lines.push('');

  // Enterprise Compliance Matrix
  lines.push('### Regulatory & Standards Compliance Readiness');
  lines.push('');
  lines.push('| Framework / Standard | Status | Target Clause / Top 10 |');
  lines.push('| :--- | :---: | :--- |');
  const owaspStatus = result.summary.critical + result.summary.high === 0 ? '✅ Pass' : '⚠️ Action Required';
  const pciStatus = result.summary.critical === 0 ? '✅ Compliant' : '❌ Non-Compliant';
  const soc2Status = result.summary.critical === 0 ? '✅ Ready' : '⚠️ Gaps Detected';
  lines.push(`| **OWASP API Security Top 10 (2023)** | ${owaspStatus} | API1:BOLA, API2:Auth, API3:BOPLA |`);
  lines.push(`| **PCI-DSS v4.0** | ${pciStatus} | Requirement 6.2.4 & 8.2.1 |`);
  lines.push(`| **SOC 2 Type II** | ${soc2Status} | CC6.1 Logical Access & CC7.1 Vuln Mgmt |`);
  lines.push('');

  if (result.baselineDiff) {
    lines.push('### CI/CD Baseline Comparison');
    lines.push('');
    lines.push(`- **Baseline Source:** \`${result.baselineDiff.baselineFile}\``);
    lines.push(`- **New Security Regressions:** **${result.baselineDiff.newFindings.length}**`);
    lines.push(`- **Persistent Known Findings:** ${result.baselineDiff.persistentFindings.length}`);
    lines.push(`- **Resolved Findings:** ${result.baselineDiff.resolvedFindings.length}`);
    lines.push(`- **Suppressed Risk Acceptances:** ${result.baselineDiff.suppressedCount}`);
    lines.push('');
  }

  if (result.attackGraph && result.attackGraph.attackPaths.length > 0) {
    lines.push('## Attack Graph & Kill Chains (CyberStrikeAI)');
    lines.push('');
    for (const ap of result.attackGraph.attackPaths) {
      lines.push(`- **Risk Score ${ap.riskScore}:** ${ap.description}`);
      lines.push(`  - Path: \`${ap.path.join(' ➔ ')}\``);
    }
    lines.push('');
  }

  if (result.findings.length === 0) {
    lines.push('🎉 **Zero vulnerabilities identified within the configured scan scope.**');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('## Detailed Findings');
  lines.push('');

  for (const finding of result.findings) {
    const badge = finding.severity.toUpperCase();
    lines.push(`### [${badge}] ${finding.title}`);
    lines.push('');
    lines.push(`- **Finding ID:** \`${finding.id}\``);
    lines.push(`- **Category:** \`${finding.category}\``);
    if (finding.cvss) {
      lines.push(`- **CVSS v3.1:** \`${finding.cvss.score} (${finding.cvss.rating})\` — \`${finding.cvss.vector}\``);
    }
    if (finding.compliance) {
      const comp = finding.compliance;
      const compItems: string[] = [];
      if (comp.owaspApi) compItems.push(`OWASP API: ${comp.owaspApi}`);
      if (comp.pciDss) compItems.push(`PCI-DSS: ${comp.pciDss}`);
      if (comp.soc2) compItems.push(`SOC 2: ${comp.soc2}`);
      if (compItems.length > 0) {
        lines.push(`- **Compliance:** ${compItems.join(' | ')}`);
      }
    }
    if (finding.cwe) lines.push(`- **CWE:** [${finding.cwe}](https://cwe.mitre.org/data/definitions/${finding.cwe.replace('CWE-', '')}.html)`);
    lines.push(`- **Vulnerable Target:** \`${finding.target}\``);
    lines.push('');
    lines.push(`**Description:**`);
    lines.push(finding.description);
    lines.push('');

    if (finding.evidence.reproCurl) {
      lines.push('**Reproduction Proof-of-Concept:**');
      lines.push('```bash');
      lines.push(finding.evidence.reproCurl);
      lines.push('```');
      lines.push('');
    }

    if (finding.evidence.response?.snippet) {
      lines.push('**Response Snippet:**');
      lines.push('```');
      lines.push(finding.evidence.response.snippet);
      lines.push('```');
      lines.push('');
    }

    lines.push(`**Remediation Recommendation:**`);
    lines.push(finding.remediation);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

export function generateFableWorkCards(findings: RedTeamFinding[]): string {
  const lines: string[] = [];

  for (const finding of findings) {
    const badge = finding.severity.toUpperCase();
    lines.push(`### [${badge}] Remediation: ${finding.title}`);
    lines.push(`- **Finding ID:** ${finding.id}`);
    lines.push(`- **Target:** \`${finding.target}\``);
    lines.push(`- **Action:** ${finding.remediation}`);
    lines.push(`- **Status: Open**`);
    lines.push('');
  }

  return lines.join('\n');
}
