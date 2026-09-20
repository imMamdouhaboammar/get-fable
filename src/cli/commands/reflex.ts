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

export async function runReflexCommand(args: string[]): Promise<number> {
  const sub = args[0] || 'status';
  const subArgs = args.slice(1);

  switch (sub) {
    case 'status':
      return handleReflexStatus(subArgs);
    case 'doctor':
      return handleReflexDoctor(subArgs);
    case 'route':
      return handleReflexRoute(subArgs);
    case 'ledger':
      return handleReflexLedger(subArgs);
    case 'eval':
      return handleReflexEval(subArgs);
    case 'compact':
      return handleReflexCompact(subArgs);
    default:
      console.error(`Unknown reflex subcommand: ${sub}. Available: status, doctor, route, ledger, eval, compact`);
      return 1;
  }
}

function handleReflexStatus(args: string[]): number {
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
    console.log(JSON.stringify(status, null, 2));
    return 0;
  }

  console.log('\n--- Fable-Jev Reflex Subsystem Status ---');
  console.log(`Mode:            ${config.mode}`);
  console.log(`Provider:        ${config.provider}`);
  console.log(`Model:           ${config.model}`);
  console.log(`Timeout:         ${config.timeoutMs}ms`);
  console.log(`Min Margin:      ${config.minMargin}`);
  console.log(`Telemetry:       ${config.telemetry}`);
  console.log(`API Key:         ${config.apiKey ? 'Configured (present)' : 'Missing'}`);
  console.log(`Circuit Breaker: ${cbState.isOpen ? 'OPEN (Tripped)' : 'CLOSED (Healthy)'}`);
  console.log(`Ledger Events:   ${events.length} recorded\n`);

  return 0;
}

async function handleReflexDoctor(args: string[]): Promise<number> {
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
        const testEnvelope: any = {
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
    console.log(JSON.stringify({ ok, checks }, null, 2));
    return ok ? 0 : 1;
  }

  console.log('\n--- Fable-Jev Reflex Doctor ---');
  for (const c of checks) {
    const symbol = c.status === 'PASS' ? '✔' : c.status === 'WARN' ? '⚠' : '✖';
    console.log(`${symbol} [${c.id}] ${c.message}`);
  }
  console.log('');

  return ok ? 0 : 1;
}

async function handleReflexRoute(args: string[]): Promise<number> {
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const apply = args.includes('--apply');
  const isLive = args.includes('--live');

  const task = args
    .filter((a) => a !== '--json' && a !== '--json-v1' && a !== '--apply' && a !== '--live')
    .join(' ')
    .trim();

  if (!task) {
    console.error('Error: reflex route requires task text');
    return 1;
  }

  const config = loadReflexConfig(isLive ? { mode: 'guarded', timeoutMs: 8000 } : undefined);
  const currentState = readFableState(process.cwd());

  if (apply && !currentState) {
    console.error('Error: reflex route --apply requires an initialized project (.fable/state.json)');
    return 1;
  }

  const resolution = await resolveRoute(task, currentState, { config });

  if (apply) {
    withFableStateTransaction(process.cwd(), (state) => {
      return applyRoutingDecision(state, resolution.decision);
    });
  }

  if (isJson) {
    console.log(JSON.stringify(resolution, null, 2));
    return 0;
  }

  console.log(`\n--- Fable-Jev Reflex Routing: "${task}" ---`);
  console.log(`Mode:            ${resolution.mode}`);
  console.log(`Selected Skill:  ${resolution.decision.selectedSkill}`);
  console.log(`Pack:            ${resolution.decision.selectedPack}`);
  console.log(`Task Shape:      ${resolution.decision.taskShape}`);
  console.log(`Confidence:      ${Math.round(resolution.decision.confidence * 100)}%`);

  if (resolution.advice) {
    console.log(`Reflex Advice:   ${resolution.advice.selectedSkill} (${resolution.advice.provider}, ${resolution.advice.model})`);
    if (resolution.advice.latencyMs) {
      console.log(`Latency:         ${resolution.advice.latencyMs}ms`);
    }
  }

  if (resolution.fallbackReason) {
    console.log(`Fallback Reason: ${resolution.fallbackReason}`);
  }

  console.log('Reasons:');
  for (const r of resolution.decision.reasons) {
    console.log(`  - ${r}`);
  }

  if (apply) {
    console.log('✔ Applied decision to .fable/state.json');
  }
  console.log('');

  return 0;
}

function handleReflexLedger(args: string[]): number {
  const isJson = args.includes('--json') || args.includes('--json-v1');
  const limitArgIndex = args.indexOf('--limit');
  const limit = limitArgIndex !== -1 && args[limitArgIndex + 1] ? parseInt(args[limitArgIndex + 1], 10) : 20;

  const events = readReflexEvents({ limit });

  if (isJson) {
    console.log(JSON.stringify(events, null, 2));
    return 0;
  }

  console.log(`\n--- Reflex Ledger Events (Last ${events.length}) ---`);
  if (events.length === 0) {
    console.log('No reflex events recorded yet.');
    return 0;
  }

  for (const e of events) {
    console.log(
      `[${e.timestamp}] [${e.mode}] det: ${e.deterministicSkill} -> fused: ${e.fusedSkill} (model: ${e.model}, latency: ${e.latencyMs}ms)`
    );
  }
  console.log('');

  return 0;
}

async function handleReflexEval(args: string[]): Promise<number> {
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

  console.log(`Running reflex evaluation (${isLive ? 'LIVE Jev arm' : 'OFFLINE simulated arm'})...`);
  const report = await runReflexEvaluation(undefined, { config, advisor });

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }

  console.log('\n--- Fable-Jev Reflex Routing Benchmark Report ---');
  console.log(`Timestamp:            ${report.timestamp}`);
  console.log(`Total Cases:          ${report.totalCases}`);
  console.log(`Deterministic Top-1:  ${report.deterministic.top1Count}/${report.totalCases} (${(report.deterministic.top1Accuracy * 100).toFixed(1)}%)`);
  console.log(`Hybrid Guarded Top-1: ${report.hybridGuarded.top1Count}/${report.totalCases} (${(report.hybridGuarded.top1Accuracy * 100).toFixed(1)}%)`);
  console.log(`Brier Score:          ${report.hybridGuarded.brierScore.toFixed(3)} (lower is better calibrated)`);
  console.log(`Avg Latency:          ${report.hybridGuarded.avgLatencyMs}ms`);
  console.log(`Overrides Count:      ${report.overridesCount}`);
  console.log(`Overrides Won:        ${report.overridesWon}`);
  console.log(`Overrides Harm:       ${report.overridesHarm}`);
  console.log(`Override Precision:   ${(report.overridePrecision * 100).toFixed(1)}%\n`);

  return 0;
}

async function handleReflexCompact(args: string[]): Promise<number> {
  const filePath = args.find((a) => !a.startsWith('--'));
  if (!filePath) {
    console.error('Error: reflex compact requires a path to a transcript JSON or JSONL file.');
    console.log('Usage: get-fable reflex compact <transcript-path> [--out <output-path>] [--threshold 0.5] [--preserve-recent 6]');
    return 1;
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
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
    console.error(`Error reading transcript: ${err.message}`);
    return 1;
  }

  const outIdx = args.indexOf('--out');
  const outPath = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : null;

  const thresholdIdx = args.indexOf('--threshold');
  const keepThreshold = thresholdIdx !== -1 && args[thresholdIdx + 1] ? parseFloat(args[thresholdIdx + 1]) : 0.5;

  const preserveIdx = args.indexOf('--preserve-recent');
  const preserveRecent = preserveIdx !== -1 && args[preserveIdx + 1] ? parseInt(args[preserveIdx + 1], 10) : 6;

  console.log(`Compacting transcript (${messages.length} messages) using Jev System One...`);
  try {
    const result = await compactMessages(messages, {
      keepThreshold,
      preserveRecentMessages: preserveRecent,
    });

    const ratio = (reductionRatio(result) * 100).toFixed(1);
    console.log('\n--- Jev Context Compaction Summary ---');
    console.log(`Messages:      ${result.stats.messagesBefore} -> ${result.stats.messagesAfter}`);
    console.log(`Characters:    ${result.stats.charsBefore} -> ${result.stats.charsAfter} (-${ratio}%)`);
    console.log(`Tool Calls:    ${result.stats.calls} examined`);
    console.log(`Kept Verbatim: ${result.stats.kept}`);
    console.log(`Truncated/Out: ${result.stats.resultsDropped}`);
    console.log(`Dropped Calls: ${result.stats.callsDropped}`);
    console.log(`Duration:      ${result.stats.ms}ms\n`);

    if (outPath) {
      fs.writeFileSync(outPath, JSON.stringify(result.messages, null, 2), 'utf8');
      console.log(`Compacted transcript written to ${outPath}`);
    }

    return 0;
  } catch (err: any) {
    console.error(`Compaction failed: ${err.message}`);
    return 1;
  }
}
