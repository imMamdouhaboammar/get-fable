import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  TEST_VALUE_REA_EVIDENCE_LEDGER,
  evaluateThreeQuestions,
  decideTestAction,
  diagnoseTestFailure,
  verifyDiscrimination,
  validateCutBoundaryRecord,
  analyzeTestFileContent,
  auditTestSuite,
  selectTestsByRisk,
  verifyShardCoverage,
  parseTestRunnerOutput,
  canReuseVerificationEvidence,
  runSpearheadPipeline,
} from '../src/core/test-value/index.ts';
import { runCli } from '../src/cli.ts';
import { initProjectFable } from '../src/installer.ts';

const tempDirs: string[] = [];

function makeTempDir(prefix = 'fable-test-value-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function captureConsole(run: () => number | Promise<number>) {
  const lines: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args: unknown[]) => lines.push(args.map(String).join(' '));
  console.error = (...args: unknown[]) => lines.push(args.map(String).join(' '));
  try {
    const res = run();
    if (res instanceof Promise) {
      return res.then((code) => ({ code, output: lines.join('\n') })).finally(() => {
        console.log = originalLog;
        console.error = originalError;
      });
    }
    console.log = originalLog;
    console.error = originalError;
    return { code: res, output: lines.join('\n') };
  } catch (err) {
    console.log = originalLog;
    console.error = originalError;
    throw err;
  }
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('Fable Test-Value Spearhead Engine (REA Reconstruction of tt-a1i/test-value)', () => {
  describe('1. REA Evidence Ledger & Provenance Contract', () => {
    test('records exact SHA-256 artifact digests, commit tree SHA, locations, and unknowns', () => {
      expect(TEST_VALUE_REA_EVIDENCE_LEDGER.sourceRepository).toBe('https://github.com/tt-a1i/test-value');
      expect(TEST_VALUE_REA_EVIDENCE_LEDGER.treeSha).toBe('e3fb8a7f0950b661fab0993a06306096797dca3f');
      expect(TEST_VALUE_REA_EVIDENCE_LEDGER.artifacts['SKILL.md'].sha256).toBe(
        'a68cfc741104a6abb23d8b04354885c0c7360a7a3e65a09b194b7e121b2cc51e'
      );
      expect(TEST_VALUE_REA_EVIDENCE_LEDGER.artifacts['references/audit.md'].sha256).toBe(
        '982e568099c21e51d6f76ae8c2185acacac36f5bede87f05302249314b387757'
      );
      expect(TEST_VALUE_REA_EVIDENCE_LEDGER.artifacts['references/decision-examples.md'].sha256).toBe(
        'a3c4228dbb5a42887842da09ecc0bfd8015d8828fec514a4af8e5edc792639f1'
      );
      expect(TEST_VALUE_REA_EVIDENCE_LEDGER.artifacts['README_EN.md'].sha256).toBe(
        '6591c5bdf9273bdf81abbbb80e3f8427593698371f0776b085dc54ceb62f8544'
      );
      expect(TEST_VALUE_REA_EVIDENCE_LEDGER.symbols.length).toBeGreaterThanOrEqual(6);
      expect(TEST_VALUE_REA_EVIDENCE_LEDGER.unknowns.length).toBeGreaterThan(0);
    });
  });

  describe('2. Three-Question Correctness & Value Calculus (SKILL.md:20-31)', () => {
    test('awards high net value to contract-grounded regression tests protecting high-severity boundaries', () => {
      const result = evaluateThreeQuestions({
        concreteMistake: 'Concurrent state write corrupts .fable/state.json when lock acquisition races',
        userOrMaintainerLoss: 'Permanent loss of workspace verification state and broken lifecycle recovery',
        protectedBoundary: 'data-integrity',
        oracleSource: 'public-contract',
        breaksOnEquivalentRefactor: false,
        freezesNonContractualOutput: false,
        existingCoverage: 'none',
        executionCostMs: 45,
        maintenanceFriction: 'low',
      });

      expect(result.independentBasisVerified).toBe(true);
      expect(result.protectionScore).toBeGreaterThanOrEqual(85);
      expect(result.refactorResilienceScore).toBeGreaterThanOrEqual(90);
      expect(result.netValueScore).toBeGreaterThanOrEqual(60);
      expect(result.recommendedAction).toBe('ADD_CHEAPEST_REGRESSION');
      expect(result.traps).toEqual([]);
    });

    test('flags shared-mistake oracle when AI test derives expectations from the implementation under test', () => {
      const result = evaluateThreeQuestions({
        concreteMistake: 'Discount calculation returns wrong float',
        userOrMaintainerLoss: 'Incorrect invoice total',
        protectedBoundary: 'core-contract',
        oracleSource: 'copied-implementation',
        breaksOnEquivalentRefactor: false,
        freezesNonContractualOutput: false,
        existingCoverage: 'none',
        executionCostMs: 20,
        maintenanceFriction: 'low',
      });

      expect(result.independentBasisVerified).toBe(false);
      expect(result.traps).toContain('shared-mistake-oracle');
      expect(result.rationale).toContain('independent');
    });

    test('recommends RELAX_TO_CONTRACT_PROPERTIES when test freezes noncontractual automatic output', () => {
      const result = evaluateThreeQuestions({
        concreteMistake: 'Graph edge router produces overlapping bend coordinates',
        userOrMaintainerLoss: 'Visual diagram legibility regression',
        protectedBoundary: 'core-contract',
        oracleSource: 'user-requirement',
        breaksOnEquivalentRefactor: true,
        freezesNonContractualOutput: true,
        existingCoverage: 'partial',
        executionCostMs: 120,
        maintenanceFriction: 'high',
      });

      expect(result.refactorResilienceScore).toBeLessThan(50);
      expect(result.traps).toContain('noncontractual-snapshot');
      expect(result.recommendedAction).toBe('RELAX_TO_CONTRACT_PROPERTIES');
    });
  });

  describe('3. 8-Row Decision Matrix Engine & High-Risk Protection Floor (SKILL.md:32-52)', () => {
    test('maps all 8 canonical evidence states to their exact Test-Value decision', () => {
      expect(
        decideTestAction({
          uncoveredBoundary: true,
          existingTestFailsForMistake: false,
          freezesNonContractualOutput: false,
          duplicateSamePathCount: 0,
          sharedRuleMatrixAcrossEntrypoints: false,
          isCostly: false,
          protectsDistinctRisk: true,
          contractEndedOrRemoved: false,
          ownershipOrExpectationUnclear: false,
          protectedBoundary: 'core-contract',
        }).action
      ).toBe('ADD_CHEAPEST_REGRESSION');

      expect(
        decideTestAction({
          uncoveredBoundary: false,
          existingTestFailsForMistake: true,
          freezesNonContractualOutput: false,
          duplicateSamePathCount: 0,
          sharedRuleMatrixAcrossEntrypoints: false,
          isCostly: false,
          protectsDistinctRisk: true,
          contractEndedOrRemoved: false,
          ownershipOrExpectationUnclear: false,
          protectedBoundary: 'core-contract',
        }).action
      ).toBe('REUSE_OR_EXTEND');

      expect(
        decideTestAction({
          uncoveredBoundary: false,
          existingTestFailsForMistake: false,
          freezesNonContractualOutput: true,
          duplicateSamePathCount: 0,
          sharedRuleMatrixAcrossEntrypoints: false,
          isCostly: false,
          protectsDistinctRisk: true,
          contractEndedOrRemoved: false,
          ownershipOrExpectationUnclear: false,
          protectedBoundary: 'core-contract',
        }).action
      ).toBe('RELAX_TO_CONTRACT_PROPERTIES');

      expect(
        decideTestAction({
          uncoveredBoundary: false,
          existingTestFailsForMistake: false,
          freezesNonContractualOutput: false,
          duplicateSamePathCount: 4,
          sharedRuleMatrixAcrossEntrypoints: false,
          isCostly: false,
          protectsDistinctRisk: false,
          contractEndedOrRemoved: false,
          ownershipOrExpectationUnclear: false,
          protectedBoundary: 'incidental',
        }).action
      ).toBe('CONSOLIDATE_DUPLICATES');

      expect(
        decideTestAction({
          uncoveredBoundary: false,
          existingTestFailsForMistake: false,
          freezesNonContractualOutput: false,
          duplicateSamePathCount: 0,
          sharedRuleMatrixAcrossEntrypoints: true,
          isCostly: true,
          protectsDistinctRisk: true,
          contractEndedOrRemoved: false,
          ownershipOrExpectationUnclear: false,
          protectedBoundary: 'core-contract',
        }).action
      ).toBe('FACTOR_SHARED_RULE_MATRIX');

      expect(
        decideTestAction({
          uncoveredBoundary: false,
          existingTestFailsForMistake: false,
          freezesNonContractualOutput: false,
          duplicateSamePathCount: 0,
          sharedRuleMatrixAcrossEntrypoints: false,
          isCostly: true,
          protectsDistinctRisk: true,
          contractEndedOrRemoved: false,
          ownershipOrExpectationUnclear: false,
          protectedBoundary: 'data-integrity',
        }).action
      ).toBe('PRESERVE_AND_TIER_BY_RISK');

      expect(
        decideTestAction({
          uncoveredBoundary: false,
          existingTestFailsForMistake: false,
          freezesNonContractualOutput: false,
          duplicateSamePathCount: 0,
          sharedRuleMatrixAcrossEntrypoints: false,
          isCostly: false,
          protectsDistinctRisk: false,
          contractEndedOrRemoved: true,
          remainingConsumersCount: 0,
          ownershipOrExpectationUnclear: false,
          protectedBoundary: 'incidental',
        }).action
      ).toBe('RETIRE_OBSOLETE');

      expect(
        decideTestAction({
          uncoveredBoundary: false,
          existingTestFailsForMistake: false,
          freezesNonContractualOutput: false,
          duplicateSamePathCount: 0,
          sharedRuleMatrixAcrossEntrypoints: false,
          isCostly: false,
          protectsDistinctRisk: false,
          contractEndedOrRemoved: false,
          ownershipOrExpectationUnclear: true,
          protectedBoundary: 'core-contract',
        }).action
      ).toBe('RETAIN_AWAITING_EVIDENCE');
    });

    test('blocks RETIRE_OBSOLETE when remaining consumers still exist', () => {
      const decision = decideTestAction({
        uncoveredBoundary: false,
        existingTestFailsForMistake: false,
        freezesNonContractualOutput: false,
        duplicateSamePathCount: 0,
        sharedRuleMatrixAcrossEntrypoints: false,
        isCostly: false,
        protectsDistinctRisk: false,
        contractEndedOrRemoved: true,
        remainingConsumersCount: 2,
        ownershipOrExpectationUnclear: false,
        protectedBoundary: 'compatibility',
      });
      expect(decision.action).toBe('RETAIN_AWAITING_EVIDENCE');
      expect(decision.rationale).toContain('consumer');
    });
  });

  describe('4. Failure Diagnosis & Differential Discrimination (SKILL.md:16, 49-59)', () => {
    test('classifies product regressions, obsolete assertions, environment failures, and unstable tests', () => {
      const reg = diagnoseTestFailure({
        testName: 'rejects symlinked .fable boundary',
        errorMessage: 'Expected symlink escape to throw, but write succeeded',
        protectedOutcome: 'Prevent arbitrary file overwrite outside workspace',
        contractChanged: false,
        environmentAvailable: true,
        intermittentOnRetry: false,
      });
      expect(reg.classification).toBe('product-regression');
      expect(reg.allowRetryAsPass).toBe(false);

      const env = diagnoseTestFailure({
        testName: 'renders Chromium headless PDF',
        errorMessage: 'browserType.launch: Executable doesnt exist at /ms-playwright/chromium',
        protectedOutcome: 'Real browser PDF export layout',
        contractChanged: false,
        environmentAvailable: false,
        intermittentOnRetry: false,
      });
      expect(env.classification).toBe('environment-failure');
      expect(env.allowMockSubstitute).toBe(false);

      const flaky = diagnoseTestFailure({
        testName: 'waits for background worker socket',
        errorMessage: 'Timeout 50ms exceeded before port file written',
        protectedOutcome: 'Worker readiness handshake',
        contractChanged: false,
        environmentAvailable: true,
        intermittentOnRetry: true,
      });
      expect(flaky.classification).toBe('unstable-test');
      expect(flaky.allowRetryAsPass).toBe(false);
      expect(flaky.remediation).toContain('readiness');
    });

    test('verifies differential discrimination for relaxed assertions', () => {
      const good = verifyDiscrimination({
        testId: 'route-bend-properties',
        validAlternativeTested: true,
        validAlternativePassed: true,
        originalBadResultTested: true,
        originalBadResultFailed: true,
      });
      expect(good.discriminates).toBe(true);

      const overRelaxed = verifyDiscrimination({
        testId: 'route-bend-properties',
        validAlternativeTested: true,
        validAlternativePassed: true,
        originalBadResultTested: true,
        originalBadResultFailed: false,
      });
      expect(overRelaxed.discriminates).toBe(false);
      expect(overRelaxed.reason).toContain('original bad result');
    });

    test('validates CutBoundaryRecord and fails closed on missing surviving evidence or bulk-skip concealment', () => {
      const validCut = validateCutBoundaryRecord({
        burden: '22 icons x 5 entrypoints = 110 redundant DOM renders taking 14.2s per run',
        existingProtection: 'Icon SVG path catalog and entrypoint prop forwarding across 5 wrappers',
        change: 'Consolidate full 22-icon catalog into 1 shared renderer test; keep default/override/hidden cases on each of the 5 entrypoints',
        survivingEvidence: 'test/icons-shared.test.ts verifies all 22 SVG paths; test/entrypoints.test.ts verifies all 5 wrapper contracts',
        intentionallyRemovedCombinations: ['18 intermediate icon variants across 4 secondary wrappers with zero custom branch logic'],
        verification: 'bun test test/icons-shared.test.ts test/entrypoints.test.ts (37 pass in 1.1s vs 14.2s baseline)',
      });
      expect(validCut.valid).toBe(true);
      expect(validCut.errors).toEqual([]);

      const badCut = validateCutBoundaryRecord({
        burden: 'Slow test',
        existingProtection: 'Auth check',
        change: 'Added test.skip to all failing auth checks to speed up CI',
        survivingEvidence: '',
        verification: '',
      });
      expect(badCut.valid).toBe(false);
      expect(badCut.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('5. Static & AST-Pattern Test Suite Auditor (references/audit.md & decision-examples.md)', () => {
    test('detects brittle test traps in synthetic test code while recognizing protected boundaries', () => {
      const readSrcFn = ['fs', 'readFileSync'].join('.');
      const sleepTimerFn = ['set', 'Timeout'].join('');
      const brittleCode = `
        import { test, expect, mock } from 'bun:test';
        import fs from 'node:fs';

        test('checks source spelling of helper', () => {
          const src = ${readSrcFn}('src/core/router.ts', 'utf-8');
          expect(src).toContain('function privateHelper');
        });

        test('waits with arbitrary sleep and only checks mock call count', async () => {
          await new Promise((r) => ${sleepTimerFn}(r, 250));
          const fn = mock(() => {});
          fn();
          expect(fn).toHaveBeenCalledTimes(1);
        });
      `;

      const report = analyzeTestFileContent('test/synthetic-brittle.test.ts', brittleCode);
      expect(report.testCount).toBe(2);
      const trapKinds = report.traps.map((t) => t.kind);
      expect(trapKinds).toContain('source-spelling-assertion');
      expect(trapKinds).toContain('sleep-timing-assumption');
      expect(trapKinds).toContain('mock-only-verification');
      expect(report.refactorResilienceScore).toBeLessThan(70);
    });

    test('distinguishes legitimate supply-chain/packaging static rules from brittle source-spelling assertions', () => {
      const supplyChainCode = `
        import { test, expect } from 'bun:test';
        import fs from 'node:fs';

        test('pins all GitHub Actions to 40-char commit SHAs', () => {
          const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf-8');
          expect(workflow).toMatch(/uses:\\s+[^@]+@[0-9a-f]{40}/);
        });
      `;

      const report = analyzeTestFileContent('test/ci-supply-chain.test.ts', supplyChainCode);
      expect(report.traps.some((t) => t.kind === 'source-spelling-assertion')).toBe(false);
      expect(report.protectedBoundaries).toContain('permissions-trust-boundary');
      expect(report.responsibilityGroup).toBe('distribution-installation');
    });

    test('audits a directory of test files and aggregates responsibility groups and net value', () => {
      const dir = makeTempDir();
      const testDir = path.join(dir, 'test');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        path.join(testDir, 'state-integrity.test.ts'),
        `
        import { test, expect } from 'bun:test';
        import { validateFableState } from '../src/core/state.ts';
        test('rejects corrupted state revision and preserves workspaceId boundary', () => {
          expect(() => validateFableState({ schemaVersion: 3 }, '/tmp')).toThrow('stateRevision');
        });
        `
      );

      const summary = auditTestSuite(dir, ['test/state-integrity.test.ts']);
      expect(summary.totalFiles).toBe(1);
      expect(summary.totalTests).toBe(1);
      expect(summary.files[0].protectedBoundaries).toContain('data-integrity');
      expect(summary.averageNetValueScore).toBeGreaterThan(50);
    });
  });

  describe('6. Risk-Proportional Test Selector & Shard Coverage Verifier (audit.md:25-45)', () => {
    test('maps changed files to risk tiers, affected test files, and fails closed on unmapped code paths', () => {
      const repoRoot = path.resolve(import.meta.dir, '..');

      // Pure docs change -> zero selection justified
      const docsSelection = selectTestsByRisk(repoRoot, ['docs/USAGE.md']);
      expect(docsSelection.zeroSelectionJustified).toBe(true);
      expect(docsSelection.affectedTestFiles).toEqual([]);

      // Leaf feature change -> targeted daily/expanded feedback
      const toonSelection = selectTestsByRisk(repoRoot, ['src/core/toon.ts']);
      expect(toonSelection.zeroSelectionJustified).toBe(false);
      expect(toonSelection.affectedTestFiles).toContain('test/toon.test.ts');
      expect(toonSelection.affectedTestFiles.length).toBeLessThan(25);

      // Core state change -> escalates to complete-verification
      const stateSelection = selectTestsByRisk(repoRoot, ['src/core/state.ts']);
      expect(stateSelection.riskTier).toBe('complete-verification');
      expect(stateSelection.requiresCompleteSuite).toBe(true);

      // Unknown executable path -> recorded in unmappedPaths (never silently skipped!)
      const unknownSelection = selectTestsByRisk(repoRoot, ['src/core/unmapped-mystery-module.ts']);
      expect(unknownSelection.unmappedPaths).toContain('src/core/unmapped-mystery-module.ts');
      expect(unknownSelection.zeroSelectionJustified).toBe(false);
    });

    test('verifies CI test shard union completeness and intersection disjointness', () => {
      const inventory = ['a.test.ts', 'b.test.ts', 'c.test.ts', 'd.test.ts'];
      const validShards = verifyShardCoverage(inventory, [
        { shardId: 'shard-1', files: ['a.test.ts', 'b.test.ts'], measuredDurationMs: 1200 },
        { shardId: 'shard-2', files: ['c.test.ts', 'd.test.ts'], measuredDurationMs: 1150 },
      ]);
      expect(validShards.valid).toBe(true);
      expect(validShards.missingFiles).toEqual([]);
      expect(validShards.duplicateFiles).toEqual([]);

      const leakyShards = verifyShardCoverage(inventory, [
        { shardId: 'shard-1', files: ['a.test.ts', 'b.test.ts'], measuredDurationMs: 1200 },
        { shardId: 'shard-2', files: ['b.test.ts'], measuredDurationMs: 600 },
      ]);
      expect(leakyShards.valid).toBe(false);
      expect(leakyShards.missingFiles).toEqual(['c.test.ts', 'd.test.ts']);
      expect(leakyShards.duplicateFiles).toEqual(['b.test.ts']);
    });
  });

  describe('7. Zero-Selection Guard, Timing Attribution & Evidence Reuse (SKILL.md:63-69)', () => {
    test('fails closed on accidental zero-test execution even when exitCode is 0', () => {
      const zeroRun = parseTestRunnerOutput(
        'bun test v1.3.0\n0 pass\n0 fail\nRan 0 tests across 0 files. [4.00ms]',
        '',
        0,
        4,
        { zeroSelectionJustified: false }
      );
      expect(zeroRun.passed).toBe(false);
      expect(zeroRun.verdict).toBe('INVALID_ZERO_SELECTION');

      const justifiedZeroRun = parseTestRunnerOutput(
        '0 pass\n0 fail\nRan 0 tests across 0 files.',
        '',
        0,
        4,
        { zeroSelectionJustified: true, zeroSelectionReason: 'Pure documentation edit in docs/USAGE.md' }
      );
      expect(justifiedZeroRun.passed).toBe(true);
      expect(justifiedZeroRun.verdict).toBe('ZERO_SELECTION_JUSTIFIED');
    });

    test('parses passing run and attributes critical-path vs total compute timing accurately', () => {
      const stdout = [
        'bun test v1.3.0',
        'test/toon.test.ts:',
        '✓ encodes toon [12.00ms]',
        '✓ decodes toon [8.00ms]',
        ' 2 pass',
        ' 0 fail',
        ' 5 expect() calls',
        'Ran 2 tests across 1 files. [25.00ms]',
      ].join('\n');

      const parsed = parseTestRunnerOutput(stdout, '', 0, 25, { zeroSelectionJustified: false });
      expect(parsed.passed).toBe(true);
      expect(parsed.verdict).toBe('PASS');
      expect(parsed.passedCount).toBe(2);
      expect(parsed.failedCount).toBe(0);
      expect(parsed.totalExecuted).toBe(2);
      expect(parsed.timing.caseTimeMs).toBe(20);
      expect(parsed.timing.wallClockCriticalPathMs).toBe(25);
    });

    test('evaluates whether prior verification evidence can be reused for current generation and revision', () => {
      const reuseOk = canReuseVerificationEvidence(
        {
          kind: 'test',
          source: 'bun test test/toon.test.ts',
          result: 'pass',
          detail: '2 pass',
          generation: 4,
          timestamp: '2026-10-10T12:00:00.000Z',
          workspaceId: 'ws-123',
          repositoryRevision: 'rev-abc',
          scope: 'test/toon.test.ts',
        },
        {
          mutationGeneration: 4,
          workspaceId: 'ws-123',
          repositoryRevision: 'rev-abc',
          requiredScope: 'test/toon.test.ts',
        }
      );
      expect(reuseOk.reusable).toBe(true);

      const staleGen = canReuseVerificationEvidence(
        {
          kind: 'test',
          source: 'bun test test/toon.test.ts',
          result: 'pass',
          detail: '2 pass',
          generation: 3,
          timestamp: '2026-10-10T12:00:00.000Z',
          workspaceId: 'ws-123',
          repositoryRevision: 'rev-abc',
          scope: 'test/toon.test.ts',
        },
        {
          mutationGeneration: 4,
          workspaceId: 'ws-123',
          repositoryRevision: 'rev-abc',
          requiredScope: 'test/toon.test.ts',
        }
      );
      expect(staleGen.reusable).toBe(false);
      expect(staleGen.reason).toContain('mutationGeneration');
    });
  });

  describe('8. Spearhead Pipeline & CLI Integration (`get-fable test-value` / `get-fable spearhead`)', () => {
    test('runs spearhead pipeline in dry-run and live execution modes and stamps evidence', () => {
      const repoRoot = path.resolve(import.meta.dir, '..');
      const report = runSpearheadPipeline({
        projectDir: repoRoot,
        changedFiles: ['src/core/toon.ts'],
        execute: false,
      });

      expect(report.selection.affectedTestFiles).toContain('test/toon.test.ts');
      expect(report.audit.totalFiles).toBeGreaterThanOrEqual(1);
      expect(report.reaProvenance.treeSha).toBe('e3fb8a7f0950b661fab0993a06306096797dca3f');
    });

    test('exposes test-value and spearhead CLI subcommands with --json-v1 envelopes', async () => {
      const provRes = await captureConsole(() => runCli(['test-value', 'provenance', '--json-v1']));
      expect(provRes.code).toBe(0);
      const provJson = JSON.parse(provRes.output);
      expect(provJson.schemaVersion).toBe(1);
      expect(provJson.command).toBe('test-value:provenance');
      expect(provJson.data.sourceRepository).toBe('https://github.com/tt-a1i/test-value');

      const selectRes = await captureConsole(() =>
        runCli(['test-value', 'select', 'src/core/toon.ts', '--json-v1'])
      );
      expect(selectRes.code).toBe(0);
      const selectJson = JSON.parse(selectRes.output);
      expect(selectJson.data.affectedTestFiles).toContain('test/toon.test.ts');

      const auditRes = await captureConsole(() =>
        runCli(['test-value', 'audit', 'test/toon.test.ts', '--json-v1'])
      );
      expect(auditRes.code).toBe(0);
      const auditJson = JSON.parse(auditRes.output);
      expect(auditJson.data.totalFiles).toBe(1);

      const spearheadRes = await captureConsole(() =>
        runCli(['spearhead', 'src/core/toon.ts', '--json-v1'])
      );
      expect(spearheadRes.code).toBe(0);
      const spearheadJson = JSON.parse(spearheadRes.output);
      expect(spearheadJson.command).toBe('test-value:spearhead');
      expect(spearheadJson.data.selection.affectedTestFiles).toContain('test/toon.test.ts');
    });

    test('records passing Fable test evidence when spearhead --execute --record-evidence runs in an initialized workspace', async () => {
      const dir = makeTempDir();
      initProjectFable(dir);
      fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'test'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'src', 'math.ts'), 'export const add = (a: number, b: number) => a + b;\n');
      fs.writeFileSync(
        path.join(dir, 'test', 'math.test.ts'),
        `import { test, expect } from 'bun:test';\nimport { add } from '../src/math.ts';\ntest('adds numbers', () => { expect(add(2, 3)).toBe(5); });\n`
      );

      const prev = process.cwd();
      process.chdir(dir);
      try {
        await captureConsole(() => runCli(['state', 'executing', '--substantial', '--json']));
        await captureConsole(() => runCli(['mutation', 'added math.ts', '--json']));
        await captureConsole(() => runCli(['state', 'verifying', '--json']));

        const res = await captureConsole(() =>
          runCli(['spearhead', 'src/math.ts', '--execute', '--record-evidence', '--json-v1'])
        );
        expect(res.code).toBe(0);
        const payload = JSON.parse(res.output);
        expect(payload.data.execution.passed).toBe(true);
        expect(payload.data.evidenceRecorded).toBe(true);

        const state = JSON.parse(fs.readFileSync(path.join(dir, '.fable', 'state.json'), 'utf-8'));
        expect(state.verifiedGeneration).toBe(state.mutationGeneration);
        expect(state.evidence.some((e: any) => e.kind === 'test' && e.result === 'pass')).toBe(true);
      } finally {
        process.chdir(prev);
      }
    });
  });
});
