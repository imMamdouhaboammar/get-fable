import fs from 'node:fs';
import path from 'node:path';
import {
  repositoryRevision,
  runEnterpriseRoutingBenchmark,
  sha256File,
} from '../src/core/eval-runner.js';
import { getCoreRepoRoot } from '../src/core/skill-registry.js';

const repoRoot = getCoreRepoRoot();
const corpusPath = path.join(repoRoot, 'evals', 'holdouts', 'routing-v1.json');
const routerPath = path.join(repoRoot, 'src', 'core', 'task-router.ts');
const runnerPath = path.join(repoRoot, 'src', 'core', 'eval-runner.ts');
const outputPath = path.join(repoRoot, 'evals', 'results', 'routing-holdout-v1.json');
const result = runEnterpriseRoutingBenchmark(repoRoot, { includeHoldout: true }).categories.holdout;
if (result.total < 20) throw new Error(`Holdout corpus is too small: ${result.total}`);
const snapshot = {
  schemaVersion: 1,
  metric: 'enterprise-routing-holdout',
  capturedAt: new Date().toISOString(),
  repositoryRevision: repositoryRevision(repoRoot),
  corpusSha256: sha256File(corpusPath),
  routerSha256: sha256File(routerPath),
  runnerSha256: sha256File(runnerPath),
  total: result.total,
  passed: result.passed,
  passRate: result.passRate,
  forbiddenViolations: result.forbiddenViolations,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf-8');
console.log(JSON.stringify(snapshot, null, 2));
if (result.passRate === null || result.passRate < 0.9 || result.forbiddenViolations > 0) process.exitCode = 1;
