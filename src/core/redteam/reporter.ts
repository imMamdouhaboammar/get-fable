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
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('| :--- | :---: |');
  lines.push(`| Critical | ${result.summary.critical} |`);
  lines.push(`| High | ${result.summary.high} |`);
  lines.push(`| Medium | ${result.summary.medium} |`);
  lines.push(`| Low | ${result.summary.low} |`);
  lines.push(`| Info | ${result.summary.info} |`);
  lines.push(`| **Total Findings** | **${result.summary.total}** |`);
  lines.push('');

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
