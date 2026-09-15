import type {
  AdapterContext,
  CloudflareFinding,
  FindingCategory,
  FindingSeverity,
  RedTeamFinding,
  ToolAdapterId,
} from '../types.js';
import { BaseToolAdapter } from './base.js';
import { runSecurityAudit } from '../audit/engine.js';

export class CloudflareAuditAdapter extends BaseToolAdapter {
  readonly id: ToolAdapterId = 'cloudflare';
  readonly name = 'Cloudflare Security Audit Engine';
  readonly description =
    'Multi-phase coverage-led security audit with adversarial candidate validation and report-schema.json compliance';

  async isAvailable(_context?: AdapterContext): Promise<boolean> {
    return true;
  }

  async run(context: AdapterContext): Promise<RedTeamFinding[]> {
    const auditResult = await runSecurityAudit({
      target: context.target,
      profile: context.profile === 'audit' ? 'full' : 'quick',
      token: context.authToken,
      secondToken: context.secondAuthToken,
      writeArtifacts: false,
    });

    return auditResult.findings.map((cfFinding) =>
      this.toRedTeamFinding(cfFinding, context.target)
    );
  }

  /**
   * Convert a Cloudflare findings.json entry into Fable's canonical RedTeamFinding.
   */
  toRedTeamFinding(cfFinding: CloudflareFinding, target: string): RedTeamFinding {
    const severity = this.mapSeverity(cfFinding.severity?.overall_severity);
    const category = this.inferCategory(cfFinding.title, cfFinding.description);
    const cwe = this.inferCwe(category);

    const finding = this.createFinding({
      title: cfFinding.title,
      category,
      severity,
      description: cfFinding.description,
      target,
      remediation:
        cfFinding.remediation?.strategy ||
        'Remediate trust boundary violation according to Cloudflare audit standards.',
      reproCurl:
        cfFinding.execution?.payloads?.[0] ||
        cfFinding.execution?.instructions?.[0] ||
        (cfFinding.execution as any)?.command,
      responseSnippet: cfFinding.execution?.observed_result,
      cwe,
      confidence:
        typeof cfFinding.confidence === 'string'
          ? (cfFinding.confidence as string) === 'proven' || (cfFinding.confidence as string) === 'high'
            ? 1.0
            : 0.8
          : cfFinding.confidence?.score === 'high'
          ? 1.0
          : cfFinding.confidence?.score === 'medium'
          ? 0.8
          : 0.5,
      evidenceLevel: cfFinding.verdict === 'confirmed' ? 'reproduced' : 'inferred',
      lifecycle: cfFinding.verdict === 'confirmed' ? 'confirmed' : 'new',
    });

    if (cfFinding.fingerprint) {
      finding.id = cfFinding.fingerprint;
      finding.fingerprint = cfFinding.fingerprint;
    }
    return finding;
  }

  /**
   * Convert a Fable RedTeamFinding into a Cloudflare findings.json compliant record.
   */
  toCloudflareFinding(finding: RedTeamFinding): CloudflareFinding {
    const normSeverity = (finding.severity === 'info' ? 'informational' : finding.severity) as
      | 'informational'
      | 'low'
      | 'medium'
      | 'high'
      | 'critical';
    const impactScore = normSeverity;
    const likelihoodScore = normSeverity === 'critical' || normSeverity === 'high' ? 'high' : normSeverity;
    const filePath = finding.target.startsWith('http://') || finding.target.startsWith('https://')
      ? 'src/api.ts'
      : finding.target;

    const confVal = finding.confidence ?? finding.evidence?.confidence ?? 0.8;
    const confidenceScore: 'low' | 'medium' | 'high' =
      confVal >= 0.9 ? 'high' : confVal >= 0.7 ? 'medium' : 'low';

    return {
      verdict:
        finding.lifecycle === 'confirmed' || finding.evidence?.evidenceLevel === 'reproduced'
          ? 'confirmed'
          : 'needs_validation',
      fingerprint: finding.fingerprint || finding.id,
      title: finding.title,
      description: finding.description,
      root_cause: `Boundary failure identified in ${finding.category} check.`,
      intended_behavior: `Proper authorization and validation controls must be enforced on ${finding.target}.`,
      trace: [
        {
          kind: 'entrypoint',
          file: filePath,
          line: 1,
          scope: 'ingress-surface',
          description: `Entry surface: ${finding.target}`,
        },
        {
          kind: 'sink',
          file: filePath,
          line: 1,
          scope: 'boundary-sink',
          description: `Vulnerable target sink: ${finding.category}`,
        },
      ],
      evidence: [
        {
          file: filePath,
          line: 1,
          description: `Observed security failure on ${finding.target}`,
        },
      ],
      conditions: [
        {
          kind: 'system_configuration',
          description: 'Standard application runtime environment and network routing',
        },
      ],
      execution: {
        attacker_perspective: 'external network attacker',
        payloads: [finding.evidence?.reproCurl || `curl -i -s "${finding.target}"`],
        instructions: ['Send crafted request establishing boundary failure'],
        observed_result:
          finding.evidence?.response?.snippet ||
          'Unexpected response confirming trust boundary failure.',
      },
      remediation: {
        strategy: finding.remediation,
      },
      severity: {
        overall_severity: normSeverity,
        likelihood: {
          score: likelihoodScore,
          reason: 'Likelihood established through observed network exposure.',
        },
        impact: {
          score: impactScore,
          reason: `Impact confirmed via ${finding.category} vulnerability.`,
        },
      },
      confidence: {
        score: confidenceScore,
        reason: `Confidence calibrated via ${finding.evidence?.evidenceLevel || 'analysis'}.`,
      },
    };
  }

  private mapSeverity(overall?: string): FindingSeverity {
    switch (overall?.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'info';
    }
  }

  private inferCategory(title: string, desc: string): FindingCategory {
    const text = `${title} ${desc}`.toLowerCase();
    if (text.includes('auth') || text.includes('token') || text.includes('login')) return 'auth-bypass';
    if (text.includes('idor') || text.includes('bola') || text.includes('tenant')) return 'idor-bola';
    if (text.includes('secret') || text.includes('.env') || text.includes('key')) return 'sensitive-exposure';
    if (text.includes('header') || text.includes('cors')) return 'security-headers';
    if (text.includes('inject') || text.includes('sql') || text.includes('xss')) return 'injection';
    if (text.includes('ssrf') || text.includes('metadata')) return 'ssrf';
    if (text.includes('prompt') || text.includes('llm')) return 'llm-prompt-injection';
    return 'business-logic';
  }

  private inferCwe(category: FindingCategory): string {
    switch (category) {
      case 'sensitive-exposure':
        return 'CWE-200';
      case 'auth-bypass':
        return 'CWE-287';
      case 'idor-bola':
        return 'CWE-639';
      case 'security-headers':
        return 'CWE-1021';
      case 'injection':
        return 'CWE-89';
      case 'ssrf':
        return 'CWE-918';
      case 'llm-prompt-injection':
        return 'CWE-77';
      default:
        return 'CWE-840';
    }
  }
}
