import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createInitialState, hasFreshPassingEvidence, transitionState } from './state.js';
import { getCoreRepoRoot } from './skill-registry.js';
import type { EvidenceKind, FableState } from './types.js';

export type VerificationCategory = 'known' | 'negative' | 'ambiguous' | 'adversarial' | 'holdout';
export interface VerificationCaseResult {
  id: string;
  source: string;
  expectedFresh: boolean;
  actualFresh: boolean;
  expectedCompletionAllowed: boolean;
  actualCompletionAllowed: boolean;
  passed: boolean;
}
export interface VerificationCategoryEvidence {
  status: 'PASS' | 'FAIL' | 'NOT_CHECKED';
  total: number;
  passed: number;
  passRate: number | null;
  cases: VerificationCaseResult[];
}
export interface EnterpriseVerificationBenchmark {
  schemaVersion: 1;
  metric: 'enterprise-verification';
  categories: Record<VerificationCategory, VerificationCategoryEvidence>;
}

function loadCases(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed?.cases)) {
    throw new Error(`Invalid verification corpus: ${filePath}`);
  }
  return parsed.cases;
}

function stateForCase(item: any, repoRoot: string): FableState {
  const overrides = item?.given?.state && typeof item.given.state === 'object' ? item.given.state : {};
  const base = createInitialState('2026-08-19T00:00:00.000Z', repoRoot);
  const generation = Number.isInteger(overrides.mutationGeneration) ? overrides.mutationGeneration : 0;
  const rawEvidence = Array.isArray(overrides.evidence) ? overrides.evidence : [];
  const evidence = rawEvidence.map((record: any, index: number) => ({
    kind: record.kind as EvidenceKind,
    source: typeof record.source === 'string' ? record.source : 'verification-fixture',
    result: record.result,
    detail: typeof record.detail === 'string' ? record.detail : 'fixture evidence',
    generation: Number.isInteger(record.generation) ? record.generation : generation,
    timestamp: typeof record.timestamp === 'string' ? record.timestamp : `2026-08-19T00:00:${String(index).padStart(2, '0')}.000Z`,
    workspaceId: base.workspaceId,
  }));
  return { ...base, ...overrides, evidence } as FableState;
}

function evaluateCategory(cases: any[], category: VerificationCategory, repoRoot: string): VerificationCategoryEvidence {
  const selected = cases.filter((item) => item?.category === category);
  if (selected.length === 0) return { status: 'NOT_CHECKED', total: 0, passed: 0, passRate: null, cases: [] };
  const results = selected.map((item): VerificationCaseResult => {
    if (typeof item?.id !== 'string' || typeof item?.expected?.fresh !== 'boolean' || typeof item?.expected?.completionAllowed !== 'boolean') {
      throw new Error(`Malformed ${category} verification case`);
    }
    const state = stateForCase(item, repoRoot);
    const actualFresh = hasFreshPassingEvidence(state);
    let actualCompletionAllowed = true;
    try { transitionState(state, 'complete', '2026-08-19T00:01:00.000Z'); }
    catch { actualCompletionAllowed = false; }
    const passed = actualFresh === item.expected.fresh && actualCompletionAllowed === item.expected.completionAllowed;
    return {
      id: item.id,
      source: category === 'holdout' ? 'evals/holdouts/verification-v1.json' : 'eval/benchmarks/verification-v1.json',
      expectedFresh: item.expected.fresh,
      actualFresh,
      expectedCompletionAllowed: item.expected.completionAllowed,
      actualCompletionAllowed,
      passed,
    };
  });
  const passed = results.filter((item) => item.passed).length;
  return { status: passed === results.length ? 'PASS' : 'FAIL', total: results.length, passed, passRate: passed / results.length, cases: results };
}

export function runEnterpriseVerificationBenchmark(
  repoRoot: string = getCoreRepoRoot(),
  options: { includeHoldout?: boolean } = {}
): EnterpriseVerificationBenchmark {
  const checked = loadCases(path.join(repoRoot, 'eval', 'benchmarks', 'verification-v1.json'));
  const holdout = options.includeHoldout ? loadCases(path.join(repoRoot, 'evals', 'holdouts', 'verification-v1.json')) : [];
  return {
    schemaVersion: 1,
    metric: 'enterprise-verification',
    categories: {
      known: evaluateCategory(checked, 'known', repoRoot),
      negative: evaluateCategory(checked, 'negative', repoRoot),
      ambiguous: evaluateCategory(checked, 'ambiguous', repoRoot),
      adversarial: evaluateCategory(checked, 'adversarial', repoRoot),
      holdout: options.includeHoldout
        ? evaluateCategory(holdout, 'holdout', repoRoot)
        : { status: 'NOT_CHECKED', total: 0, passed: 0, passRate: null, cases: [] },
    },
  };
}

export function verificationFileSha256(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export interface VerificationHoldoutEvidenceSnapshot {
  schemaVersion: 1;
  metric: 'enterprise-verification-holdout';
  capturedAt: string;
  repositoryRevision?: string | null;
  corpusSha256: string;
  stateSha256: string;
  evaluatorSha256: string;
  total: number;
  passed: number;
  passRate: number;
}
export interface VerificationHoldoutEvidenceValidation {
  status: 'PASS' | 'FAIL' | 'NOT_CHECKED';
  fresh: boolean;
  reason: string;
  snapshot?: VerificationHoldoutEvidenceSnapshot;
}

export function validateVerificationHoldoutEvidenceSnapshot(
  snapshot: any,
  expected: { corpusSha256: string; stateSha256: string; evaluatorSha256: string }
): VerificationHoldoutEvidenceValidation {
  if (!snapshot || snapshot.schemaVersion !== 1 || snapshot.metric !== 'enterprise-verification-holdout') {
    return { status: 'NOT_CHECKED', fresh: false, reason: 'verification holdout evidence schema is missing or invalid' };
  }
  for (const field of ['corpusSha256', 'stateSha256'] as const) {
    if (typeof snapshot[field] !== 'string' || snapshot[field] !== expected[field]) {
      return { status: 'NOT_CHECKED', fresh: false, reason: `verification holdout evidence is stale for ${field}` };
    }
  }
  if (!Number.isInteger(snapshot.total) || snapshot.total <= 0 || !Number.isInteger(snapshot.passed) || snapshot.passed < 0 || snapshot.passed > snapshot.total) {
    return { status: 'NOT_CHECKED', fresh: false, reason: 'verification holdout evidence counts are invalid' };
  }
  if (typeof snapshot.passRate !== 'number' || snapshot.passRate !== snapshot.passed / snapshot.total) {
    return { status: 'NOT_CHECKED', fresh: false, reason: 'verification holdout evidence metrics are invalid' };
  }
  const typed = snapshot as VerificationHoldoutEvidenceSnapshot;
  const passed = typed.passRate >= 0.9;
  return {
    status: passed ? 'PASS' : 'FAIL',
    fresh: true,
    reason: passed ? 'fresh verification holdout evidence meets thresholds' : 'fresh verification holdout evidence does not meet thresholds',
    snapshot: typed,
  };
}

export function loadFrozenVerificationHoldoutEvidence(repoRoot: string = getCoreRepoRoot()): VerificationHoldoutEvidenceValidation {
  const corpusPath = path.join(repoRoot, 'evals', 'holdouts', 'verification-v1.json');
  const evidencePath = path.join(repoRoot, 'evals', 'results', 'verification-holdout-v1.json');
  const statePath = path.join(repoRoot, 'src', 'core', 'state.ts');
  const evaluatorPath = path.join(repoRoot, 'src', 'core', 'verification-eval.ts');
  if (![corpusPath, evidencePath, statePath, evaluatorPath].every(fs.existsSync)) {
    return { status: 'NOT_CHECKED', fresh: false, reason: 'frozen verification holdout evidence has not been captured' };
  }
  try {
    const snapshot = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
    return validateVerificationHoldoutEvidenceSnapshot(snapshot, {
      corpusSha256: verificationFileSha256(corpusPath),
      stateSha256: verificationFileSha256(statePath),
      evaluatorSha256: verificationFileSha256(evaluatorPath),
    });
  } catch (error) {
    return { status: 'NOT_CHECKED', fresh: false, reason: `failed to read verification holdout evidence: ${error instanceof Error ? error.message : String(error)}` };
  }
}
