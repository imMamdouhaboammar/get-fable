import fs from 'node:fs';
import path from 'node:path';
import { loadReflexConfig } from '../../core/reflex/config.js';
import { getReflexDir, readReflexEvents } from '../../core/reflex/ledger.js';
import { TypeSafeJevAdvisor } from '../../core/reflex/providers/typesafe-jev.js';
import { globalCircuitBreaker, resolveRoute } from '../../core/reflex/service.js';
import { runReflexEvaluation } from '../../core/reflex/eval/runner.js';
import type { ReflexAdvisor, ReflexAdvice, ReflexStateEnvelopeV1 } from '../../core/reflex/types.js';
import {
  applyRoutingDecision,
  readFableState,
  withFableStateTransaction,
} from '../../core/state.js';

import {
  compactMessages,
  reductionRatio,
  type Message,
} from '../../core/reflex/compaction/index.js';
import {
  reviewChanges,
  reviewCodebase,
  saveReport,
  reportPath,
  startDashboard,
} from '../../core/review/jev/index.js';
import type { ReviewReport } from '../../core/review/jev/domain/types.js';
import {
  routeTaskToOptimalModel,
  DEFAULT_AGENT_MODELS,
} from '../../core/reflex/model-router/index.js';
import { RecipesBridge } from '../../core/reflex/recipes-bridge.js';

export async function runReflexCommand(args: string[]): Promise<number> {  // skipcq: JS-0067
  const sub = args[0] || 'status';
  const subArgs = args.slice(1);

  switch (sub) {
    case 'status':
      return handleReflexStatus(subArgs);
    case 'doctor':
      return await handleReflexDoctor(subArgs);
    case 'route':
      return await handleReflexRoute(subArgs);
    case 'ledger':
      return handleReflexLedger(subArgs);
    case 'eval':
      return await handleReflexEval(subArgs);
    case 'compact':
      return await handleReflexCompact(subArgs);
    case 'review':
      return await handleReflexReview(subArgs);
    case 'route-model':
    case 'model-route':
      return await handleReflexRouteModel(subArgs);
    case 'triage-log':
    case 'triage':
      return await handleReflexTriageLog(subArgs);
    case 'security-scan':
    case 'sec-scan':
      return await handleReflexSecurityScan(subArgs);
    default:
      console.error(  // skipcq: JS-0002
        `Unknown reflex subcommand: ${sub}. Available: status, doctor, route, ledger, eval, compact, review, route-model, triage-log, security-scan`
      );
      return 1;
  }
}

export function handleReflexStatus(args: string[]): number {  // skipcq: JS-0067
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const config = loadReflexConfig();
  const events = readReflexEvents({ limit: 1000 });
  const cbState = globalCircuitBreaker.getState();

  const status = {
    schemaVersion: 1,
    mode: config.mode,
    provider: config.provider,
    model: config.model,
    timeoutMs: config.timeoutMs,
    minMargin: config.minMargin,
    telemetry: config.telemetry,
    hasApiKey: Boolean(config.apiKey),
    circuitBreaker: cbState,
    ledgerEventsCount: events.length,
  };

  if (isJson) {
    console.log(JSON.stringify(status, null, 2));  // skipcq: JS-0002
    return 0;
  }

  console.log('\n--- Fable-Jev Reflex Subsystem Status ---');  // skipcq: JS-0002
  console.log(`Mode:            ${config.mode}`);  // skipcq: JS-0002
  console.log(`Provider:        ${config.provider}`);  // skipcq: JS-0002
  console.log(`Model:           ${config.model}`);  // skipcq: JS-0002
  console.log(`Timeout:         ${config.timeoutMs}ms`);  // skipcq: JS-0002
  console.log(`Min Margin:      ${config.minMargin}`);  // skipcq: JS-0002
  console.log(`Telemetry:       ${config.telemetry}`);  // skipcq: JS-0002
  console.log(`API Key:         ${config.apiKey ? 'Configured (present)' : 'Missing'}`);  // skipcq: JS-0002
  console.log(`Circuit Breaker: ${cbState.isOpen ? 'OPEN (Tripped)' : 'CLOSED (Healthy)'}`);  // skipcq: JS-0002
  console.log(`Ledger Events:   ${events.length} recorded\n`);  // skipcq: JS-0002

  return 0;
}

export async function handleReflexDoctor(args: string[]): Promise<number> {  // skipcq: JS-0067
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const isLive = args.includes('--live');
  const config = loadReflexConfig();

  const checks: Array<{ id: string; status: 'PASS' | 'WARN' | 'ERROR'; message: string }> = [];

  // Check 1: Provider config
  if (config.provider === 'typesafe-jev') {
    checks.push({ id: 'reflex-provider', status: 'PASS', message: 'Provider configured: typesafe-jev' });
  } else {
    checks.push({ id: 'reflex-provider', status: 'WARN', message: `Unknown provider: ${config.provider}` });
  }

  // Check 2: API key presence
  if (config.apiKey) {
    checks.push({ id: 'reflex-credential', status: 'PASS', message: 'TypeSafe API credential is present in environment' });
  } else {
    const status = config.mode === 'off' ? 'WARN' : 'ERROR';
    checks.push({ id: 'reflex-credential', status, message: 'TYPESAFE_API_KEY is not set' });
  }

  // Check 3: Model configuration
  if (config.model) {
    checks.push({ id: 'reflex-model', status: 'PASS', message: `Model configured: ${config.model}` });
  } else {
    checks.push({ id: 'reflex-model', status: 'ERROR', message: 'Model is not configured' });
  }

  // Check 4: Local reflex directory
  try {
    const reflexDir = getReflexDir();
    if (!fs.existsSync(reflexDir)) {
      fs.mkdirSync(reflexDir, { recursive: true });
    }
    checks.push({ id: 'reflex-ledger', status: 'PASS', message: 'Reflex ledger directory is accessible and safe' });
  } catch (err: any) {
    checks.push({ id: 'reflex-ledger', status: 'ERROR', message: `Ledger error: ${err.message}` });
  }

  // Check 5: Live API connectivity probe (only if --live)
  if (isLive) {
    if (!config.apiKey) {
      checks.push({ id: 'reflex-live-probe', status: 'ERROR', message: 'Cannot perform live probe without TYPESAFE_API_KEY' });
    } else {
      try {
        const advisor = new TypeSafeJevAdvisor({ ...config, timeoutMs: 10000 });
        const testEnvelope: ReflexStateEnvelopeV1 = {
          schemaVersion: 1,
          task: 'Diagnostic connectivity check',
          lifecycle: { phase: 'idle', currentSkill: null, failureState: 'none', substantial: false, hasActiveCard: false, verificationFreshness: 'none' },
          deterministic: { selectedSkill: 'fable-verify', selectedPack: 'core', reasons: [], requiresPlan: false, topCandidates: [] },
          constraints: { suppressResearch: false, suppressRelease: false, suppressSecurity: false, suppressTdd: false, suppressPlan: false, suppressReview: false, suppressDelegation: false },
        };
        const advice = await advisor.advise(testEnvelope);
        checks.push({
          id: 'reflex-live-probe',
          status: 'PASS',
          message: `Live probe succeeded against ${advice.model} in ${advice.latencyMs}ms`,
        });
      } catch (err: any) {
        checks.push({ id: 'reflex-live-probe', status: 'ERROR', message: `Live probe failed: ${err.message}` });
      }
    }
  }

  const ok = !checks.some((c) => c.status === 'ERROR');

  if (isJson) {
    console.log(JSON.stringify({ ok, checks }, null, 2));  // skipcq: JS-0002
    return ok ? 0 : 1;
  }

  console.log('\n--- Fable-Jev Reflex Doctor ---');  // skipcq: JS-0002
  for (const c of checks) {
    const symbol = c.status === 'PASS' ? '✔' : c.status === 'WARN' ? '⚠' : '✖';
    console.log(`${symbol} [${c.id}] ${c.message}`);  // skipcq: JS-0002
  }
  console.log('');  // skipcq: JS-0002

  return ok ? 0 : 1;
}

export async function handleReflexRoute(args: string[]): Promise<number> {  // skipcq: JS-0067
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const apply = args.includes('--apply');
  const isLive = args.includes('--live');

  const task = args
    .filter((a) => a !== '--json' && a !== '--json-v1' && a !== '--apply' && a !== '--live')
    .join(' ')
    .trim();

  if (!task) {
    console.error('Error: reflex route requires task text');  // skipcq: JS-0002
    return 1;
  }

  const config = loadReflexConfig(isLive ? { mode: 'guarded', timeoutMs: 8000 } : undefined);
  const currentState = readFableState(process.cwd());

  if (apply && !currentState) {
    console.error('Error: reflex route --apply requires an initialized project (.fable/state.json)');  // skipcq: JS-0002
    return 1;
  }

  const resolution = await resolveRoute(task, currentState, { config });

  if (apply) {
    withFableStateTransaction(process.cwd(), (state) => {
      return applyRoutingDecision(state, resolution.decision);
    });
  }

  if (isJson) {
    console.log(JSON.stringify(resolution, null, 2));  // skipcq: JS-0002
    return 0;
  }

  console.log(`\n--- Fable-Jev Reflex Routing: "${task}" ---`);  // skipcq: JS-0002
  console.log(`Mode:            ${resolution.mode}`);  // skipcq: JS-0002
  console.log(`Selected Skill:  ${resolution.decision.selectedSkill}`);  // skipcq: JS-0002
  console.log(`Pack:            ${resolution.decision.selectedPack}`);  // skipcq: JS-0002
  console.log(`Task Shape:      ${resolution.decision.taskShape}`);  // skipcq: JS-0002
  console.log(`Confidence:      ${Math.round(resolution.decision.confidence * 100)}%`);  // skipcq: JS-0002

  if (resolution.advice) {
    console.log(`Reflex Advice:   ${resolution.advice.selectedSkill} (${resolution.advice.provider}, ${resolution.advice.model})`);  // skipcq: JS-0002
    if (resolution.advice.latencyMs) {
      console.log(`Latency:         ${resolution.advice.latencyMs}ms`);  // skipcq: JS-0002
    }
  }

  if (resolution.fallbackReason) {
    console.log(`Fallback Reason: ${resolution.fallbackReason}`);  // skipcq: JS-0002
  }

  console.log('Reasons:');  // skipcq: JS-0002
  for (const r of resolution.decision.reasons) {
    console.log(`  - ${r}`);  // skipcq: JS-0002
  }

  if (apply) {
    console.log('✔ Applied decision to .fable/state.json');  // skipcq: JS-0002
  }
  console.log('');  // skipcq: JS-0002

  return 0;
}

export function handleReflexLedger(args: string[]): number {  // skipcq: JS-0067
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const limitArgIndex = args.indexOf('--limit');
  const limit = limitArgIndex !== -1 && args[limitArgIndex + 1] ? parseInt(args[limitArgIndex + 1], 10) : 20;

  const events = readReflexEvents({ limit });

  if (isJson) {
    console.log(JSON.stringify(events, null, 2));  // skipcq: JS-0002
    return 0;
  }

  console.log(`\n--- Reflex Ledger Events (Last ${events.length}) ---`);  // skipcq: JS-0002
  if (events.length === 0) {
    console.log('No reflex events recorded yet.');  // skipcq: JS-0002
    return 0;
  }

  for (const e of events) {
    console.log(  // skipcq: JS-0002
      `[${e.timestamp}] [${e.mode}] det: ${e.deterministicSkill} -> fused: ${e.fusedSkill} (model: ${e.model}, latency: ${e.latencyMs}ms)`
    );
  }
  console.log('');  // skipcq: JS-0002

  return 0;
}

export async function handleReflexEval(args: string[]): Promise<number> {  // skipcq: JS-0067
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const isLive = args.includes('--live');
  const config = loadReflexConfig({ mode: 'guarded', timeoutMs: isLive ? 8000 : 1200 });

  let advisor: ReflexAdvisor | undefined = undefined;
  if (!isLive) {
    advisor = {
      id: 'typesafe-jev',
      async advise(envelope: ReflexStateEnvelopeV1): Promise<ReflexAdvice> {
        const skill = envelope.deterministic.selectedSkill;
        return {
          provider: 'typesafe-jev',
          model: 'jev-simulated-offline',
          selectedSkill: skill,
          probabilities: { [skill]: 0.95 },
          confidence: 0.92,
          signals: {},
          latencyMs: 5,
          stage: 1,
        };
      },
    };
  }

  console.log(`Running reflex evaluation (${isLive ? 'LIVE Jev arm' : 'OFFLINE simulated arm'})...`);  // skipcq: JS-0002
  const report = await runReflexEvaluation(undefined, { config, advisor });

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));  // skipcq: JS-0002
    return 0;
  }

  console.log('\n--- Fable-Jev Reflex Routing Benchmark Report ---');  // skipcq: JS-0002
  console.log(`Timestamp:            ${report.timestamp}`);  // skipcq: JS-0002
  console.log(`Total Cases:          ${report.totalCases}`);  // skipcq: JS-0002
  console.log(`Deterministic Top-1:  ${report.deterministic.top1Count}/${report.totalCases} (${(report.deterministic.top1Accuracy * 100).toFixed(1)}%)`);  // skipcq: JS-0002
  console.log(`Hybrid Guarded Top-1: ${report.hybridGuarded.top1Count}/${report.totalCases} (${(report.hybridGuarded.top1Accuracy * 100).toFixed(1)}%)`);  // skipcq: JS-0002
  console.log(`Brier Score:          ${report.hybridGuarded.brierScore.toFixed(3)} (lower is better calibrated)`);  // skipcq: JS-0002
  console.log(`Avg Latency:          ${report.hybridGuarded.avgLatencyMs}ms`);  // skipcq: JS-0002
  console.log(`Overrides Count:      ${report.overridesCount}`);  // skipcq: JS-0002
  console.log(`Overrides Won:        ${report.overridesWon}`);  // skipcq: JS-0002
  console.log(`Overrides Harm:       ${report.overridesHarm}`);  // skipcq: JS-0002
  console.log(`Override Precision:   ${(report.overridePrecision * 100).toFixed(1)}%\n`);  // skipcq: JS-0002

  return 0;
}

export async function handleReflexCompact(args: string[]): Promise<number> {  // skipcq: JS-0067
  const filePath = args.find((a) => !a.startsWith('--'));
  if (!filePath) {
    console.error('Error: reflex compact requires a path to a transcript JSON or JSONL file.');  // skipcq: JS-0002
    console.log('Usage: get-fable reflex compact <transcript-path> [--out <output-path>] [--threshold 0.5] [--preserve-recent 6]');  // skipcq: JS-0002
    return 1;
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);  // skipcq: JS-0002
    return 1;
  }

  let messages: Message[] = [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (raw.startsWith('[')) {
      messages = JSON.parse(raw);
    } else {
      messages = raw.split('\n').filter(Boolean).map((line) => JSON.parse(line));
    }
  } catch (err: any) {
    console.error(`Error reading transcript: ${err.message}`);  // skipcq: JS-0002
    return 1;
  }

  const outIdx = args.indexOf('--out');
  const outPath = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : null;

  const thresholdIdx = args.indexOf('--threshold');
  const keepThreshold = thresholdIdx !== -1 && args[thresholdIdx + 1] ? parseFloat(args[thresholdIdx + 1]) : 0.5;

  const preserveIdx = args.indexOf('--preserve-recent');
  const preserveRecent = preserveIdx !== -1 && args[preserveIdx + 1] ? parseInt(args[preserveIdx + 1], 10) : 6;

  console.log(`Compacting transcript (${messages.length} messages) using Jev System One...`);  // skipcq: JS-0002
  try {
    const result = await compactMessages(messages, {
      keepThreshold,
      preserveRecentMessages: preserveRecent,
    });

    const ratio = (reductionRatio(result) * 100).toFixed(1);
    console.log('\n--- Jev Context Compaction Summary ---');  // skipcq: JS-0002
    console.log(`Messages:      ${result.stats.messagesBefore} -> ${result.stats.messagesAfter}`);  // skipcq: JS-0002
    console.log(`Characters:    ${result.stats.charsBefore} -> ${result.stats.charsAfter} (-${ratio}%)`);  // skipcq: JS-0002
    console.log(`Tool Calls:    ${result.stats.calls} examined`);  // skipcq: JS-0002
    console.log(`Kept Verbatim: ${result.stats.kept}`);  // skipcq: JS-0002
    console.log(`Truncated/Out: ${result.stats.resultsDropped}`);  // skipcq: JS-0002
    console.log(`Dropped Calls: ${result.stats.callsDropped}`);  // skipcq: JS-0002
    console.log(`Duration:      ${result.stats.ms}ms\n`);  // skipcq: JS-0002

    if (outPath) {
      fs.writeFileSync(outPath, JSON.stringify(result.messages, null, 2), 'utf8');
      console.log(`Compacted transcript written to ${outPath}`);  // skipcq: JS-0002
    }

    return 0;
  } catch (err: any) {
    console.error(`Compaction failed: ${err.message}`);  // skipcq: JS-0002
    return 1;
  }
}

export async function runDashboardServer(args: string[]): Promise<number> {  // skipcq: JS-0067
  const portIdx = args.indexOf('--port');
  const port = portIdx !== -1 && args[portIdx + 1] ? parseInt(args[portIdx + 1], 10) : 4317;
  console.log(`Starting Jev Review Dashboard on port ${port}...`);  // skipcq: JS-0002
  await startDashboard(port);
  return 0;
}

export function printReviewReport(report: ReviewReport): boolean {  // skipcq: JS-0067
  console.log('\n--- Jev Review Summary ---');  // skipcq: JS-0002
  console.log(`Mode:            ${report.mode}`);  // skipcq: JS-0002
  console.log(`Scope:           ${report.scope}`);  // skipcq: JS-0002
  console.log(`Screened Files:  ${report.screenedFiles}`);  // skipcq: JS-0002
  console.log(`Signals:         ${report.followedSignals}`);  // skipcq: JS-0002
  console.log(`Findings:        ${report.findings.length}`);  // skipcq: JS-0002

  let hasBlocking = false;
  if (report.findings.length > 0) {
    console.log('\nFindings:');  // skipcq: JS-0002
    for (const finding of report.findings) {
      const blocking = finding.action === 'request_changes' || finding.severity >= 2.0;
      if (blocking) hasBlocking = true;
      console.log(  // skipcq: JS-0002
        `  [${finding.action.toUpperCase()}] ${finding.file}:${finding.line} (${finding.dimension} - ${finding.mechanism}) Sev: ${finding.severity.toFixed(1)}`
      );
    }
  } else {
    console.log('Zero high-risk findings detected. Code changes look clean.');  // skipcq: JS-0002
  }

  return hasBlocking;
}

export function readInputText(target: string | undefined): string | null {  // skipcq: JS-0067
  if (!target) return null;
  if (target.includes('\n') || target.length > 256) {
    return target;
  }
  try {
    const cwd = process.cwd();
    const resolved = path.resolve(cwd, target);
    if (resolved.startsWith(cwd) && fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      return fs.readFileSync(resolved, 'utf8');
    }
  } catch {
    // fallback to literal string
  }
  return target;
}

export async function handleReflexReview(args: string[]): Promise<number> {  // skipcq: JS-0067
  if (args.includes('--dashboard')) {
    return await runDashboardServer(args);
  }

  const isCodebase = args.includes('--codebase');
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const shouldSave = args.includes('--save');
  const targetPath = args.filter((a) => !a.startsWith('--'))[0] || process.cwd();

  if (!isJson) {
    console.log(`Running Jev ${isCodebase ? 'Codebase Scan' : 'Diff Review'} on ${targetPath}...`);  // skipcq: JS-0002
  }
  try {
    const report = isCodebase ? await reviewCodebase(targetPath) : await reviewChanges(targetPath);

    if (shouldSave) {
      await saveReport(report);
      if (!isJson) {
        console.log(`Saved report to ${reportPath()}`);  // skipcq: JS-0002
      }
    }

    const hasBlocking = report.findings.some(
      (finding) => finding.action === 'request_changes' || finding.severity >= 2.0
    );

    if (isJson) {
      console.log(JSON.stringify(report, null, 2));  // skipcq: JS-0002
      return hasBlocking ? 1 : 0;
    }

    printReviewReport(report);
    return hasBlocking ? 1 : 0;
  } catch (err: any) {
    console.error(`Review execution failed: ${err.message}`);  // skipcq: JS-0002
    return 1;
  }
}

export async function handleReflexRouteModel(args: string[]): Promise<number> {  // skipcq: JS-0067
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const task = args.filter((a) => !a.startsWith('--')).join(' ').trim();
  if (!task) {
    console.error('Error: reflex route-model requires task description');  // skipcq: JS-0002
    return 1;
  }

  try {
    const result = await routeTaskToOptimalModel(task, { models: DEFAULT_AGENT_MODELS });
    if (isJson) {
      console.log(JSON.stringify(result, null, 2));  // skipcq: JS-0002
      return 0;
    }

    console.log(`\n--- Jev Model Capability & Cost Routing ---`);  // skipcq: JS-0002
    console.log(`Task:          "${task}"`);  // skipcq: JS-0002
    console.log(`Optimal Model: ${result.model} (Tier: ${result.tier})`);  // skipcq: JS-0002
    console.log(`Probabilities:`);  // skipcq: JS-0002
    for (const [model, prob] of Object.entries(result.probabilities)) {
      console.log(`  - ${model.padEnd(12)}: ${(prob * 100).toFixed(1)}%`);  // skipcq: JS-0002
    }
    return 0;
  } catch (err: any) {
    console.error(`Model routing failed: ${err.message}`);  // skipcq: JS-0002
    return 1;
  }
}

export async function handleReflexTriageLog(args: string[]): Promise<number> {  // skipcq: JS-0067
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const target = args.filter((a) => !a.startsWith('--'))[0];
  const logContent = readInputText(target);
  if (!logContent) {
    console.error('Error: triage-log requires a log file path or log text');  // skipcq: JS-0002
    return 1;
  }

  try {
    const bridge = new RecipesBridge();
    const diagnosis = await bridge.triageErrorLog(logContent);
    if (isJson) {
      console.log(JSON.stringify(diagnosis, null, 2));  // skipcq: JS-0002
      return 0;
    }

    console.log(`\n--- Jev Error Log Triage (fable-recover) ---`);  // skipcq: JS-0002
    console.log(`Diagnosis Level: Level ${diagnosis.levelNumber} (${diagnosis.level})`);  // skipcq: JS-0002
    console.log(`Confidence:      ${(diagnosis.confidence * 100).toFixed(1)}%`);  // skipcq: JS-0002
    console.log(`Severity:        ${diagnosis.severity.toFixed(1)}`);  // skipcq: JS-0002
    console.log(`Actionable:      ${diagnosis.actionable ? 'YES (requires fix)' : 'NO (transient)'}`);  // skipcq: JS-0002
    console.log(`Summary:         ${diagnosis.summary}`);  // skipcq: JS-0002
    return 0;
  } catch (err: any) {
    console.error(`Log triage failed: ${err.message}`);  // skipcq: JS-0002
    return 1;
  }
}

export async function handleReflexSecurityScan(args: string[]): Promise<number> {  // skipcq: JS-0067
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const target = args.filter((a) => !a.startsWith('--'))[0];
  const content = readInputText(target);
  if (!content) {
    console.error('Error: security-scan requires a file path or text content');  // skipcq: JS-0002
    return 1;
  }

  try {
    const bridge = new RecipesBridge();
    const scan = await bridge.scanForSecretsAndSecurity(content);
    if (isJson) {
      console.log(JSON.stringify(scan, null, 2));  // skipcq: JS-0002
      return 0;
    }

    console.log(`\n--- Jev Security & PII Scan (fable-security) ---`);  // skipcq: JS-0002
    console.log(`Safe:              ${scan.isSafe ? 'PASS' : 'FAIL (Security Alert)'}`);  // skipcq: JS-0002
    console.log(`Exposed Secrets:   ${scan.hasSecrets ? 'DETECTED' : 'None'} (${(scan.secretsConfidence * 100).toFixed(1)}%)`);  // skipcq: JS-0002
    console.log(`PII Leaks:         ${scan.hasPii ? 'DETECTED' : 'None'} (${(scan.piiConfidence * 100).toFixed(1)}%)`);  // skipcq: JS-0002
    console.log(`Prompt Injection:  ${scan.isPromptInjection ? 'DETECTED' : 'None'} (${(scan.injectionConfidence * 100).toFixed(1)}%)`);  // skipcq: JS-0002
    return scan.isSafe ? 0 : 1;
  } catch (err: any) {
    console.error(`Security scan failed: ${err.message}`);  // skipcq: JS-0002
    return 1;
  }
}
