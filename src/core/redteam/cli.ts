import { getAdapterStatusMatrix } from './adapters/index.js';
import { runRedTeamScan } from './engine.js';
import { listPlaybooks } from './playbooks/index.js';
import { createRemediationCards, writeRemediationToLedger } from './remediation.js';
import { generateMarkdownReport } from './reporter.js';
import { generateSarifReport } from './sarif.js';
import { runDiagnostics, runRedTeamSetup } from './setup.js';
import type { RedTeamProfile, ScanOptions, VerificationOptions } from './types.js';
import { runRedTeamVerify } from './verify.js';

export function printRedTeamHelp(): void {
  console.log(`get-fable redteam (or pentest) - Unified Master Offensive Security Orchestrator

Usage:
  get-fable redteam <subcommand> [options]
  get-fable redteam --target <url> [options]

Subcommands:
  scan               Execute security scan across target (default subcommand)
  verify             Replay attack vectors to verify that previous vulnerabilities are closed
  fix                Convert identified vulnerabilities into .fable/LEDGER.md remediation work cards
  status             Show readiness matrix of all 6 integrated security tools + native probe
  setup              Diagnose environment, verify runtime (Colima forbidden), and provision sandbox/MCP
  playbooks          List available tactical reasoning playbooks (OWASP, Injection, LLM, Auth)

Scan Options:
  --target <url>          Target HTTP/HTTPS URL to test (Required for scan)
  --profile <name>        Scan profile: passive (default), api-logic, comprehensive, orchestrated, playbook
  --playbook <id>         Run a specific tactical playbook (api-logic, injection, llm-security, auth-session)
  --token <token>         Bearer/Auth token for primary authenticated user identity
  --second-token <token>  Secondary Bearer token for cross-tenant multi-identity BOLA/IDOR testing
  --format <format>       Output format: text (default), json, sarif
  --sarif                 Shorthand for --format sarif (OASIS SARIF v2.1.0 for GitHub/GitLab Security)
  --output <file>         Save scan report to a specific file path
  --crawl / --no-crawl    Toggle automatic surface crawling and route discovery (default: enabled)
  --rate-limit <rps>      Requests-per-second limit enforced by ExecutionEnvelope (default: 10)
  --concurrency <num>     Maximum concurrent HTTP requests (default: 4)
  --fail-on <severity>    Exit with non-zero if findings match severity: critical (default), high, medium
  --generate-tests        Auto-generate executable Bun regression test suite in test/security/
  --orchestrate           Enable all available external adapters (HexStrike, Akto, CyberStrike)
  --adapters <list>       Comma-separated list of adapters to run (e.g. native,akto,cyberstrike)
  --scope <path>          Path to custom scope JSON configuration (defaults to .fable/redteam.json)
  --baseline <path>       Compare scan against approved baseline JSON; fail only on regressions
  --fail-on-cvss <score>  Exit with non-zero if any finding has CVSS score >= threshold (e.g. 7.0)
  --allow-cidrs <list>    Comma-separated list of permitted CIDR blocks (e.g. 10.0.0.0/8,192.168.1.0/24)
  --suppress <list>       Comma-separated list of finding fingerprints to suppress from failing builds
  --safe-mode             Enforce non-destructive safe boundaries (default: true)
  --unsafe                Disable safe-mode assertions (caution)
  --json                  Shorthand for --format json
  -h, --help              Show this help message

Verify Options:
  --target <url>          Target URL to verify fixes against (optional if loaded from findings)
  --report <path>         Path to previous report or findings JSON
  --second-token <token>  Secondary token for verifying IDOR/BOLA fixes
  --generate-tests        Write updated test/security/redteam-regression.test.ts guard
  --json                  Output verification results as machine-readable JSON

Examples:
  get-fable redteam setup
  get-fable redteam status
  get-fable redteam playbooks
  get-fable redteam --target http://localhost:3000
  get-fable redteam scan --target http://localhost:3000 --token "Bearer A" --second-token "Bearer B"
  get-fable redteam scan --target https://staging.example.com --sarif --output report.sarif
  get-fable redteam fix
  get-fable redteam verify --target http://localhost:3000 --generate-tests
`);
}

export async function handleRedTeamCli(argv: string[]): Promise<number> {
  if (argv.includes('-h') || argv.includes('--help')) {
    printRedTeamHelp();
    return 0;
  }

  const rawJson = argv.includes('--json');
  const rawSarif = argv.includes('--sarif');
  const formatArgIdx = argv.indexOf('--format');
  let outputFormat: 'text' | 'json' | 'sarif' = rawSarif ? 'sarif' : rawJson ? 'json' : 'text';
  if (formatArgIdx !== -1 && formatArgIdx + 1 < argv.length) {
    const f = argv[formatArgIdx + 1].toLowerCase();
    if (f === 'json' || f === 'sarif' || f === 'text') {
      outputFormat = f;
    }
  }

  const firstArg = argv[0];
  const isSubcommand = ['setup', 'status', 'scan', 'fix', 'verify', 'playbooks'].includes(firstArg);
  const subcommand = isSubcommand ? firstArg : 'scan';
  const remainingArgs = isSubcommand ? argv.slice(1) : argv;

  // --- Subcommand: playbooks ---
  if (subcommand === 'playbooks') {
    const playbooks = listPlaybooks();
    if (outputFormat === 'json') {
      console.log(JSON.stringify(playbooks, null, 2));
    } else {
      console.log('\n--- Fable RedTeam Tactical Playbooks ---');
      console.log('Available playbooks for targeted cognitive security testing:\n');
      for (const pb of playbooks) {
        console.log(`• ${pb.id} (${pb.name}) [Default Severity: ${pb.defaultSeverity.toUpperCase()}]`);
        console.log(`  CWE: ${pb.cwe}`);
        console.log(`  Description: ${pb.description}`);
        console.log(`  Usage: get-fable redteam scan --target <url> --playbook ${pb.id}`);
        console.log('');
      }
    }
    return 0;
  }

  // --- Subcommand: setup ---
  if (subcommand === 'setup') {
    const force = remainingArgs.includes('--force');
    const generateCompose = !remainingArgs.includes('--no-compose');
    const generateMcp = !remainingArgs.includes('--no-mcp');
    const generateScope = !remainingArgs.includes('--no-scope');

    const result = runRedTeamSetup({ force, generateCompose, generateMcp, generateScope });

    if (outputFormat === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n--- Fable RedTeam Environment Diagnostics ---');
      console.log(`Container Runtime: ${result.diagnostics.containerRuntime}`);
      if (result.diagnostics.pythonRuntime) {
        console.log(`Python/uv Runtime: ${result.diagnostics.pythonRuntime}`);
      }
      console.log(`Detected MCP Hosts: ${result.diagnostics.mcpClients.join(', ') || 'None detected'}`);

      if (result.diagnostics.colimaDetected) {
        console.error(`\n❌ POLICY VIOLATION: ${result.error}`);
        return 1;
      }

      if (result.success) {
        console.log('\n✔ Environment ready for RedTeam orchestration.');
        if (result.generatedFiles.length > 0) {
          console.log('Provisioned files:');
          for (const f of result.generatedFiles) {
            console.log(`  - ${f}`);
          }
        }
      }
    }
    return result.success ? 0 : 1;
  }

  // --- Subcommand: status ---
  if (subcommand === 'status') {
    const diagnostics = runDiagnostics();
    const statusMatrix = await getAdapterStatusMatrix();

    if (outputFormat === 'json') {
      console.log(JSON.stringify({ diagnostics, adapters: statusMatrix }, null, 2));
    } else {
      console.log('\n--- Fable RedTeam Tool Readiness Matrix ---');
      console.log(`Runtime: ${diagnostics.containerRuntime} | Colima: ${diagnostics.colimaDetected ? 'DETECTED (PROHIBITED)' : 'CLEAN'}`);
      console.log('');
      console.log('| Tool Adapter | Status | Latency | Description |');
      console.log('| :--- | :---: | :---: | :--- |');
      for (const s of statusMatrix) {
        const badge = s.available ? 'READY' : 'UNAVAILABLE';
        const lat = s.latencyMs !== undefined ? `${s.latencyMs}ms` : '-';
        console.log(`| ${s.name} | ${badge} | ${lat} | ${s.details || s.runtime} |`);
      }
      console.log('');
    }
    return 0;
  }

  // --- Subcommand: verify ---
  if (subcommand === 'verify') {
    let verifyTarget: string | undefined;
    let reportPath: string | undefined;
    let secondAuthToken: string | undefined;
    let generateTests = remainingArgs.includes('--generate-tests');

    for (let i = 0; i < remainingArgs.length; i++) {
      if (remainingArgs[i] === '--target' && i + 1 < remainingArgs.length) {
        verifyTarget = remainingArgs[++i];
      } else if (remainingArgs[i] === '--report' && i + 1 < remainingArgs.length) {
        reportPath = remainingArgs[++i];
      } else if (remainingArgs[i] === '--second-token' && i + 1 < remainingArgs.length) {
        secondAuthToken = remainingArgs[++i];
      }
    }

    const verifyOpts: VerificationOptions = {
      target: verifyTarget,
      findingsPath: reportPath,
      secondAuthToken,
      generateTests,
    };

    const verifyResult = await runRedTeamVerify(verifyOpts);

    if (outputFormat === 'json') {
      console.log(JSON.stringify(verifyResult, null, 2));
    } else {
      console.log('\n--- Fable RedTeam Closed-Loop Verification ---');
      console.log(`Total Findings Evaluated: ${verifyResult.total}`);
      console.log(`✔ Verified Remediated: ${verifyResult.fixed}`);
      console.log(`❌ Persistent Regressions: ${verifyResult.regressions}`);
      console.log('');

      for (const item of verifyResult.items) {
        const statusBadge = item.newStatus === 'verified-fixed' ? '✔ FIXED' : '❌ REGRESSION';
        console.log(`${statusBadge} [${item.id}] ${item.title}`);
        console.log(`   ${item.message}`);
      }

      if (verifyResult.testFilePath) {
        console.log(`\n✔ Continuous regression test suite written to: ${verifyResult.testFilePath}`);
      }
    }

    return verifyResult.regressions > 0 ? 1 : 0;
  }

  // --- Subcommand: fix ---
  if (subcommand === 'fix') {
    let fixTarget = '';
    let fixProfile: RedTeamProfile = 'comprehensive';
    for (let i = 0; i < remainingArgs.length; i++) {
      if (remainingArgs[i] === '--target' && i + 1 < remainingArgs.length) {
        fixTarget = remainingArgs[++i];
      } else if (remainingArgs[i] === '--profile' && i + 1 < remainingArgs.length) {
        fixProfile = remainingArgs[++i] as RedTeamProfile;
      }
    }

    if (fixTarget) {
      const scanResult = await runRedTeamScan({ target: fixTarget, profile: fixProfile }, true);
      const fixResult = writeRemediationToLedger(scanResult.findings);
      if (outputFormat === 'json') {
        console.log(JSON.stringify(fixResult, null, 2));
      } else {
        console.log(`\n✔ Logged ${fixResult.count} remediation work cards to ${fixResult.ledgerPath}`);
      }
      return 0;
    }

    if (outputFormat === 'json') {
      console.log(JSON.stringify({ message: 'Run with --target <url> to generate and fix findings' }));
    } else {
      console.log(`\nTo generate new remediation work cards directly from target, run:`);
      console.log(`  get-fable redteam fix --target <url>`);
    }
    return 0;
  }

  // --- Subcommand: scan (default) ---
  let target = '';
  let profile: RedTeamProfile = 'passive';
  let scopeFilePath: string | undefined;
  let authToken: string | undefined;
  let secondAuthToken: string | undefined;
  let playbook: string | undefined;
  let outputFile: string | undefined;
  let orchestrate = false;
  let adapters: string[] | undefined;
  let safeMode = true;
  let crawl = true;
  let rateLimit: number | undefined;
  let concurrency: number | undefined;
  let failOn: 'critical' | 'high' | 'medium' = 'critical';
  let generateTests = false;
  let baselinePath: string | undefined;
  let failOnCvss: number | undefined;
  let allowedCidrs: string[] | undefined;
  let suppressedFingerprints: string[] | undefined;

  for (let i = 0; i < remainingArgs.length; i++) {
    const arg = remainingArgs[i];
    if (arg === '--target' && i + 1 < remainingArgs.length) {
      target = remainingArgs[++i];
    } else if (arg === '--profile' && i + 1 < remainingArgs.length) {
      profile = remainingArgs[++i] as RedTeamProfile;
    } else if (arg === '--scope' && i + 1 < remainingArgs.length) {
      scopeFilePath = remainingArgs[++i];
    } else if (arg === '--baseline' && i + 1 < remainingArgs.length) {
      baselinePath = remainingArgs[++i];
    } else if (arg === '--fail-on-cvss' && i + 1 < remainingArgs.length) {
      failOnCvss = parseFloat(remainingArgs[++i]);
    } else if (arg === '--allow-cidrs' && i + 1 < remainingArgs.length) {
      allowedCidrs = remainingArgs[++i].split(',').map((s) => s.trim());
    } else if (arg === '--suppress' && i + 1 < remainingArgs.length) {
      suppressedFingerprints = remainingArgs[++i].split(',').map((s) => s.trim());
    } else if (arg === '--token' && i + 1 < remainingArgs.length) {
      authToken = remainingArgs[++i];
    } else if (arg === '--second-token' && i + 1 < remainingArgs.length) {
      secondAuthToken = remainingArgs[++i];
    } else if (arg === '--playbook' && i + 1 < remainingArgs.length) {
      playbook = remainingArgs[++i];
      profile = 'playbook';
    } else if (arg === '--output' && i + 1 < remainingArgs.length) {
      outputFile = remainingArgs[++i];
    } else if (arg === '--rate-limit' && i + 1 < remainingArgs.length) {
      rateLimit = parseInt(remainingArgs[++i], 10);
    } else if (arg === '--concurrency' && i + 1 < remainingArgs.length) {
      concurrency = parseInt(remainingArgs[++i], 10);
    } else if (arg === '--fail-on' && i + 1 < remainingArgs.length) {
      failOn = remainingArgs[++i] as 'critical' | 'high' | 'medium';
    } else if (arg === '--generate-tests') {
      generateTests = true;
    } else if (arg === '--crawl') {
      crawl = true;
    } else if (arg === '--no-crawl') {
      crawl = false;
    } else if (arg === '--orchestrate') {
      orchestrate = true;
    } else if (arg === '--adapters' && i + 1 < remainingArgs.length) {
      adapters = remainingArgs[++i].split(',').map((s) => s.trim());
    } else if (arg === '--unsafe') {
      safeMode = false;
    }
  }

  if (!target) {
    if (outputFormat === 'json') {
      console.log(JSON.stringify({ error: 'Missing required argument: --target <url>' }));
    } else {
      console.error('Error: Missing required argument: --target <url>');
      console.error('Run "get-fable redteam --help" for usage information.');
    }
    return 1;
  }

  const options: ScanOptions = {
    target,
    profile,
    scopeFilePath,
    authToken,
    secondAuthToken,
    playbook,
    outputFile,
    orchestrate,
    adapters,
    safeMode,
    crawl,
    rateLimit,
    concurrency,
    generateTests,
    outputFormat,
    baselinePath,
    failOnCvss,
    allowedCidrs,
    suppressedFingerprints,
  };

  try {
    const result = await runRedTeamScan(options, true);

    if (outputFormat === 'sarif') {
      const sarifLog = generateSarifReport(result);
      console.log(JSON.stringify(sarifLog, null, 2));
    } else if (outputFormat === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(generateMarkdownReport(result));
      console.log('\n✔ RedTeam audit complete. Report saved to docs/security/REDTEAM_REPORT.md');
      if (result.summary.critical > 0 || result.summary.high > 0) {
        console.log(`ℹ Run "get-fable redteam fix" to add remediation cards into .fable/LEDGER.md`);
      }
    }

    // CI/CD Baseline Regression Gating: Fail build if new security regressions detected
    if (result.baselineDiff && result.baselineDiff.hasRegressions) {
      return 2;
    }

    // CVSS Score Threshold Gating
    if (failOnCvss !== undefined) {
      const cvssBreached = result.findings.some((f) => (f.cvss?.score ?? 0) >= failOnCvss!);
      if (cvssBreached) return 2;
    }

    // Exit code gating based on failOn severity
    if (failOn === 'critical' && result.summary.critical > 0) return 2;
    if (failOn === 'high' && (result.summary.critical > 0 || result.summary.high > 0)) return 2;
    if (failOn === 'medium' && (result.summary.critical > 0 || result.summary.high > 0 || result.summary.medium > 0)) return 2;

    return result.summary.critical > 0 ? 2 : 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (outputFormat === 'json') {
      console.log(JSON.stringify({ error: message }));
    } else {
      console.error(`\n❌ RedTeam Engine Error: ${message}`);
    }
    return 1;
  }
}
