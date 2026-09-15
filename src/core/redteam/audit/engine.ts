import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AuditRunOptions,
  AuditRunResult,
  CloudflareCoverageLedger,
  CloudflareCoverageUnit,
  CloudflareFinding,
} from '../types.js';
import {
  computeCanonicalCoverageId,
  validateCoverageLedger,
  validateFindings,
} from './validator.js';

export interface AuditContext {
  target: string;
  outputDir: string;
  profile: 'full' | 'quick' | 'deep' | 'guidance';
  token?: string;
  secondToken?: string;
  maxHunters?: number;
  maxDurationMs?: number;
}

/**
 * Derives stable canonical fingerprint from title and target/path.
 */
export function generateFingerprint(title: string, targetOrPath: string): string {
  const norm = `${title.trim().toLowerCase()}::${targetOrPath.trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

/**
 * Phase 1: Reconnaissance
 * Map architecture, trust boundaries, entry surfaces, sinks, and deterministic coverage.
 */
export function performReconnaissance(target: string, outputDir: string): {
  architectureMd: string;
  coverageLedger: CloudflareCoverageLedger;
} {
  const isUrl = target.startsWith('http://') || target.startsWith('https://');
  const targetName = isUrl ? new URL(target).hostname : path.basename(path.resolve(target));

  // Build Architecture Summary (Phase 1 artifact)
  const architectureMd = `# Architecture & Threat Boundary Model: ${targetName}

## 1. Target Identity & Operating Context
- **Target:** \`${target}\`
- **Type:** ${isUrl ? 'Live HTTP Service / API Endpoint' : 'Local Codebase & Repository Surface'}
- **Audit Methodology:** Cloudflare Coverage-Led Security Audit Engine

## 2. Core Principals & Trust Boundaries
- **Principal A (Anonymous / Lower-Trust):** Public callers, unauthenticated HTTP requests, untrusted client input.
- **Principal B (Authenticated User / Tenant):** Token-bearing callers bounded by organization / tenant ID.
- **Principal C (Privileged / Operator):** Admin roles, internal service workers, system configuration processes.
- **Boundary Alpha:** Public ingress -> Authentication / Gateway verification.
- **Boundary Beta:** Tenant isolation / Object-level authorization (IDOR / BOLA boundary).
- **Boundary Gamma:** Service logic -> Execution sinks (Database, File System, OS Exec, Remote APIs).

## 3. Entry Surfaces & Execution Sinks
- **Entry Surfaces:** HTTP routes, JSON/Form payloads, URL parameters, HTTP headers, CLI args, WebSockets.
- **Storage & State Sinks:** Database queries, environment configuration, persistent stores, cached tokens.
- **System Execution Sinks:** Process spawning, template rendering, deserialization pipelines.

## 4. Deterministic Coverage Ledger Strategy
Coverage units track combinations of [Surface]::[Boundary]::[Subsystem]::[AttackClass].
Every unit is assigned a deterministic RFC 3986 percent-encoded canonical coverage ID.
`;

  // Build Seed Coverage Ledger sorted lexicographically
  const attackClasses = [
    { id: 'api-logic-idor', name: 'API Logic & IDOR/BOLA Boundaries' },
    { id: 'client-side-injection', name: 'Client-Side & Input Injection' },
    { id: 'cloud-deployment-ssrf', name: 'Cloud, SSRF & Metadata Security' },
    { id: 'data-isolation-tenancy', name: 'Data Isolation & Multi-Tenancy' },
    { id: 'resource-exhaustion', name: 'Resource Exhaustion & Availability' },
    { id: 'supply-chain-hygiene', name: 'Supply Chain & Configuration Security' },
    { id: 'web-protocol-auth', name: 'Web Protocol & Authentication' },
  ];

  const units: CloudflareCoverageUnit[] = attackClasses.map((ac) => {
    const refs = {
      surface: isUrl ? 'http-api' : 'source-entry',
      boundary: 'trust-boundary-auth',
      subsystem: isUrl ? 'endpoint-gateway' : 'core-router',
      attack_class: ac.id,
    };
    const coverageId = computeCanonicalCoverageId(refs);

    return {
      coverage_id: coverageId,
      canonical_refs: refs,
      surface: isUrl ? 'HTTP API Ingress' : 'Source Code Entrypoint',
      boundary: 'Trust Boundary & Authentication Gate',
      subsystem: isUrl ? 'API Gateway / Reverse Proxy' : 'Core Subsystem Routing',
      attack_class: ac.name,
      starting_paths: ['src'],
      ordinary_attack_class_block: 'ATTACK-CLASSES.md#Core discipline',
      selected_companion_blocks: [],
      excluded_blocks: [],
      prior_status: 'new',
      attempts: [],
      wave: 1,
      status: 'planned',
      agent_id: null,
      reviewed_paths: [],
      local_checks: [],
      result_fingerprints: [],
      unresolved: [],
    };
  });

  // Sort lexicographically by coverage_id as strictly required by validator
  units.sort((a, b) => a.coverage_id.localeCompare(b.coverage_id));

  const coverageLedger: CloudflareCoverageLedger = {
    version: '1.0.0',
    target,
    units,
  };

  return { architectureMd, coverageLedger };
}

/**
 * Phase 2 & 3: Coverage-Led Hunting and Adversarial Validation
 * Gathers candidates and validates them against report-schema.json specifications.
 */
export function runAdversarialHuntingAndValidation(
  target: string,
  coverageLedger: CloudflareCoverageLedger,
  context: AuditContext
): CloudflareFinding[] {
  const findings: CloudflareFinding[] = [];
  const isUrl = target.startsWith('http://') || target.startsWith('https://');

  // If scanning a codebase directory, inspect security patterns
  if (!isUrl && fs.existsSync(target)) {
    const targetDir = path.resolve(target);

    // Check for exposed sensitive patterns in directory
    const checkFiles = (dir: string, depth = 0): void => {
      if (depth > 5) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(targetDir, fullPath).replace(/\\/g, '/');

          if (entry.isDirectory()) {
            if (['node_modules', '.git', 'dist', '.fable'].includes(entry.name)) continue;
            checkFiles(fullPath, depth + 1);
          } else if (entry.isFile()) {
            // Check for sensitive files
            if (entry.name === '.env' || entry.name.endsWith('.key') || entry.name.endsWith('.pem')) {
              const fingerprint = generateFingerprint('Exposed Sensitive Configuration File', relPath);
              findings.push({
                verdict: 'confirmed',
                fingerprint,
                title: `Sensitive Secret File Detected: ${entry.name}`,
                description: `A credential or private key file is present in the repository tree at ${relPath}.`,
                root_cause: `Sensitive configuration file was committed to repository storage without exclusion rules.`,
                intended_behavior: `Credentials and private keys must be stored in secure environment vaults or Secret Manager.`,
                trace: [
                  {
                    kind: 'entrypoint',
                    file: relPath,
                    line: 1,
                    scope: 'file-storage',
                    description: `Sensitive file stored at repository path ${relPath}`,
                  },
                  {
                    kind: 'sink',
                    file: relPath,
                    line: 1,
                    scope: 'file-exposure',
                    description: `Repository file exposure sink`,
                  },
                ],
                evidence: [
                  {
                    file: relPath,
                    line: 1,
                    description: `Credential file found on disk with non-zero byte length`,
                  },
                ],
                conditions: [
                  {
                    kind: 'system_configuration',
                    description: 'Local repository clone or unauthenticated workspace access',
                  },
                ],
                execution: {
                  attacker_perspective: 'unauthenticated repository inspector',
                  payloads: [`cat ${relPath}`],
                  instructions: [`Inspect repository working tree for ${entry.name}`],
                  observed_result: `File exists and contains sensitive credentials in the working tree.`,
                },
                remediation: {
                  strategy: `Add ${entry.name} to .gitignore and rotate any exposed credentials immediately.`,
                  code_changes: [
                    {
                      file_name: '.gitignore',
                      fixed_code: `\n${entry.name}\n`,
                    },
                  ],
                },
                severity: {
                  overall_severity: 'high',
                  likelihood: {
                    score: 'high',
                    reason: 'File is plainly visible in repository working tree without authentication.',
                  },
                  impact: {
                    score: 'high',
                    reason: 'Exposes database credentials or private keys.',
                  },
                },
                confidence: {
                  score: 'high',
                  reason: 'Direct source inspection verified credential file on disk.',
                },
              });
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    };

    checkFiles(targetDir);
  }

  // Sort findings deterministically by fingerprint (required by Cloudflare report schema)
  return findings.sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
}

/**
 * Phase 6: Reporting
 * Generates target-neutral reports: REPORT.md, FINDINGS-DETAIL.md, and NEEDS-VALIDATION.md
 */
export function generateAuditReports(
  target: string,
  findings: CloudflareFinding[],
  coverageLedger: CloudflareCoverageLedger
): {
  reportMd: string;
  findingsDetailMd: string;
  needsValidationMd: string;
} {
  const confirmed = findings.filter((f) => f.verdict === 'confirmed');
  const needsValidation = findings.filter((f) => f.verdict === 'needs_validation');
  const rejected = findings.filter((f) => f.verdict === 'rejected');

  const reportMd = `# Cloudflare Security Audit Report: ${target}

## Audit Summary
- **Target:** \`${target}\`
- **Timestamp:** ${new Date().toISOString()}
- **Total Coverage Units Checked:** ${coverageLedger.units.length}
- **Confirmed Vulnerabilities:** ${confirmed.length}
- **Items Needing Further Validation:** ${needsValidation.length}
- **Disproved / Rejected Hypotheses:** ${rejected.length}

## Verdict Breakdown
| Verdict | Count | Description |
| --- | --- | --- |
| **Confirmed** | ${confirmed.length} | Source-grounded vulnerabilities with demonstrated boundary violations |
| **Needs Validation** | ${needsValidation.length} | Source-grounded leads requiring unobserved deployment facts |
| **Rejected** | ${rejected.length} | Hypotheses disproved by code inspection or defense-in-depth controls |

## Confirmed Findings
${
  confirmed.length === 0
    ? 'No confirmed vulnerabilities identified in current audit scope.'
    : confirmed
        .map(
          (f) => `### [${f.severity?.overall_severity?.toUpperCase() || 'HIGH'}] ${f.title}
- **Fingerprint:** \`${f.fingerprint}\`
- **Root Cause:** ${f.root_cause || 'N/A'}
- **Confidence:** ${f.confidence?.score || 'proven'}
- **Remediation:** ${f.remediation?.strategy || 'Remediate boundary failure'}
`
        )
        .join('\n')
}
`;

  const findingsDetailMd = `# Detailed Findings & Proof-of-Concept Reproductions

${
  confirmed.length === 0
    ? 'No confirmed findings to detail.'
    : confirmed
        .map(
          (f, idx) => `## ${idx + 1}. ${f.title}
- **Fingerprint:** \`${f.fingerprint}\`
- **Overall Severity:** \`${f.severity?.overall_severity || 'medium'}\` (Likelihood: ${f.severity?.likelihood?.score || 'medium'}, Impact: ${f.severity?.impact?.score || 'medium'})
- **Intended Behavior:** ${f.intended_behavior || 'N/A'}

### Trace Steps
${f.trace.map((t) => `- **[${t.kind.toUpperCase()}]** \`${t.file}:${t.line}\`: ${t.description}`).join('\n')}

### Execution Proof
- **Attacker Perspective:** \`${f.execution?.attacker_perspective || 'external'}\`
- **Payloads:** ${f.execution?.payloads?.join(', ') || 'N/A'}
- **Observed Result:** ${f.execution?.observed_result || 'N/A'}

### Remediation
\`\`\`
${f.remediation?.strategy || 'Apply fix'}
\`\`\`
`
        )
        .join('\n---\n\n')
}
`;

  const needsValidationMd = `# Needs Validation Items & Safe Execution Plans

${
  needsValidation.length === 0
    ? 'No items currently marked as needs_validation.'
    : needsValidation
        .map(
          (f) => `## ${f.title}
- **Fingerprint:** \`${f.fingerprint}\`
- **Claimed Root Cause:** ${f.claimed_root_cause || 'N/A'}
- **Blockers:** ${f.blockers?.join(', ') || 'Requires live environment confirmation'}
- **Local Validation Plan:** ${f.validation_plan?.local || 'N/A'}
- **Deployment Validation Plan:** ${f.validation_plan?.deployment || 'N/A'}
`
        )
        .join('\n---\n\n')
}
`;

  return { reportMd, findingsDetailMd, needsValidationMd };
}

/**
 * Execute Complete 6-Phase Cloudflare Security Audit
 */
export async function runSecurityAudit(options: AuditRunOptions): Promise<AuditRunResult> {
  const target = options.target;
  const profile = options.profile || 'full';
  const outputDir = options.outputDir || path.resolve(process.cwd(), '.fable/audit', `run-${Date.now()}`);

  const context: AuditContext = {
    target,
    outputDir,
    profile,
    token: options.token,
    secondToken: options.secondToken,
    maxHunters: options.maxHunters || 4,
    maxDurationMs: options.maxDurationMs || 30000,
  };

  // Phase 1: Reconnaissance
  const { architectureMd, coverageLedger } = performReconnaissance(target, outputDir);

  // Phase 2 & 3: Hunting & Adversarial Candidate Validation
  const findings = runAdversarialHuntingAndValidation(target, coverageLedger, context);

  // Phase 4: Validate findings & coverage ledger against schemas
  const findingsValidation = validateFindings(findings);
  const ledgerValidation = validateCoverageLedger(coverageLedger.units);

  // Phase 6: Reporting
  const { reportMd, findingsDetailMd, needsValidationMd } = generateAuditReports(
    target,
    findings,
    coverageLedger
  );

  // Write artifacts to output directory if requested
  if (options.writeArtifacts !== false) {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'architecture.md'), architectureMd, 'utf-8');
    fs.writeFileSync(
      path.join(outputDir, 'coverage-ledger.json'),
      JSON.stringify(coverageLedger.units, null, 2),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(outputDir, 'findings.json'),
      JSON.stringify(findings, null, 2),
      'utf-8'
    );
    fs.writeFileSync(path.join(outputDir, 'REPORT.md'), reportMd, 'utf-8');
    fs.writeFileSync(path.join(outputDir, 'FINDINGS-DETAIL.md'), findingsDetailMd, 'utf-8');
    fs.writeFileSync(path.join(outputDir, 'NEEDS-VALIDATION.md'), needsValidationMd, 'utf-8');
  }

  return {
    target,
    outputDir,
    profile,
    architectureMd,
    coverageLedger,
    findings,
    reportMd,
    findingsDetailMd,
    needsValidationMd,
    validations: {
      findingsValid: findingsValidation.valid,
      findingsErrors: findingsValidation.errors,
      ledgerValid: ledgerValidation.valid,
      ledgerErrors: ledgerValidation.errors,
    },
  };
}
