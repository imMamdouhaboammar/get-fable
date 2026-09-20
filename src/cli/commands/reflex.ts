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

const print = (msg: string = ''): void => {
  process.stdout.write(msg + '\n');
};

const printErr = (msg: string = ''): void => {
  process.stderr.write(msg + '\n');
};

export const handleReflexStatus = (args: string[]): number => {
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
    print(JSON.stringify(status, null, 2));
    return 0;
  }

  print('\n--- Fable-Jev Reflex Subsystem Status ---');
  print(`Mode:            ${config.mode}`);
  print(`Provider:        ${config.provider}`);
  print(`Model:           ${config.model}`);
  print(`Timeout:         ${config.timeoutMs}ms`);
  print(`Min Margin:      ${config.minMargin}`);
  print(`Telemetry:       ${config.telemetry}`);
  print(`API Key:         ${config.apiKey ? 'Configured (present)' : 'Missing'}`);
  print(`Circuit Breaker: ${cbState.isOpen ? 'OPEN (Tripped)' : 'CLOSED (Healthy)'}`);
  print(`Ledger Events:   ${events.length} recorded\n`);

  return 0;
};

type DoctorCheck = { id: string; status: 'PASS' | 'WARN' | 'ERROR'; message: string };

const checkProvider = (config: ReturnType<typeof loadReflexConfig>): DoctorCheck => {
  if (config.provider === 'typesafe-jev') {
    return { id: 'reflex-provider', status: 'PASS', message: 'Provider configured: typesafe-jev' };
  }
  return { id: 'reflex-provider', status: 'WARN', message: `Unknown provider: ${config.provider}` };
};

const checkCredential = (config: ReturnType<typeof loadReflexConfig>): DoctorCheck => {
  if (config.apiKey) {
    return { id: 'reflex-credential', status: 'PASS', message: 'TypeSafe API credential is present in environment' };
  }
  const status = config.mode === 'off' ? 'WARN' : 'ERROR';
  return { id: 'reflex-credential', status, message: 'TYPESAFE_API_KEY is not set' };
};

const checkModel = (config: ReturnType<typeof loadReflexConfig>): DoctorCheck => {
  if (config.model) {
    return { id: 'reflex-model', status: 'PASS', message: `Model configured: ${config.model}` };
  }
  return { id: 'reflex-model', status: 'ERROR', message: 'Model is not configured' };
};

const checkLedger = (): DoctorCheck => {
  try {
    const reflexDir = getReflexDir();
    if (!fs.existsSync(reflexDir)) {
      fs.mkdirSync(reflexDir, { recursive: true });
    }
    return { id: 'reflex-ledger', status: 'PASS', message: 'Reflex ledger directory is accessible and safe' };
  } catch (err: any) {
    return { id: 'reflex-ledger', status: 'ERROR', message: `Ledger error: ${err.message}` };
  }
};

const checkLiveProbe = async (config: ReturnType<typeof loadReflexConfig>): Promise<DoctorCheck> => {
  if (!config.apiKey) {
    return { id: 'reflex-live-probe', status: 'ERROR', message: 'Cannot perform live probe without TYPESAFE_API_KEY' };
  }
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
    return {
      id: 'reflex-live-probe',
      status: 'PASS',
      message: `Live probe succeeded against ${advice.model} in ${advice.latencyMs}ms`,
    };
  } catch (err: any) {
    return { id: 'reflex-live-probe', status: 'ERROR', message: `Live probe failed: ${err.message}` };
  }
};

export const handleReflexDoctor = async (args: string[]): Promise<number> => {
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const isLive = args.includes('--live');
  const config = loadReflexConfig();

  const checks: DoctorCheck[] = [
    checkProvider(config),
    checkCredential(config),
    checkModel(config),
    checkLedger(),
  ];

  if (isLive) {
    checks.push(await checkLiveProbe(config));
  }

  const ok = !checks.some((c) => c.status === 'ERROR');

  if (isJson) {
    print(JSON.stringify({ ok, checks }, null, 2));
    return ok ? 0 : 1;
  }

  print('\n--- Fable-Jev Reflex Doctor ---');
  for (const c of checks) {
    const symbol = c.status === 'PASS' ? '✔' : c.status === 'WARN' ? '⚠' : '✖';
    print(`${symbol} [${c.id}] ${c.message}`);
  }
  print('');

  return ok ? 0 : 1;
};

export const handleReflexRoute = async (args: string[]): Promise<number> => {
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const apply = args.includes('--apply');
  const isLive = args.includes('--live');

  const task = args
    .filter((a) => a !== '--json' && a !== '--json-v1' && a !== '--apply' && a !== '--live')
    .join(' ')
    .trim();

  if (!task) {
    printErr('Error: reflex route requires task text');
    return 1;
  }

  const config = loadReflexConfig(isLive ? { mode: 'guarded', timeoutMs: 8000 } : undefined);
  const currentState = readFableState(process.cwd());

  if (apply && !currentState) {
    printErr('Error: reflex route --apply requires an initialized project (.fable/state.json)');
    return 1;
  }

  const resolution = await resolveRoute(task, currentState, { config });

  if (apply) {
    withFableStateTransaction(process.cwd(), (state) => {
      return applyRoutingDecision(state, resolution.decision);
    });
  }

  if (isJson) {
    print(JSON.stringify(resolution, null, 2));
    return 0;
  }

  print(`\n--- Fable-Jev Reflex Routing: "${task}" ---`);
  print(`Mode:            ${resolution.mode}`);
  print(`Selected Skill:  ${resolution.decision.selectedSkill}`);
  print(`Pack:            ${resolution.decision.selectedPack}`);
  print(`Task Shape:      ${resolution.decision.taskShape}`);
  print(`Confidence:      ${Math.round(resolution.decision.confidence * 100)}%`);

  if (resolution.advice) {
    print(`Reflex Advice:   ${resolution.advice.selectedSkill} (${resolution.advice.provider}, ${resolution.advice.model})`);
    if (resolution.advice.latencyMs) {
      print(`Latency:         ${resolution.advice.latencyMs}ms`);
    }
  }

  if (resolution.fallbackReason) {
    print(`Fallback Reason: ${resolution.fallbackReason}`);
  }

  print('Reasons:');
  for (const r of resolution.decision.reasons) {
    print(`  - ${r}`);
  }

  if (apply) {
    print('✔ Applied decision to .fable/state.json');
  }
  print('');

  return 0;
};

export const handleReflexLedger = (args: string[]): number => {
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const limitArgIndex = args.indexOf('--limit');
  const limit = limitArgIndex !== -1 && args[limitArgIndex + 1] ? parseInt(args[limitArgIndex + 1], 10) : 20;

  const events = readReflexEvents({ limit });

  if (isJson) {
    print(JSON.stringify(events, null, 2));
    return 0;
  }

  print(`\n--- Reflex Ledger Events (Last ${events.length}) ---`);
  if (events.length === 0) {
    print('No reflex events recorded yet.');
    return 0;
  }

  for (const e of events) {
    print(
      `[${e.timestamp}] [${e.mode}] det: ${e.deterministicSkill} -> fused: ${e.fusedSkill} (model: ${e.model}, latency: ${e.latencyMs}ms)`
    );
  }
  print('');

  return 0;
};

export const handleReflexEval = async (args: string[]): Promise<number> => {
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

  print(`Running reflex evaluation (${isLive ? 'LIVE Jev arm' : 'OFFLINE simulated arm'})...`);
  const report = await runReflexEvaluation(undefined, { config, advisor });

  if (isJson) {
    print(JSON.stringify(report, null, 2));
    return 0;
  }

  print('\n--- Fable-Jev Reflex Routing Benchmark Report ---');
  print(`Timestamp:            ${report.timestamp}`);
  print(`Total Cases:          ${report.totalCases}`);
  print(`Deterministic Top-1:  ${report.deterministic.top1Count}/${report.totalCases} (${(report.deterministic.top1Accuracy * 100).toFixed(1)}%)`);
  print(`Hybrid Guarded Top-1: ${report.hybridGuarded.top1Count}/${report.totalCases} (${(report.hybridGuarded.top1Accuracy * 100).toFixed(1)}%)`);
  print(`Brier Score:          ${report.hybridGuarded.brierScore.toFixed(3)} (lower is better calibrated)`);
  print(`Avg Latency:          ${report.hybridGuarded.avgLatencyMs}ms`);
  print(`Overrides Count:      ${report.overridesCount}`);
  print(`Overrides Won:        ${report.overridesWon}`);
  print(`Overrides Harm:       ${report.overridesHarm}`);
  print(`Override Precision:   ${(report.overridePrecision * 100).toFixed(1)}%\n`);

  return 0;
};

export const handleReflexCompact = async (args: string[]): Promise<number> => {
  const filePath = args.find((a) => !a.startsWith('--'));
  if (!filePath) {
    printErr('Error: reflex compact requires a path to a transcript JSON or JSONL file.');
    print('Usage: get-fable reflex compact <transcript-path> [--out <output-path>] [--threshold 0.5] [--preserve-recent 6]');
    return 1;
  }

  if (!fs.existsSync(filePath)) {
    printErr(`Error: File not found: ${filePath}`);
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
    printErr(`Error reading transcript: ${err.message}`);
    return 1;
  }

  const outIdx = args.indexOf('--out');
  const outPath = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : null;

  const thresholdIdx = args.indexOf('--threshold');
  const keepThreshold = thresholdIdx !== -1 && args[thresholdIdx + 1] ? parseFloat(args[thresholdIdx + 1]) : 0.5;

  const preserveIdx = args.indexOf('--preserve-recent');
  const preserveRecent = preserveIdx !== -1 && args[preserveIdx + 1] ? parseInt(args[preserveIdx + 1], 10) : 6;

  print(`Compacting transcript (${messages.length} messages) using Jev System One...`);
  try {
    const result = await compactMessages(messages, {
      keepThreshold,
      preserveRecentMessages: preserveRecent,
    });

    const ratio = (reductionRatio(result) * 100).toFixed(1);
    print('\n--- Jev Context Compaction Summary ---');
    print(`Messages:      ${result.stats.messagesBefore} -> ${result.stats.messagesAfter}`);
    print(`Characters:    ${result.stats.charsBefore} -> ${result.stats.charsAfter} (-${ratio}%)`);
    print(`Tool Calls:    ${result.stats.calls} examined`);
    print(`Kept Verbatim: ${result.stats.kept}`);
    print(`Truncated/Out: ${result.stats.resultsDropped}`);
    print(`Dropped Calls: ${result.stats.callsDropped}`);
    print(`Duration:      ${result.stats.ms}ms\n`);

    if (outPath) {
      fs.writeFileSync(outPath, JSON.stringify(result.messages, null, 2), 'utf8');
      print(`Compacted transcript written to ${outPath}`);
    }

    return 0;
  } catch (err: any) {
    printErr(`Compaction failed: ${err.message}`);
    return 1;
  }
};

export const runDashboardServer = async (args: string[]): Promise<number> => {
  const portIdx = args.indexOf('--port');
  const port = portIdx !== -1 && args[portIdx + 1] ? parseInt(args[portIdx + 1], 10) : 4317;
  print(`Starting Jev Review Dashboard on port ${port}...`);
  await startDashboard(port);
  return 0;
};

export const printReviewReport = (report: ReviewReport): boolean => {
  print('\n--- Jev Review Summary ---');
  print(`Mode:            ${report.mode}`);
  print(`Scope:           ${report.scope}`);
  print(`Screened Files:  ${report.screenedFiles}`);
  print(`Signals:         ${report.followedSignals}`);
  print(`Findings:        ${report.findings.length}`);

  let hasBlocking = false;
  if (report.findings.length > 0) {
    print('\nFindings:');
    for (const finding of report.findings) {
      const blocking = finding.action === 'request_changes' || finding.severity >= 2.0;
      if (blocking) hasBlocking = true;
      print(
        `  [${finding.action.toUpperCase()}] ${finding.file}:${finding.line} (${finding.dimension} - ${finding.mechanism}) Sev: ${finding.severity.toFixed(1)}`
      );
    }
  } else {
    print('Zero high-risk findings detected. Code changes look clean.');
  }

  return hasBlocking;
};

const isSafeRegularFile = (resolved: string, cwd: string): boolean => {
  if (!resolved.startsWith(cwd)) return false;
  if (!fs.existsSync(resolved)) return false;
  return fs.statSync(resolved).isFile();
};

export const readInputText = (target: string | undefined): string | null => {
  if (!target) return null;
  if (target.includes('\n') || target.length > 256) {
    return target;
  }
  try {
    const cwd = process.cwd();
    const resolved = path.resolve(cwd, target);
    if (isSafeRegularFile(resolved, cwd)) {
      return fs.readFileSync(resolved, 'utf8');
    }
  } catch {
    // fallback to literal string
  }
  return target;
};

export const handleReflexReview = async (args: string[]): Promise<number> => {
  if (args.includes('--dashboard')) {
    return await runDashboardServer(args);
  }

  const isCodebase = args.includes('--codebase');
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const shouldSave = args.includes('--save');
  const targetPath = args.filter((a) => !a.startsWith('--'))[0] || process.cwd();

  if (!isJson) {
    print(`Running Jev ${isCodebase ? 'Codebase Scan' : 'Diff Review'} on ${targetPath}...`);
  }
  try {
    const report = isCodebase ? await reviewCodebase(targetPath) : await reviewChanges(targetPath);

    if (shouldSave) {
      await saveReport(report);
      if (!isJson) {
        print(`Saved report to ${reportPath()}`);
      }
    }

    const hasBlocking = report.findings.some(
      (finding) => finding.action === 'request_changes' || finding.severity >= 2.0
    );

    if (isJson) {
      print(JSON.stringify(report, null, 2));
      return hasBlocking ? 1 : 0;
    }

    printReviewReport(report);
    return hasBlocking ? 1 : 0;
  } catch (err: any) {
    printErr(`Review execution failed: ${err.message}`);
    return 1;
  }
};

export const handleReflexRouteModel = async (args: string[]): Promise<number> => {
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const task = args.filter((a) => !a.startsWith('--')).join(' ').trim();
  if (!task) {
    printErr('Error: reflex route-model requires task description');
    return 1;
  }

  try {
    const result = await routeTaskToOptimalModel(task, { models: DEFAULT_AGENT_MODELS });
    if (isJson) {
      print(JSON.stringify(result, null, 2));
      return 0;
    }

    print(`\n--- Jev Model Capability & Cost Routing ---`);
    print(`Task:          "${task}"`);
    print(`Optimal Model: ${result.model} (Tier: ${result.tier})`);
    print(`Probabilities:`);
    for (const [model, prob] of Object.entries(result.probabilities)) {
      print(`  - ${model.padEnd(12)}: ${(prob * 100).toFixed(1)}%`);
    }
    return 0;
  } catch (err: any) {
    printErr(`Model routing failed: ${err.message}`);
    return 1;
  }
};

export const handleReflexTriageLog = async (args: string[]): Promise<number> => {
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const target = args.filter((a) => !a.startsWith('--'))[0];
  const logContent = readInputText(target);
  if (!logContent) {
    printErr('Error: triage-log requires a log file path or log text');
    return 1;
  }

  try {
    const bridge = new RecipesBridge();
    const diagnosis = await bridge.triageErrorLog(logContent);
    if (isJson) {
      print(JSON.stringify(diagnosis, null, 2));
      return 0;
    }

    print(`\n--- Jev Error Log Triage (fable-recover) ---`);
    print(`Diagnosis Level: Level ${diagnosis.levelNumber} (${diagnosis.level})`);
    print(`Confidence:      ${(diagnosis.confidence * 100).toFixed(1)}%`);
    print(`Severity:        ${diagnosis.severity.toFixed(1)}`);
    print(`Actionable:      ${diagnosis.actionable ? 'YES (requires fix)' : 'NO (transient)'}`);
    print(`Summary:         ${diagnosis.summary}`);
    return 0;
  } catch (err: any) {
    printErr(`Log triage failed: ${err.message}`);
    return 1;
  }
};

export const handleReflexSecurityScan = async (args: string[]): Promise<number> => {
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const target = args.filter((a) => !a.startsWith('--'))[0];
  const content = readInputText(target);
  if (!content) {
    printErr('Error: security-scan requires a file path or text content');
    return 1;
  }

  try {
    const bridge = new RecipesBridge();
    const scan = await bridge.scanForSecretsAndSecurity(content);
    if (isJson) {
      print(JSON.stringify(scan, null, 2));
      return 0;
    }

    print(`\n--- Jev Security & PII Scan (fable-security) ---`);
    print(`Safe:              ${scan.isSafe ? 'PASS' : 'FAIL (Security Alert)'}`);
    print(`Exposed Secrets:   ${scan.hasSecrets ? 'DETECTED' : 'None'} (${(scan.secretsConfidence * 100).toFixed(1)}%)`);
    print(`PII Leaks:         ${scan.hasPii ? 'DETECTED' : 'None'} (${(scan.piiConfidence * 100).toFixed(1)}%)`);
    print(`Prompt Injection:  ${scan.isPromptInjection ? 'DETECTED' : 'None'} (${(scan.injectionConfidence * 100).toFixed(1)}%)`);
    return scan.isSafe ? 0 : 1;
  } catch (err: any) {
    printErr(`Security scan failed: ${err.message}`);
    return 1;
  }
};

type ReflexHandler = (args: string[]) => Promise<number> | number;

const SUBCOMMAND_HANDLERS: Record<string, ReflexHandler> = {
  status: (args) => handleReflexStatus(args),
  doctor: (args) => handleReflexDoctor(args),
  route: (args) => handleReflexRoute(args),
  ledger: (args) => handleReflexLedger(args),
  eval: (args) => handleReflexEval(args),
  compact: (args) => handleReflexCompact(args),
  review: (args) => handleReflexReview(args),
  'route-model': (args) => handleReflexRouteModel(args),
  'model-route': (args) => handleReflexRouteModel(args),
  'triage-log': (args) => handleReflexTriageLog(args),
  triage: (args) => handleReflexTriageLog(args),
  'security-scan': (args) => handleReflexSecurityScan(args),
  'sec-scan': (args) => handleReflexSecurityScan(args),
};

export const runReflexCommand = async (args: string[]): Promise<number> => {
  const sub = args[0] || 'status';
  const handler = SUBCOMMAND_HANDLERS[sub];
  if (!handler) {
    printErr(
      `Unknown reflex subcommand: ${sub}. Available: status, doctor, route, ledger, eval, compact, review, route-model, triage-log, security-scan`
    );
    return 1;
  }
  return await handler(args.slice(1));
};
