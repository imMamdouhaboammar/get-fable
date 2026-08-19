import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createInitialState } from './state.js';
import { routeTask } from './task-router.js';
import { evaluateFableSpark } from './spark.js';
import { getCoreRepoRoot, loadSkillRegistry } from './skill-registry.js';
import { loadSkillPackage, readSkillResource } from './skill-package.js';
import type { FableSkillId, FableState } from './types.js';


export function repositoryRevision(repoRoot: string = getCoreRepoRoot()): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch { return null; }
}

export interface RoutingEvalCaseResult {
  id: string;
  source: string;
  expectedSkill: string;
  actualSkill: string;
  forbiddenSkill?: string;
  passed: boolean;
  forbiddenViolated: boolean;
}

export interface RoutingBenchmarkResult {
  schemaVersion: 1;
  metric: 'routing';
  total: number;
  passed: number;
  accuracy: number;
  forbiddenViolations: number;
  forbiddenViolationRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  confusionMatrix: Record<string, Record<string, number>>;
  cases: RoutingEvalCaseResult[];
}

export interface SkillKnownCaseResult {
  id: string;
  expectedSkill: string;
  actualSkill: string;
  passed: boolean;
  forbiddenSkill?: string;
  forbiddenViolated: boolean;
}

export interface SkillKnownCasesResult {
  id: FableSkillId;
  executable: number;
  passed: number;
  passRate: number;
  negativeCases: number;
  negativePassed: number;
  negativePassRate: number;
  ownerRouteCases: number;
  ownerRoutePassed: number;
  cases: SkillKnownCaseResult[];
}

function scenarioArray(value: any): any[] {
  return Array.isArray(value) ? value : Array.isArray(value?.scenarios) ? value.scenarios : [];
}

function loadSkillScenarios(id: FableSkillId, repoRoot: string): any[] {
  const manifest = loadSkillPackage(id, repoRoot);
  return manifest.evals.flatMap((resource) => {
    if (!resource.endsWith('.json')) return [];
    try { return scenarioArray(JSON.parse(readSkillResource(id, resource, repoRoot))); }
    catch { return []; }
  });
}

export function runSkillKnownCases(
  id: FableSkillId,
  repoRoot: string = getCoreRepoRoot()
): SkillKnownCasesResult {
  const cases: SkillKnownCaseResult[] = [];
  for (const scenario of loadSkillScenarios(id, repoRoot)) {
    const intent = scenario?.given?.intent;
    if (typeof intent !== 'string' || !intent.trim()) continue;
    if (typeof scenario?.expected?.selectedSkill !== 'string') continue;
    const expectedSkill = scenario.expected.selectedSkill;
    const forbiddenSkill = typeof scenario?.forbidden?.selectedSkill === 'string'
      ? scenario.forbidden.selectedSkill
      : undefined;
    const actualSkill = routeTask(intent, null, loadSkillRegistry(repoRoot)).selectedSkill;
    cases.push({
      id: String(scenario.id),
      expectedSkill,
      actualSkill,
      forbiddenSkill,
      passed: actualSkill === expectedSkill,
      forbiddenViolated: Boolean(forbiddenSkill && actualSkill === forbiddenSkill),
    });
  }
  const passed = cases.filter((item) => item.passed).length;
  const negative = cases.filter((item) => item.forbiddenSkill);
  const negativePassed = negative.filter((item) => !item.forbiddenViolated).length;
  const owner = cases.filter((item) => item.expectedSkill === id);
  return {
    id,
    executable: cases.length,
    passed,
    passRate: cases.length ? passed / cases.length : 0,
    negativeCases: negative.length,
    negativePassed,
    negativePassRate: negative.length ? negativePassed / negative.length : 0,
    ownerRouteCases: owner.length,
    ownerRoutePassed: owner.filter((item) => item.passed).length,
    cases,
  };
}

function lifecycleRoutingCases(repoRoot: string): Array<{ id: string; intent: string; expectedSkill: string; forbiddenSkill?: string; source: string }> {
  const filePath = path.join(repoRoot, 'eval', 'scenarios', 'lifecycle-v2.json');
  if (!fs.existsSync(filePath)) return [];
  const suite = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return scenarioArray(suite)
    .filter((item) => typeof item?.task === 'string' && typeof item?.expectedSkill === 'string')
    .map((item) => ({ id: String(item.id), intent: item.task, expectedSkill: item.expectedSkill, source: 'eval/scenarios/lifecycle-v2.json' }));
}

export function runRoutingBenchmark(repoRoot: string = getCoreRepoRoot()): RoutingBenchmarkResult {
  const cases: RoutingEvalCaseResult[] = [];
  for (const item of lifecycleRoutingCases(repoRoot)) {
    const actualSkill = routeTask(item.intent, null, loadSkillRegistry(repoRoot)).selectedSkill;
    cases.push({ ...item, actualSkill, passed: actualSkill === item.expectedSkill, forbiddenViolated: false });
  }
  const skillsDir = path.join(repoRoot, 'skills');
  for (const name of fs.readdirSync(skillsDir)) {
    if (!fs.existsSync(path.join(skillsDir, name, 'skill.package.json'))) continue;
    const result = runSkillKnownCases(name as FableSkillId, repoRoot);
    for (const item of result.cases) cases.push({ ...item, source: `skills/${name}` });
  }
  const confusionMatrix: Record<string, Record<string, number>> = {};
  for (const item of cases) {
    confusionMatrix[item.expectedSkill] ||= {};
    confusionMatrix[item.expectedSkill][item.actualSkill] = (confusionMatrix[item.expectedSkill][item.actualSkill] || 0) + 1;
  }
  const passed = cases.filter((item) => item.passed).length;
  const forbiddenViolations = cases.filter((item) => item.forbiddenViolated).length;
  const errors = cases.length - passed;
  return {
    schemaVersion: 1,
    metric: 'routing',
    total: cases.length,
    passed,
    accuracy: cases.length ? passed / cases.length : 0,
    forbiddenViolations,
    forbiddenViolationRate: cases.length ? forbiddenViolations / cases.length : 0,
    falsePositiveRate: cases.length ? errors / cases.length : 0,
    falseNegativeRate: cases.length ? errors / cases.length : 0,
    confusionMatrix,
    cases,
  };
}

export interface SparkEvalCaseResult {
  id: string;
  executed: true;
  passed: boolean;
  expectedSuggestion: string | null | undefined;
  actualSuggestion: string | null;
  expectedSilent?: boolean;
  actualSilent: boolean;
  forbiddenViolated: boolean;
}

export interface SparkBenchmarkResult {
  schemaVersion: 1;
  metric: 'spark';
  total: number;
  passed: number;
  top1Accuracy: number;
  silencePrecision: number;
  unsafeActionRate: number;
  cases: SparkEvalCaseResult[];
}

export function runSparkBenchmark(repoRoot: string = getCoreRepoRoot()): SparkBenchmarkResult {
  const scenarios = loadSkillScenarios('fable-spark', repoRoot);
  const cases: SparkEvalCaseResult[] = [];
  for (const scenario of scenarios) {
    const stateOverrides = scenario?.given?.state && typeof scenario.given.state === 'object' ? scenario.given.state : {};
    const state = { ...createInitialState('2026-08-19T00:00:00.000Z', repoRoot), ...stateOverrides } as FableState;
    const result = evaluateFableSpark({
      state,
      userIntent: typeof scenario?.given?.userIntent === 'string' ? scenario.given.userIntent : undefined,
    });
    const expectedSuggestion = scenario?.expected?.suggestion;
    const expectedSilent = typeof scenario?.expected?.silent === 'boolean' ? scenario.expected.silent : undefined;
    const suggestionPass = expectedSuggestion === undefined || result.suggestion === expectedSuggestion;
    const silencePass = expectedSilent === undefined || result.silent === expectedSilent;
    const reasonPass = typeof scenario?.expected?.reasonCode !== 'string' || result.reasonCode === scenario.expected.reasonCode;
    const forbidden = scenario?.forbidden?.suggestion;
    const forbiddenViolated = typeof forbidden === 'string' && result.suggestion === forbidden;
    cases.push({
      id: String(scenario.id), executed: true,
      passed: suggestionPass && silencePass && reasonPass && !forbiddenViolated,
      expectedSuggestion, actualSuggestion: result.suggestion,
      expectedSilent, actualSilent: result.silent, forbiddenViolated,
    });
  }
  const passed = cases.filter((item) => item.passed).length;
  const predictedSilent = cases.filter((item) => item.actualSilent);
  const correctSilent = predictedSilent.filter((item) => item.expectedSilent === true).length;
  return {
    schemaVersion: 1,
    metric: 'spark',
    total: cases.length,
    passed,
    top1Accuracy: cases.length ? passed / cases.length : 0,
    silencePrecision: predictedSilent.length ? correctSilent / predictedSilent.length : 1,
    unsafeActionRate: cases.length ? cases.filter((item) => item.forbiddenViolated).length / cases.length : 0,
    cases,
  };
}

export type EnterpriseRoutingCategory = 'known' | 'negative' | 'ambiguous' | 'adversarial' | 'holdout';
export interface RoutingCategoryEvidence {
  status: 'PASS' | 'FAIL' | 'NOT_CHECKED';
  total: number;
  passed: number;
  passRate: number | null;
  forbiddenViolations: number;
  cases: RoutingEvalCaseResult[];
}
export interface EnterpriseRoutingBenchmark {
  schemaVersion: 1;
  metric: 'enterprise-routing';
  categories: Record<EnterpriseRoutingCategory, RoutingCategoryEvidence>;
}

function emptyRoutingEvidence(status: RoutingCategoryEvidence['status'] = 'NOT_CHECKED'): RoutingCategoryEvidence {
  return { status, total: 0, passed: 0, passRate: null, forbiddenViolations: 0, cases: [] };
}

function loadEnterpriseRoutingCases(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed?.cases)) {
    throw new Error(`Invalid enterprise routing corpus: ${filePath}`);
  }
  return parsed.cases;
}

function evaluateRoutingCategory(cases: any[], category: EnterpriseRoutingCategory, repoRoot: string): RoutingCategoryEvidence {
  const selected = cases.filter((item) => item?.category === category);
  if (selected.length === 0) return emptyRoutingEvidence();
  const registry = loadSkillRegistry(repoRoot);
  const results: RoutingEvalCaseResult[] = selected.map((item) => {
    if (typeof item?.id !== 'string' || typeof item?.task !== 'string' || typeof item?.expectedSkill !== 'string') {
      throw new Error(`Malformed ${category} routing case`);
    }
    const actualSkill = routeTask(item.task, null, registry).selectedSkill;
    const forbiddenSkill = typeof item.forbiddenSkill === 'string' ? item.forbiddenSkill : undefined;
    const forbiddenViolated = Boolean(forbiddenSkill && actualSkill === forbiddenSkill);
    return {
      id: item.id,
      source: category === 'holdout' ? 'evals/holdouts/routing-v1.json' : 'eval/benchmarks/routing-v1.json',
      expectedSkill: item.expectedSkill,
      actualSkill,
      forbiddenSkill,
      passed: actualSkill === item.expectedSkill && !forbiddenViolated,
      forbiddenViolated,
    };
  });
  const passed = results.filter((item) => item.passed).length;
  const forbiddenViolations = results.filter((item) => item.forbiddenViolated).length;
  return {
    status: passed === results.length ? 'PASS' : 'FAIL',
    total: results.length,
    passed,
    passRate: passed / results.length,
    forbiddenViolations,
    cases: results,
  };
}

export function runEnterpriseRoutingBenchmark(
  repoRoot: string = getCoreRepoRoot(),
  options: { includeHoldout?: boolean } = {}
): EnterpriseRoutingBenchmark {
  const checked = loadEnterpriseRoutingCases(path.join(repoRoot, 'eval', 'benchmarks', 'routing-v1.json'));
  const holdout = options.includeHoldout
    ? loadEnterpriseRoutingCases(path.join(repoRoot, 'evals', 'holdouts', 'routing-v1.json'))
    : [];
  return {
    schemaVersion: 1,
    metric: 'enterprise-routing',
    categories: {
      known: evaluateRoutingCategory(checked, 'known', repoRoot),
      negative: evaluateRoutingCategory(checked, 'negative', repoRoot),
      ambiguous: evaluateRoutingCategory(checked, 'ambiguous', repoRoot),
      adversarial: evaluateRoutingCategory(checked, 'adversarial', repoRoot),
      holdout: options.includeHoldout ? evaluateRoutingCategory(holdout, 'holdout', repoRoot) : emptyRoutingEvidence(),
    },
  };
}


export interface RoutingHoldoutEvidenceSnapshot {
  schemaVersion: 1;
  metric: 'enterprise-routing-holdout';
  capturedAt: string;
  repositoryRevision?: string | null;
  corpusSha256: string;
  routerSha256: string;
  runnerSha256: string;
  total: number;
  passed: number;
  passRate: number;
  forbiddenViolations: number;
}

export interface RoutingHoldoutEvidenceValidation {
  status: 'PASS' | 'FAIL' | 'NOT_CHECKED';
  fresh: boolean;
  reason: string;
  snapshot?: RoutingHoldoutEvidenceSnapshot;
}

export function sha256File(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function validateRoutingHoldoutEvidenceSnapshot(
  snapshot: any,
  expected: { corpusSha256: string; routerSha256: string; runnerSha256: string }
): RoutingHoldoutEvidenceValidation {
  if (!snapshot || snapshot.schemaVersion !== 1 || snapshot.metric !== 'enterprise-routing-holdout') {
    return { status: 'NOT_CHECKED', fresh: false, reason: 'holdout evidence schema is missing or invalid' };
  }
  const hashFields = ['corpusSha256', 'routerSha256', 'runnerSha256'] as const;
  for (const field of hashFields) {
    if (typeof snapshot[field] !== 'string' || snapshot[field] !== expected[field]) {
      return { status: 'NOT_CHECKED', fresh: false, reason: `holdout evidence is stale for ${field}` };
    }
  }
  if (!Number.isInteger(snapshot.total) || snapshot.total <= 0 || !Number.isInteger(snapshot.passed) || snapshot.passed < 0 || snapshot.passed > snapshot.total) {
    return { status: 'NOT_CHECKED', fresh: false, reason: 'holdout evidence counts are invalid' };
  }
  if (typeof snapshot.passRate !== 'number' || snapshot.passRate !== snapshot.passed / snapshot.total || !Number.isInteger(snapshot.forbiddenViolations) || snapshot.forbiddenViolations < 0) {
    return { status: 'NOT_CHECKED', fresh: false, reason: 'holdout evidence metrics are invalid' };
  }
  const typed = snapshot as RoutingHoldoutEvidenceSnapshot;
  const passed = typed.passRate >= 0.9 && typed.forbiddenViolations === 0;
  return {
    status: passed ? 'PASS' : 'FAIL',
    fresh: true,
    reason: passed ? 'fresh holdout evidence meets routing thresholds' : 'fresh holdout evidence does not meet routing thresholds',
    snapshot: typed,
  };
}

export function loadFrozenRoutingHoldoutEvidence(repoRoot: string = getCoreRepoRoot()): RoutingHoldoutEvidenceValidation {
  const corpusPath = path.join(repoRoot, 'evals', 'holdouts', 'routing-v1.json');
  const evidencePath = path.join(repoRoot, 'evals', 'results', 'routing-holdout-v1.json');
  const routerPath = path.join(repoRoot, 'src', 'core', 'task-router.ts');
  const runnerPath = path.join(repoRoot, 'src', 'core', 'eval-runner.ts');
  if (![corpusPath, evidencePath, routerPath, runnerPath].every(fs.existsSync)) {
    return { status: 'NOT_CHECKED', fresh: false, reason: 'frozen routing holdout evidence has not been captured' };
  }
  try {
    const snapshot = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
    return validateRoutingHoldoutEvidenceSnapshot(snapshot, {
      corpusSha256: sha256File(corpusPath),
      routerSha256: sha256File(routerPath),
      runnerSha256: sha256File(runnerPath),
    });
  } catch (error) {
    return { status: 'NOT_CHECKED', fresh: false, reason: `failed to read holdout evidence: ${error instanceof Error ? error.message : String(error)}` };
  }
}
