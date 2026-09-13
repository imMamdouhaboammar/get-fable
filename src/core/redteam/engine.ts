import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getAllAdapters } from './adapters/index.js';
import { CyberStrikeAdapter } from './adapters/cyberstrike.js';
import { correlateAndDeduplicateFindings, diffWithBaseline } from './correlation.js';
import { discoverTargetSurface } from './crawler.js';
import { buildExecutionEnvelope, EnvelopeHttpClient, validateEnvelopeTarget } from './envelope.js';
import { runAllPlaybooks, runPlaybook } from './playbooks/runner.js';
import { generateSuggestedTestCode } from './remediation.js';
import { generateMarkdownReport, summarizeFindings } from './reporter.js';
import { generateSarifReport } from './sarif.js';
import { loadScopeConfig, validateScope } from './scope.js';
import { DEFAULT_ENVIRONMENT_POLICY } from './setup.js';
import type {
  AdapterContext,
  ExecutionEnvelope,
  RedTeamFinding,
  RedTeamResult,
  RunAttestation,
  ScanOptions,
} from './types.js';

/**
 * Backwards-compatible export that delegates to the canonical correlation and deduplication engine.
 */
export function deduplicateFindings(findings: RedTeamFinding[]): RedTeamFinding[] {
  return correlateAndDeduplicateFindings(findings);
}

export function calculateExecutiveGrade(summary: RedTeamResult['summary']): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (summary.critical > 0) return 'F';
  if (summary.high > 2) return 'D';
  if (summary.high > 0) return 'C';
  if (summary.medium > 2) return 'B';
  return 'A';
}

export function estimateMttrHours(summary: RedTeamResult['summary']): number {
  return (
    summary.critical * 8 +
    summary.high * 4 +
    summary.medium * 2 +
    summary.low * 1
  );
}

export function generateRunAttestation(
  target: string,
  profile: RedTeamResult['profile'],
  activeAdapters: string[],
  summary: RedTeamResult['summary'],
  scopeConfig: unknown
): RunAttestation {
  const timestamp = new Date().toISOString();
  const scopeDigest = crypto
    .createHash('sha256')
    .update(JSON.stringify(scopeConfig || {}))
    .digest('hex');

  const payload = [
    'get-fable-redteam',
    target,
    profile,
    timestamp,
    activeAdapters.slice().sort().join(','),
    summary.total,
    summary.critical,
    summary.high,
    scopeDigest,
  ].join(':');

  const attestationHash = crypto.createHash('sha256').update(payload).digest('hex');

  return {
    attestationVersion: '1.0.0',
    target,
    profile,
    scanTimestamp: timestamp,
    activeAdapters,
    findingsCount: summary.total,
    criticalCount: summary.critical,
    highCount: summary.high,
    attestationHash,
    scopeDigest,
    generatedBy: 'get-fable-redteam',
  };
}

export async function runRedTeamScan(
  options: ScanOptions,
  writeArtifacts = true
): Promise<RedTeamResult> {
  const scopeConfig = options.scopeConfig || loadScopeConfig(options.scopeFilePath);
  validateScope(options.target, scopeConfig);

  // Build and enforce ExecutionEnvelope with rateLimit & concurrency overrides
  const envelopeOverrides: Partial<ExecutionEnvelope> = { ...options.envelope };
  if (options.rateLimit) envelopeOverrides.maxRequestsPerSecond = options.rateLimit;
  if (options.concurrency) envelopeOverrides.maxConcurrency = options.concurrency;

  const envelope = buildExecutionEnvelope(scopeConfig, envelopeOverrides);
  const envelopeCheck = validateEnvelopeTarget(options.target, envelope);
  if (!envelopeCheck.allowed) {
    throw new Error(`ExecutionEnvelope Violation: ${envelopeCheck.reason}`);
  }

  const startTime = new Date().toISOString();
  const profile = options.profile || 'passive';
  const safeMode = options.safeMode ?? scopeConfig.safeMode ?? true;
  const policy = options.policy || DEFAULT_ENVIRONMENT_POLICY;
  const client = new EnvelopeHttpClient(envelope);

  const adapterContext: AdapterContext = {
    target: options.target,
    profile,
    scopeConfig,
    authToken: options.authToken,
    secondAuthToken: options.secondAuthToken,
    safeMode,
    timeoutMs: options.timeoutMs || envelope.maxDurationMs || 15000,
    envelope,
    policy,
  };

  const rawFindings: RedTeamFinding[] = [];
  const activeAdapters: string[] = [];

  // 1. Tactical Playbook Execution (if explicitly requested or playbook profile)
  if (options.playbook) {
    activeAdapters.push(`playbook:${options.playbook}`);
    try {
      const pbFindings = await runPlaybook(options.playbook, options.target, {
        authToken: options.authToken,
        secondAuthToken: options.secondAuthToken,
        client,
        envelope,
        scopeConfig,
        safeMode,
      });
      rawFindings.push(...pbFindings);
    } catch (err) {
      console.warn(`Playbook ${options.playbook} failed:`, err instanceof Error ? err.message : String(err));
    }
  } else if (profile === 'playbook') {
    activeAdapters.push('playbooks:all');
    try {
      const pbFindings = await runAllPlaybooks(options.target, {
        authToken: options.authToken,
        secondAuthToken: options.secondAuthToken,
        client,
        envelope,
        scopeConfig,
        safeMode,
      });
      rawFindings.push(...pbFindings);
    } catch (err) {
      console.warn('Playbooks execution encountered error:', err instanceof Error ? err.message : String(err));
    }
  }

  // 2. Standard Modular Tool Adapters
  const allAdapters = getAllAdapters();
  const shouldOrchestrate = options.orchestrate || profile === 'orchestrated' || profile === 'comprehensive';
  const requestedAdapters = options.adapters;

  for (const adapter of allAdapters) {
    if (requestedAdapters && requestedAdapters.length > 0) {
      if (!requestedAdapters.includes(adapter.id)) continue;
    } else if (!shouldOrchestrate) {
      if (adapter.id !== 'native') {
        if (profile === 'api-logic' && adapter.id === 'akto') {
          // allow Akto for api-logic profile
        } else {
          continue;
        }
      }
    }

    const available = await adapter.isAvailable(adapterContext);
    if (available) {
      activeAdapters.push(adapter.id);
      try {
        const findings = await adapter.run(adapterContext);
        rawFindings.push(...findings);
      } catch (err) {
        console.warn(`Adapter ${adapter.id} encountered error:`, err instanceof Error ? err.message : String(err));
      }
    }
  }

  // 3. Playbooks in Comprehensive Scan
  if (profile === 'comprehensive' && !options.playbook) {
    try {
      const pbFindings = await runAllPlaybooks(options.target, {
        authToken: options.authToken,
        secondAuthToken: options.secondAuthToken,
        client,
        envelope,
        scopeConfig,
        safeMode,
      });
      rawFindings.push(...pbFindings);
      activeAdapters.push('claude-red-playbooks');
    } catch {
      // Safe fail-soft
    }
  }

  // 4. Correlate, cluster, and deduplicate findings
  const findings = correlateAndDeduplicateFindings(rawFindings);
  const endTime = new Date().toISOString();
  const summary = summarizeFindings(findings);

  // 5. Formulate calibrated attack graph using CyberStrike engine
  const cyberStrike = new CyberStrikeAdapter();
  const attackGraph = cyberStrike.buildAttackGraph(options.target, findings);

  // 6. Enterprise Risk Posture, Attestation & Baseline Analysis
  const executiveGrade = calculateExecutiveGrade(summary);
  const estimatedMttrHours = estimateMttrHours(summary);
  const attestation = generateRunAttestation(
    options.target,
    profile,
    activeAdapters,
    summary,
    scopeConfig
  );

  let baselineDiff;
  if (options.baselinePath && fs.existsSync(options.baselinePath)) {
    try {
      const raw = fs.readFileSync(options.baselinePath, 'utf-8');
      const parsed = JSON.parse(raw);
      const baselineFindings: RedTeamFinding[] = Array.isArray(parsed)
        ? parsed
        : parsed && Array.isArray(parsed.findings)
        ? parsed.findings
        : [];
      const suppressed = [
        ...(options.suppressedFingerprints || []),
        ...(scopeConfig.suppressedFingerprints || []),
      ];
      baselineDiff = diffWithBaseline(findings, baselineFindings, suppressed, options.baselinePath);
    } catch {
      // Safe fallback
    }
  }

  const result: RedTeamResult = {
    target: options.target,
    profile,
    startTime,
    endTime,
    findings,
    summary,
    attackGraph,
    activeAdapters,
    attestation,
    baselineDiff,
    executiveGrade,
    estimatedMttrHours,
  };

  // 7. Write Artifacts & Enterprise Reports
  if (writeArtifacts) {
    try {
      const docsDir = path.resolve(process.cwd(), 'docs/security');
      const fableDir = path.resolve(process.cwd(), '.fable');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.mkdirSync(fableDir, { recursive: true });

      // Save Markdown report
      const reportPath = path.join(docsDir, 'REDTEAM_REPORT.md');
      fs.writeFileSync(reportPath, generateMarkdownReport(result), 'utf-8');

      // Save Canonical JSON findings for verification & machine consumption
      const findingsPath = path.join(fableDir, 'redteam-findings.json');
      fs.writeFileSync(findingsPath, JSON.stringify(result, null, 2), 'utf-8');

      // Save Cryptographic Attestation
      const attestationPath = path.join(fableDir, 'run-attestation.json');
      fs.writeFileSync(attestationPath, JSON.stringify(attestation, null, 2), 'utf-8');

      // Save Baseline Diff if applicable
      if (baselineDiff) {
        const baselineDiffPath = path.join(fableDir, 'baseline-diff.json');
        fs.writeFileSync(baselineDiffPath, JSON.stringify(baselineDiff, null, 2), 'utf-8');
      }

      // Save SARIF Report if requested or custom output file
      if (options.outputFormat === 'sarif' || options.outputFile?.endsWith('.sarif')) {
        const sarifLog = generateSarifReport(result);
        const sarifPath = options.outputFile || path.join(docsDir, 'REDTEAM_REPORT.sarif');
        fs.writeFileSync(sarifPath, JSON.stringify(sarifLog, null, 2), 'utf-8');
      }

      // Write custom output file if specified
      if (options.outputFile) {
        if (options.outputFile.endsWith('.sarif') || options.outputFormat === 'sarif') {
          const sarifLog = generateSarifReport(result);
          fs.writeFileSync(options.outputFile, JSON.stringify(sarifLog, null, 2), 'utf-8');
        } else if (options.outputFile.endsWith('.json') || options.outputFormat === 'json') {
          fs.writeFileSync(options.outputFile, JSON.stringify(result, null, 2), 'utf-8');
        } else {
          fs.writeFileSync(options.outputFile, generateMarkdownReport(result), 'utf-8');
        }
      }

      // Write automated Bun regression tests if requested
      if (options.generateTests && findings.length > 0) {
        const testDir = path.join(process.cwd(), 'test/security');
        fs.mkdirSync(testDir, { recursive: true });
        const testFile = path.join(testDir, 'redteam-regression.test.ts');
        const testContent = [
          '// Continuous RedTeam Security Regression Test Suite',
          "import { describe, expect, test } from 'bun:test';",
          '',
          "describe('RedTeam Automated Security Regression Guard', () => {",
          ...findings.map((f) =>
            generateSuggestedTestCode(f)
              .split('\n')
              .map((l) => `  ${l}`)
              .join('\n')
          ),
          '});\n',
        ].join('\n');
        fs.writeFileSync(testFile, testContent, 'utf-8');
      }
    } catch {
      // Best-effort artifact persistence
    }
  }

  return result;
}
