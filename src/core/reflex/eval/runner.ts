import { routeTask } from '../../task-router.js';
import type { FableSkillId, RoutingDecision } from '../../types.js';
import { loadReflexConfig } from '../config.js';
import { resolveRoute } from '../service.js';
import type { ReflexAdvisor, ReflexConfig, RouteResolution } from '../types.js';

export interface EvalTestCase {
  id: string;
  task: string;
  expectedSkill: FableSkillId;
  expectedPack?: string;
  category: string;
}

export interface ArmMetrics {
  armName: string;
  totalCases: number;
  top1Count: number;
  top1Accuracy: number;
  avgLatencyMs: number;
  brierScore: number;
}

export interface EvalReport {
  timestamp: string;
  totalCases: number;
  deterministic: ArmMetrics;
  hybridGuarded: ArmMetrics;
  overridesCount: number;
  overridesWon: number;
  overridesHarm: number;
  overridePrecision: number;
}

/**
 * Standard benchmark corpus for evaluating reflex routing semantics.
 */
export const STANDARD_REFLEX_BENCHMARK_CORPUS: EvalTestCase[] = [
  {
    id: 'sec-1',
    task: 'Audit OAuth2 token exchange and session cookies for vulnerabilities',
    expectedSkill: 'fable-security',
    category: 'security',
  },
  {
    id: 'red-1',
    task: 'Run automated IDOR and SQL injection attack graph against API',
    expectedSkill: 'fable-redteam',
    category: 'security',
  },
  {
    id: 'heal-1',
    task: 'Remediate vulnerability in auth middleware and patch security flaw',
    expectedSkill: 'fable-heal',
    category: 'security',
  },
  {
    id: 'rec-1',
    task: 'Failing twice with stale cache and wrong build on master',
    expectedSkill: 'fable-recover',
    category: 'recovery',
  },
  {
    id: 'res-1',
    task: 'Check official primary source documentation for latest Stripe SDK release notes',
    expectedSkill: 'fable-research',
    category: 'research',
  },
  {
    id: 'disc-1',
    task: 'Inspect local repository execution path and trace function callers in core',
    expectedSkill: 'fable-discover',
    category: 'discovery',
  },
  {
    id: 'plan-1',
    task: 'Plan the multi-file architecture migration from REST to gRPC',
    expectedSkill: 'fable-plan',
    category: 'architecture',
  },
  {
    id: 'tdd-1',
    task: 'Write failing regression test and fix the bug in calculator',
    expectedSkill: 'fable-tdd',
    category: 'build',
  },
  {
    id: 'del-1',
    task: 'Delegate independent subtasks across parallel subagents with disjoint files',
    expectedSkill: 'fable-delegate',
    category: 'delegation',
  },
  {
    id: 'rel-1',
    task: 'Prepare release v2.0.0, generate tag, and publish npm package',
    expectedSkill: 'fable-release',
    category: 'delivery',
  },
  {
    id: 'hand-1',
    task: 'Create durable context handoff to continue this task in next session',
    expectedSkill: 'fable-handoff',
    category: 'delivery',
  },
  {
    id: 'simp-1',
    task: 'Clean up dead code, deduplicate logic, and simplify helper without changing behavior',
    expectedSkill: 'fable-simplify',
    category: 'system',
  },
];

/**
 * Runs offline or live evaluation across benchmark test cases.
 */
export async function runReflexEvaluation(
  corpus: EvalTestCase[] = STANDARD_REFLEX_BENCHMARK_CORPUS,
  options?: { advisor?: ReflexAdvisor; config?: ReflexConfig }
): Promise<EvalReport> {
  const config = options?.config || loadReflexConfig({ mode: 'guarded' });

  let detTop1 = 0;
  let guardedTop1 = 0;
  let totalLatency = 0;
  let overridesCount = 0;
  let overridesWon = 0;
  let overridesHarm = 0;
  let brierSum = 0;

  for (const tc of corpus) {
    const start = Date.now();

    // 1. Deterministic arm
    const detDecision = routeTask(tc.task);
    const detMatch = detDecision.selectedSkill === tc.expectedSkill;
    if (detMatch) detTop1++;

    // 2. Hybrid guarded arm
    const res: RouteResolution = await resolveRoute(tc.task, null, {
      config,
      advisor: options?.advisor,
    });
    const latency = Date.now() - start;
    totalLatency += latency;

    const guardedMatch = res.decision.selectedSkill === tc.expectedSkill;
    if (guardedMatch) guardedTop1++;

    // Brier score component: (confidence - outcome)^2
    const outcome = guardedMatch ? 1 : 0;
    const conf = res.decision.confidence;
    brierSum += Math.pow(conf - outcome, 2);

    // Override analysis
    if (res.decision.selectedSkill !== detDecision.selectedSkill) {
      overridesCount++;
      if (guardedMatch && !detMatch) {
        overridesWon++;
      } else if (!guardedMatch && detMatch) {
        overridesHarm++;
      }
    }
  }

  const n = corpus.length;
  const detAccuracy = n > 0 ? detTop1 / n : 0;
  const guardedAccuracy = n > 0 ? guardedTop1 / n : 0;
  const avgLatency = n > 0 ? totalLatency / n : 0;
  const brierScore = n > 0 ? brierSum / n : 0;
  const overridePrecision =
    overridesCount > 0 ? overridesWon / (overridesWon + overridesHarm || 1) : 1.0;

  return {
    timestamp: new Date().toISOString(),
    totalCases: n,
    deterministic: {
      armName: 'deterministic',
      totalCases: n,
      top1Count: detTop1,
      top1Accuracy: Math.round(detAccuracy * 1000) / 1000,
      avgLatencyMs: 0,
      brierScore: 0,
    },
    hybridGuarded: {
      armName: 'hybrid-guarded',
      totalCases: n,
      top1Count: guardedTop1,
      top1Accuracy: Math.round(guardedAccuracy * 1000) / 1000,
      avgLatencyMs: Math.round(avgLatency),
      brierScore: Math.round(brierScore * 1000) / 1000,
    },
    overridesCount,
    overridesWon,
    overridesHarm,
    overridePrecision: Math.round(overridePrecision * 1000) / 1000,
  };
}
