import fs from 'node:fs';
import path from 'node:path';
import {
  repositoryRevision,
  runEnterpriseSparkBenchmark,
  sha256File,
} from '../src/core/eval-runner.js';
import { getCoreRepoRoot } from '../src/core/skill-registry.js';

const repoRoot = getCoreRepoRoot();
const corpusPath = path.join(repoRoot, 'evals', 'holdouts', 'spark-v1.json');
const sparkPath = path.join(repoRoot, 'src', 'core', 'spark.ts');
const runnerPath = path.join(repoRoot, 'src', 'core', 'eval-runner.ts');
const outputPath = path.join(repoRoot, 'evals', 'results', 'spark-holdout-v1.json');
const result = runEnterpriseSparkBenchmark(repoRoot, { includeHoldout: true }).categories.holdout;
if (result.total < 20) throw new Error(`Spark holdout corpus is too small: ${result.total}`);
const snapshot = {
  schemaVersion: 1,
  metric: 'enterprise-spark-holdout',
  capturedAt: new Date().toISOString(),
  repositoryRevision: repositoryRevision(repoRoot),
  corpusSha256: sha256File(corpusPath),
  sparkSha256: sha256File(sparkPath),
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
