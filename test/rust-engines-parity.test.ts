import { afterEach, describe, expect, test } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { routeTask } from '../src/core/task-router.ts';
import { evaluateArchitecture } from '../src/core/architecture-eval.ts';
import { evaluateFableSpark } from '../src/core/spark.ts';
import { estimateTokens, encodeToon, decodeToon, validateToon } from '../src/core/toon.ts';
import { createInitialState, writeFableState } from '../src/core/state.ts';
import {
  findNativeBinary,
  runNativeArchEval,
  runNativeRouter,
  runNativeSpark,
  runNativeToonEncode,
  runNativeToonEstimate,
  runNativeToonValidate,
} from '../src/eco/native-bridge.ts';

const ROOT = path.resolve(import.meta.dir, '..');
const NATIVE_BIN = findNativeBinary(ROOT);
const hasNativeBin = Boolean(NATIVE_BIN && fs.existsSync(NATIVE_BIN));
const tempDirs: string[] = [];

function createTempProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fable-rust-engines-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, '.fable'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.fable', 'LEDGER.md'),
    '- [x] Verify Rust engines -- evidence: cargo test and bun test pass\n'
  );
  writeFableState(dir, createInitialState('2026-10-10T00:00:00.000Z', dir));
  return dir;
}

afterEach(() => {
  for (const d of tempDirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

describe.skipIf(!hasNativeBin)('Phase 1 Rust Engines Parity & Native Bridge Suite', () => {
  test('Engine 2: Single-Pass RegexSet Router parity across newer and core skills', () => {
    const scenarios = [
      'auto-heal and remediate security vulnerability from redteam report',
      'provision curated capabilities with fable-eco and reproducible locks',
      'apply context thrift to conserve context and token budget',
      'finish your turn without upward delegation or premature stop',
      'write native code matching codebase idiom with no defensive bloat',
      'give an outcome-first direct answer in the first sentence',
      'enforce prove-it three-rung verification before claiming completion',
      'maintain scope discipline with a surgical diff and no drive-bys',
      'generate a domain adapter and sector workflow trap fixture with fable-domain',
      'run fable-judge adversarial verification to detect weakened tests',
      'apply the fable method think act prove loop',
      'convene the council to deliberate before planning',
      'use fable-tend to triage ci and resolve git conflicts',
      'apply fable-wise paperthin and strip slop from artifacts',
    ];

    for (const prompt of scenarios) {
      const tsDecision = routeTask(prompt);
      const nativeDecision = runNativeRouter(ROOT, prompt);

      expect(nativeDecision.selectedSkill).toBe(tsDecision.selectedSkill);
      expect(nativeDecision.selectedPack).toBe(tsDecision.selectedPack);
      expect(nativeDecision.taskShape).toBe(tsDecision.taskShape);
      expect(nativeDecision.confidence).toBe(tsDecision.confidence);
      expect(nativeDecision.requiresPlan).toBe(tsDecision.requiresPlan);
      expect(nativeDecision.requiredGates).toEqual(tsDecision.requiredGates);
    }
  });

  test('Engine 2: 3-Vector Architecture Evaluation parity (Monolith vs Microservices)', () => {
    const specs = [
      'Build a simple internal CRUD admin panel for managing user profiles.',
      'Build a distributed platform with 50k concurrent websocket connections, oauth authentication, stripe billing, kafka event bus, and video transcoding encryption pipeline.',
      'Design an AI inference and LLM routing service with API gateway and analytics telemetry.',
    ];

    for (const spec of specs) {
      const tsEval = evaluateArchitecture(spec);
      const nativeEval = runNativeArchEval(ROOT, spec);

      expect(nativeEval.verdict).toBe(tsEval.verdict);
      expect(nativeEval.allowMonolith).toBe(tsEval.allowMonolith);
      expect(nativeEval.vectors).toEqual(tsEval.vectors);
      expect(nativeEval.communication).toEqual(tsEval.communication);
      expect(nativeEval.services.length).toBe(tsEval.services.length);
      expect(nativeEval.manifestToon).toBe(tsEval.manifestToon);
    }
  });

  test('Engine 2: Fable Spark situational next-move parity', () => {
    const dir = createTempProject();
    const state = createInitialState('2026-10-10T00:00:00.000Z', dir);
    const tsSpark = evaluateFableSpark({
      state,
      userIntent: 'fix the authentication regression bug',
      openCards: [],
    });
    const nativeSpark = runNativeSpark(ROOT, 'fix the authentication regression bug', dir);

    expect(nativeSpark).not.toBeNull();
    expect(nativeSpark!.suggestion).toBe(tsSpark.suggestion);
    expect(nativeSpark!.reasonCode).toBe(tsSpark.reasonCode);
    expect(nativeSpark!.source).toBe(tsSpark.source);
    expect(nativeSpark!.silent).toBe(tsSpark.silent);
  });

  test('Engine 3: Zero-Copy TOON Codec, Token Estimator & Validator parity', () => {
    const samples = [
      'Simple ASCII sentence for token estimation.',
      'اختبار تقدير التوكنز باللغة العربية مع JSON و TOON',
      '中文与日本語トークン推計テスト 12345',
      JSON.stringify({ phase: 'executing', count: 42, tags: ['rust', 'toon', 'simd'] }),
    ];

    for (const sample of samples) {
      expect(runNativeToonEstimate(ROOT, sample)).toBe(estimateTokens(sample));
    }

    const payload = {
      phase: 'verifying',
      substantial: true,
      cards: [
        { id: 'c1', status: 'done', owner: 'rust-core' },
        { id: 'c2', status: 'open', owner: 'rust-toon' },
      ],
    };

    const tsEncoded = encodeToon(payload);
    const nativeEncoded = runNativeToonEncode(ROOT, payload);
    expect(nativeEncoded).toBe(tsEncoded);

    const validCheck = runNativeToonValidate(ROOT, nativeEncoded);
    expect(validCheck.valid).toBe(true);
    expect(validCheck).toEqual(validateToon(nativeEncoded));

    const brokenToon = 'cards[3]{id,status}:\n  c1,done\n  c2,open';
    const invalidCheck = runNativeToonValidate(ROOT, brokenToon);
    expect(invalidCheck.valid).toBe(false);
    expect(invalidCheck.error).toContain('declared [3], got 2 rows');

    const decodedOut = execFileSync(NATIVE_BIN!, ['toon', 'decode', nativeEncoded], {
      encoding: 'utf-8',
    });
    expect(JSON.parse(decodedOut)).toEqual(decodeToon(nativeEncoded));
  });

  test('Engine 3: Reflex Context Compaction via native CLI', () => {
    const messages = [
      {
        role: 'assistant',
        text: 'Reading file 1',
        toolUses: [
          {
            tool_use_id: 'call_1',
            tool: 'Read',
            input: { file_path: 'src/index.ts' },
            text: 'x'.repeat(2000),
          },
        ],
      },
      {
        role: 'assistant',
        text: 'Reading file 2',
        toolUses: [
          {
            tool_use_id: 'call_2',
            tool: 'Read',
            input: { file_path: 'src/index.ts' },
            text: 'y'.repeat(2000),
          },
        ],
      },
    ];

    const out = execFileSync(
      NATIVE_BIN!,
      ['toon', 'compact', '--keep-recent', '1'],
      {
        input: JSON.stringify(messages),
        encoding: 'utf-8',
      }
    );
    const compacted = JSON.parse(out);
    expect(Array.isArray(compacted)).toBe(true);
    // call_1 result is truncated by Reflex compaction while call_2 is kept in full
    expect(JSON.stringify(compacted).length).toBeLessThan(JSON.stringify(messages).length);
    expect(compacted[0].toolUses[0].text).toContain('fast-jev-compaction truncated');
  });

  test('Engine 1: Native Lifecycle Hook Dispatcher parity (profile, mutation, failure, spawn, close, architecture)', () => {
    const dir = createTempProject();

    // 1. Profile hook (Antigravity host adaptation)
    const profileRes = spawnSync(
      NATIVE_BIN!,
      ['hook', '--handler', 'profile', '--event', 'PreInvocation', '--host', 'antigravity'],
      {
        input: JSON.stringify({ cwd: dir }),
        encoding: 'utf-8',
      }
    );
    expect(profileRes.status).toBe(0);
    const profileJson = JSON.parse(profileRes.stdout);
    expect(profileJson.injectSteps.length).toBe(1);
    expect(profileJson.injectSteps[0].ephemeralMessage).toContain('[get-fable] Canonical coding lifecycle active.');

    // 2. Mutation hook
    const mutRes = spawnSync(
      NATIVE_BIN!,
      ['hook', '--handler', 'mutation', '--event', 'PostToolUse', '--host', 'codex'],
      {
        input: JSON.stringify({ cwd: dir, toolName: 'apply_patch', toolResponse: { ok: true } }),
        encoding: 'utf-8',
      }
    );
    expect(mutRes.status).toBe(0);
    const stAfterMut = JSON.parse(fs.readFileSync(path.join(dir, '.fable', 'state.json'), 'utf-8'));
    expect(stAfterMut.mutationGeneration).toBe(1);
    expect(stAfterMut.substantial).toBe(true);

    // 3. Close guard should now block because mutationGeneration (1) > verifiedGeneration (0)
    const closeBlocked = spawnSync(
      NATIVE_BIN!,
      ['hook', '--handler', 'close', '--event', 'Stop', '--host', 'codex'],
      {
        input: JSON.stringify({ cwd: dir, stopHookActive: false }),
        encoding: 'utf-8',
      }
    );
    expect(closeBlocked.status).toBe(2);
    expect(closeBlocked.stderr).toContain('no fresh passing completion evidence');

    // 4. Architecture guard on high-scale microservices prompt
    const archRes = spawnSync(
      NATIVE_BIN!,
      ['hook', '--handler', 'architecture', '--event', 'SessionStart', '--host', 'claude'],
      {
        input: JSON.stringify({
          cwd: dir,
          prompt: 'Build a platform with 50k concurrent users, oauth auth, stripe billing, kafka messaging, and video transcoding.',
        }),
        encoding: 'utf-8',
      }
    );
    expect(archRes.status).toBe(0);
    const archJson = JSON.parse(archRes.stdout);
    expect(archJson.hookSpecificOutput.additionalContext).toContain('Microservices Architecture mandatory');
  });
});
