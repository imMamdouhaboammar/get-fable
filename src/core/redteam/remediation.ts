import fs from 'node:fs';
import path from 'node:path';
import { calculatePriorityBreakdown } from './correlation.js';
import type { RedTeamFinding, RemediationWorkCard } from './types.js';

export function createRemediationCards(findings: RedTeamFinding[]): RemediationWorkCard[] {
  // Filter by multi-factor priority score:
  // Eligible if priority score >= 0.50 OR severity is critical/high OR verified reproduction exists
  const eligible = findings.filter((f) => {
    const priority = f.priority || calculatePriorityBreakdown(f);
    const hasRepro = Boolean(f.evidence.reproCurl || f.evidenceLevel === 'reproduced');
    return priority.score >= 0.5 || f.severity === 'critical' || f.severity === 'high' || hasRepro;
  });

  // Sort descending by priority score
  eligible.sort((a, b) => {
    const scoreA = a.priority?.score ?? calculatePriorityBreakdown(a).score;
    const scoreB = b.priority?.score ?? calculatePriorityBreakdown(b).score;
    return scoreB - scoreA;
  });

  return eligible.map((finding) => {
    const priority = finding.priority || calculatePriorityBreakdown(finding);
    const suggestedTestCode = generateSuggestedTestCode(finding);

    return {
      id: finding.id,
      fingerprint: finding.fingerprint,
      title: `Remediate ${finding.title}`,
      severity: finding.severity,
      priorityScore: priority.score,
      confidence: priority.confidence,
      evidenceLevel: finding.evidenceLevel || (finding.evidence.reproCurl ? 'reproduced' : 'observed'),
      description: finding.description,
      cwe: finding.cwe,
      reproCurl: finding.evidence.reproCurl,
      remediation: finding.remediation,
      suggestedTestCode,
      status: 'open',
    };
  });
}

export function generateSuggestedTestCode(finding: RedTeamFinding): string {
  if (finding.category === 'sensitive-exposure' || finding.target.includes('.env')) {
    return `test('remediation: sensitive path ${finding.target} is blocked (403/404)', async () => {
  const res = await fetch('${finding.target}');
  expect([401, 403, 404]).toContain(res.status);
  const text = await res.text();
  expect(text).not.toContain('DATABASE_URL');
  expect(text).not.toContain('SECRET_KEY');
  expect(text).not.toContain('API_KEY');
});`;
  }

  if (finding.category === 'security-headers') {
    return `test('remediation: enforce security headers on ${finding.target}', async () => {
  const res = await fetch('${finding.target}');
  const csp = res.headers.get('content-security-policy');
  const xfo = res.headers.get('x-frame-options');
  const xcto = res.headers.get('x-content-type-options');
  expect(csp || xfo || xcto).toBeTruthy();
});`;
  }

  if (finding.category === 'cors-misconfiguration') {
    return `test('remediation: CORS rejects unauthorized arbitrary origins', async () => {
  const res = await fetch('${finding.target}', {
    headers: { Origin: 'https://attacker.example.com' }
  });
  const allowOrigin = res.headers.get('access-control-allow-origin');
  expect(allowOrigin).not.toBe('https://attacker.example.com');
  expect(allowOrigin).not.toBe('*');
});`;
  }

  if (finding.category === 'auth-bypass' || finding.category === 'idor-bola') {
    return `test('remediation: rejects unauthenticated or unauthorized access on ${finding.target}', async () => {
  const res = await fetch('${finding.target}', {
    method: 'GET',
  });
  expect([401, 403, 404]).toContain(res.status);
});`;
  }

  return `test('remediation: ${finding.title}', async () => {
  const res = await fetch('${finding.target}');
  expect(res.status).toBeLessThan(500);
});`;
}

export function writeRemediationToLedger(
  findings: RedTeamFinding[],
  cwd: string = process.cwd()
): { count: number; ledgerPath: string } {
  const cards = createRemediationCards(findings);
  if (cards.length === 0) {
    return { count: 0, ledgerPath: path.join(cwd, '.fable/LEDGER.md') };
  }

  const fableDir = path.join(cwd, '.fable');
  fs.mkdirSync(fableDir, { recursive: true });
  const ledgerPath = path.join(fableDir, 'LEDGER.md');

  let existingContent = '';
  if (fs.existsSync(ledgerPath)) {
    existingContent = fs.readFileSync(ledgerPath, 'utf-8');
  } else {
    existingContent = '# Task Ledger\n\n## Active Tasks\n\n';
  }

  const newCards: string[] = [];
  for (const card of cards) {
    // Avoid duplicate cards if already tracked
    if (existingContent.includes(card.id) || (card.fingerprint && existingContent.includes(card.fingerprint))) {
      continue;
    }

    const priorityBadge = card.priorityScore !== undefined ? ` | Priority: ${(card.priorityScore * 100).toFixed(0)}%` : '';
    const evidenceBadge = card.evidenceLevel ? ` [${card.evidenceLevel.toUpperCase()}]` : '';

    const cardContent = [
      `### [WORK-CARD] ${card.title} (${card.severity.toUpperCase()}${priorityBadge})${evidenceBadge}`,
      `- **ID:** \`${card.id}\``,
      card.fingerprint ? `- **Fingerprint:** \`${card.fingerprint}\`` : '',
      `- **Severity:** ${card.severity.toUpperCase()}`,
      card.priorityScore !== undefined ? `- **Priority Score:** ${card.priorityScore} (Confidence: ${card.confidence ?? 0.8})` : '',
      card.evidenceLevel ? `- **Evidence Level:** \`${card.evidenceLevel}\`` : '',
      `- **CWE:** ${card.cwe || 'N/A'}`,
      `- **Description:** ${card.description}`,
      `- **Remediation Action:** ${card.remediation}`,
      card.reproCurl ? `- **Repro cURL:** \`${card.reproCurl}\`` : '',
      `- **Failing TDD Regression Test:**`,
      '```typescript',
      card.suggestedTestCode || '',
      '```',
      `- **Status:** ${card.status || 'open'}`,
      '',
    ]
      .filter(Boolean)
      .join('\n');

    newCards.push(cardContent);
  }

  if (newCards.length > 0) {
    const updatedContent = existingContent.trimEnd() + '\n\n' + newCards.join('\n');
    fs.writeFileSync(ledgerPath, updatedContent, 'utf-8');
  }

  return {
    count: newCards.length,
    ledgerPath,
  };
}
