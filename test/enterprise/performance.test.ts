import { describe, expect, test } from 'bun:test';
import { performance } from 'node:perf_hooks';
import { routeTask } from '../../src/core/task-router.ts';
import { compileFableDirective } from '../../src/core/prompt-compiler.ts';
import { createInitialState } from '../../src/core/state.ts';
import { evaluateFableSpark } from '../../src/core/spark.ts';
import { validateAllSkillPackages } from '../../src/core/skill-package.ts';
import { runDoctor } from '../../src/core/doctor.ts';
import { getCoreRepoRoot } from '../../src/core/skill-registry.ts';
import { ENTERPRISE_PERFORMANCE_BUDGETS_MS as B } from '../../src/core/performance.ts';

function duration(fn: () => void) { const start = performance.now(); fn(); return performance.now() - start; }
const root = getCoreRepoRoot();

describe('enterprise performance budgets', () => {
  test('keeps deterministic routing within the measured bulk budget', () => {
    const ms = duration(() => { for (let i = 0; i < 1000; i += 1) routeTask(`Review change ${i} before merge`); });
    expect(ms).toBeLessThan(B.route1000);
  });
  test('keeps compact prompt compilation bounded', () => {
    let maxBytes = 0;
    const ms = duration(() => { for (let i = 0; i < 200; i += 1) maxBytes = Math.max(maxBytes, Buffer.byteLength(compileFableDirective(`Fix regression ${i} test-first`).systemPrompt)); });
    expect(ms).toBeLessThan(B.promptCompile200);
    expect(maxBytes).toBeLessThan(32 * 1024);
  });
  test('keeps Spark evaluation bounded', () => {
    const state = createInitialState('2026-08-19T00:00:00.000Z', root);
    const ms = duration(() => { for (let i = 0; i < 1000; i += 1) evaluateFableSpark({ state, userIntent: 'continue safely' }); });
    expect(ms).toBeLessThan(B.spark1000);
  });
  test('keeps package catalog validation and Doctor bounded', () => {
    const packageMs = duration(() => { const all = validateAllSkillPackages(root); expect(Object.values(all).every((v) => v.valid)).toBe(true); });
    const doctorMs = duration(() => { const report = runDoctor(root, root); expect(report.ok).toBe(true); });
    expect(packageMs).toBeLessThan(B.packageCatalogValidation);
    expect(doctorMs).toBeLessThan(B.doctor);
  }, 30000);
});
