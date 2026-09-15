import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CloudflareAuditAdapter } from '../src/core/redteam/adapters/cloudflare.ts';
import {
  computeCanonicalCoverageId,
  validateCoverageLedger,
  validateFindings,
  validateFindingsFile,
  validateCoverageLedgerFile,
} from '../src/core/redteam/audit/validator.ts';
import { runSecurityAudit } from '../src/core/redteam/audit/engine.ts';
import { handleRedTeamCli } from '../src/core/redteam/cli.ts';
import type { CloudflareFinding, RedTeamFinding } from '../src/core/redteam/types.ts';

describe('Cloudflare Security Audit Native Integration', () => {
  test('CloudflareAuditAdapter exposes valid adapter identity and is available', async () => {
    const adapter = new CloudflareAuditAdapter();
    expect(adapter.id).toBe('cloudflare');
    expect(adapter.name).toBe('Cloudflare Security Audit Engine');
    expect(await adapter.isAvailable()).toBe(true);

    const status = await adapter.getStatus();
    expect(status.available).toBe(true);
    expect(status.runtime).toBe('ready');
  });

  test('CloudflareAuditAdapter accurately converts Cloudflare findings to RedTeamFinding', () => {
    const adapter = new CloudflareAuditAdapter();
    const cfFinding: CloudflareFinding = {
      verdict: 'confirmed',
      fingerprint: 'a1b2c3d4e5f60718',
      title: 'Broken Authentication in Admin Gateway',
      description: 'Missing bearer verification allows unauthenticated access.',
      root_cause: 'JWT validation middleware bypassed on /api/admin paths.',
      intended_behavior: 'All administrative endpoints require valid token signature.',
      trace: [
        {
          kind: 'entrypoint',
          file: 'src/routes/admin.ts',
          line: 12,
          scope: 'routing-layer',
          description: 'Route handler registers unauthenticated handler',
        },
        {
          kind: 'sink',
          file: 'src/routes/admin.ts',
          line: 45,
          scope: 'database-sink',
          description: 'Database query executed without identity context',
        },
      ],
      evidence: [
        {
          file: 'src/routes/admin.ts',
          line: 12,
          description: 'Source definition lacks auth guard middleware',
        },
      ],
      conditions: [
        {
          kind: 'system_configuration',
          description: 'Standard HTTP service routing without external WAF',
        },
      ],
      execution: {
        attacker_perspective: 'unauthenticated remote user',
        payloads: ['curl -i -s "http://localhost:3000/api/admin/users"'],
        instructions: ['Send GET request directly to admin endpoint without authorization header'],
        observed_result: 'HTTP 200 OK with sensitive user records',
      },
      remediation: {
        strategy: 'Add authenticateJwt middleware to all /api/admin routes.',
      },
      severity: {
        overall_severity: 'critical',
        likelihood: {
          score: 'high',
          reason: 'Publicly reachable administrative route without bearer token validation.',
        },
        impact: {
          score: 'critical',
          reason: 'Allows full exfiltration of user records.',
        },
      },
      confidence: {
        score: 'high',
        reason: 'Demonstrated via direct HTTP reproduction.',
      },
    };

    const redteamFinding = adapter.toRedTeamFinding(cfFinding, 'http://localhost:3000');
    expect(redteamFinding.id).toBe('a1b2c3d4e5f60718');
    expect(redteamFinding.title).toBe('Broken Authentication in Admin Gateway');
    expect(redteamFinding.severity).toBe('critical');
    expect(redteamFinding.category).toBe('auth-bypass');
    expect(redteamFinding.cwe).toBe('CWE-287');
    expect(redteamFinding.evidence.evidenceLevel).toBe('reproduced');
    expect(redteamFinding.evidence.confidence).toBe(1.0);
    expect(redteamFinding.evidence.reproCurl).toContain('curl -i -s');
    expect(redteamFinding.lifecycle).toBe('confirmed');
  });

  test('CloudflareAuditAdapter accurately converts RedTeamFinding to Cloudflare format', () => {
    const adapter = new CloudflareAuditAdapter();
    const finding: RedTeamFinding = {
      id: 'FINDING-BOLA-01',
      fingerprint: 'f001122334455667',
      title: 'Broken Object Level Authorization on Tenant Documents',
      category: 'idor-bola',
      severity: 'high',
      description: 'Callers can request arbitrary tenant files by changing documentId.',
      target: 'http://localhost:3000/api/docs',
      evidence: {
        reproCurl: 'curl -H "Authorization: Bearer test" http://localhost:3000/api/docs/999',
        response: {
          status: 200,
          snippet: '{"id": 999, "tenantId": "victim"}',
        },
        evidenceLevel: 'reproduced',
        confidence: 0.95,
      },
      remediation: 'Validate tenant ownership before loading document from store.',
      lifecycle: 'confirmed',
    };

    const cf = adapter.toCloudflareFinding(finding);
    expect(cf.verdict).toBe('confirmed');
    expect(cf.fingerprint).toBe('f001122334455667');
    expect(cf.title).toBe(finding.title);
    expect(cf.severity?.overall_severity).toBe('high');
    expect(cf.confidence?.score).toBe('high');
    expect(cf.execution?.payloads[0]).toContain('curl');
  });

  test('validateFindings validates valid findings and rejects malformed schema objects', () => {
    const validFindings: CloudflareFinding[] = [
      {
        verdict: 'confirmed',
        fingerprint: 'cf00112233445566',
        title: 'Arbitrary File Inclusion via Unsanitized Template Parameter',
        description: 'User-provided path is read without boundary checks.',
        root_cause: 'File path constructed using string concatenation without validation.',
        intended_behavior: 'Paths must be checked against safe directory roots.',
        trace: [
          {
            kind: 'entrypoint',
            file: 'src/template.ts',
            line: 10,
            scope: 'query-parser',
            description: 'Template parameter received from query string',
          },
          {
            kind: 'sink',
            file: 'src/template.ts',
            line: 25,
            scope: 'file-read',
            description: 'fs.readFileSync called with untrusted path',
          },
        ],
        evidence: [
          {
            file: 'src/template.ts',
            line: 25,
            description: 'Unsanitized file reading call site',
          },
        ],
        conditions: [
          {
            kind: 'system_configuration',
            description: 'Local file access with relative traversal enabled',
          },
        ],
        execution: {
          attacker_perspective: 'unauthenticated remote client',
          payloads: ['curl "http://localhost:3000/render?tpl=../../etc/passwd"'],
          instructions: ['Send traversal query parameter in HTTP GET request'],
          observed_result: 'Returned system password file contents',
        },
        remediation: {
          strategy: 'Use path.resolve and verify path starts with allowed root directory.',
        },
        severity: {
          overall_severity: 'high',
          likelihood: {
            score: 'high',
            reason: 'Direct HTTP query parameter without authentication.',
          },
          impact: {
            score: 'high',
            reason: 'Arbitrary local file contents read by caller.',
          },
        },
        confidence: {
          score: 'high',
          reason: 'Reproduced via curl command against local service.',
        },
      },
    ];

    const result = validateFindings(validFindings);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);

    // Malformed findings (missing required fields in confirmed verdict)
    const malformedFindings = [
      {
        verdict: 'confirmed',
        fingerprint: 'bad_fp',
        // missing title, trace, execution, etc.
      },
    ];

    const badResult = validateFindings(malformedFindings);
    expect(badResult.valid).toBe(false);
    expect(badResult.errors.length).toBeGreaterThan(0);
  });

  test('validateCoverageLedger validates canonical coverage ledger units', () => {
    const refs = {
      surface: 'http-api',
      boundary: 'auth-gate',
      subsystem: 'api-router',
      attack_class: 'web-auth',
    };
    const coverageId = computeCanonicalCoverageId(refs);
    expect(coverageId).toBe('http-api::auth-gate::api-router::web-auth');

    const validUnits = [
      {
        coverage_id: coverageId,
        canonical_refs: refs,
        surface: 'http-api',
        boundary: 'auth-gate',
        subsystem: 'api-router',
        attack_class: 'web-auth',
        starting_paths: ['src/routes/auth.ts'],
        ordinary_attack_class_block: 'WEB-PROTOCOL-AND-AUTH.md#Core discipline',
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
      },
    ];

    const result = validateCoverageLedger(validUnits);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('runSecurityAudit executes complete 6-phase audit and writes all artifacts', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-audit-test-'));

    // Create a target codebase fixture with an exposed .env file
    const targetCodeDir = path.join(tmpDir, 'target-project');
    fs.mkdirSync(path.join(targetCodeDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(targetCodeDir, 'src', 'index.ts'), 'console.log("Hello App");', 'utf-8');
    fs.writeFileSync(path.join(targetCodeDir, '.env'), 'DATABASE_URL="postgres://admin:secret@localhost:5432/db"', 'utf-8');

    const outputDir = path.join(tmpDir, 'audit-output');

    const auditResult = await runSecurityAudit({
      target: targetCodeDir,
      profile: 'full',
      outputDir,
      writeArtifacts: true,
    });

    expect(auditResult.target).toBe(targetCodeDir);
    expect(auditResult.outputDir).toBe(outputDir);
    expect(auditResult.architectureMd).toContain('Architecture & Threat Boundary Model');
    expect(auditResult.coverageLedger.units.length).toBeGreaterThan(0);
    expect(auditResult.reportMd).toContain('Cloudflare Security Audit Report');
    expect(auditResult.findingsDetailMd).toContain('Detailed Findings');
    expect(auditResult.needsValidationMd).toContain('Needs Validation Items');

    // Verify files were physically written
    expect(fs.existsSync(path.join(outputDir, 'architecture.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'coverage-ledger.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'findings.json'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'REPORT.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'FINDINGS-DETAIL.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'NEEDS-VALIDATION.md'))).toBe(true);

    // Verify findings identified the exposed .env file
    const confirmedFindings = auditResult.findings.filter((f) => f.verdict === 'confirmed');
    expect(confirmedFindings.length).toBe(1);
    expect(confirmedFindings[0].title).toContain('Sensitive Secret File Detected');
    expect(confirmedFindings[0].fingerprint).toBeDefined();

    // Verify file validators against the written artifacts
    const findingsFileResult = validateFindingsFile(path.join(outputDir, 'findings.json'));
    expect(findingsFileResult.valid).toBe(true);

    const ledgerFileResult = validateCoverageLedgerFile(path.join(outputDir, 'coverage-ledger.json'));
    expect(ledgerFileResult.valid).toBe(true);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('CLI subcommand get-fable redteam audit runs and supports validate', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-cli-audit-test-'));
    const outputDir = path.join(tmpDir, 'run-cli');

    // Run audit via CLI
    const code = await handleRedTeamCli([
      'audit',
      '--target',
      tmpDir,
      '--output',
      outputDir,
      '--format',
      'json',
    ]);
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(outputDir, 'findings.json'))).toBe(true);

    // Validate generated findings file via CLI
    const validateCode = await handleRedTeamCli([
      'audit',
      'validate',
      path.join(outputDir, 'findings.json'),
    ]);
    expect(validateCode).toBe(0);

    // Validate generated coverage ledger via CLI
    const validateLedgerCode = await handleRedTeamCli([
      'audit',
      'validate',
      path.join(outputDir, 'coverage-ledger.json'),
    ]);
    expect(validateLedgerCode).toBe(0);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
