import fs from 'node:fs';
import path from 'node:path';
import { repositoryRevision } from '../src/core/eval-runner.js';
import {
  runEnterpriseVerificationBenchmark,
  verificationFileSha256,
} from '../src/core/verification-eval.js';
import { getCoreRepoRoot } from '../src/core/skill-registry.js';

const repoRoot = getCoreRepoRoot();
const corpusPath = path.join(repoRoot, 'evals', 'holdouts', 'verification-v1.json');
const statePath = path.join(repoRoot, 'src', 'core', 'state.ts');
const evaluatorPath = path.join(repoRoot, 'src', 'core', 'verification-eval.ts');
const outputPath = path.join(repoRoot, 'evals', 'results', 'verification-holdout-v1.json');
const result = runEnterpriseVerificationBenchmark(repoRoot, { includeHoldout: true }).categories.holdout;
if (result.total < 20) throw new Error(`Verification holdout corpus is too small: ${result.total}`);
const snapshot = {
  schemaVersion: 1,
  metric: 'enterprise-verification-holdout',
  capturedAt: new Date().toISOString(),
  repositoryRevision: repositoryRevision(repoRoot),
  corpusSha256: verificationFileSha256(corpusPath),
  stateSha256: verificationFileSha256(statePath),
  evaluatorSha256: verificationFileSha256(evaluatorPath),
  total: result.total,
  passed: result.passed,
  passRate: result.passRate,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf-8');
console.log(JSON.stringify(snapshot, null, 2));
if (result.passRate === null || result.passRate < 0.9) process.exitCode = 1;
