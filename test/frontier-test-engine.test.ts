import { describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  FRONTIER_TEST_REA_EVIDENCE_LEDGER,
  FrontierTestOrchestrator,
  MidsceneAdapter,
  KeployAdapter,
  DistributedE2EAdapter,
  TesterArmyAdapter,
  MinimalReproAdapter,
  NativeRunnerAdapter,
  scanRepository,
  synthesizeFrontierEvidence,
  type ToolRunResult
} from '../src/core/frontier-test/index.js';
import { runFrontierTestCommand } from '../src/cli/commands/frontier-test.js';
import { runDoctor } from '../src/core/doctor.js';

describe('Fable Frontier Testing Engine (Super-Agentic Multi-Tool Platform)', () => {
  // --------------------------------------------------------------------------
  // 1. REA Evidence Ledger & Provenance Contract
  // --------------------------------------------------------------------------
  describe('1. REA Evidence Ledger & Provenance Contract', () => {
    it('records all 5 studied upstream repositories with 64-char SHA-256 digests', () => {
      const repos = FRONTIER_TEST_REA_EVIDENCE_LEDGER.repositories;
      expect(Object.keys(repos).length).toBe(5);

      expect(repos['midscene'].url).toBe('https://github.com/web-infra-dev/midscene');
      expect(repos['keploy'].url).toBe('https://github.com/keploy/keploy');
      expect(repos['efficientgo-e2e'].url).toBe('https://github.com/efficientgo/e2e');
      expect(repos['tester-army-e2e'].url).toBe('https://github.com/tester-army/e2e');
      expect(repos['cypress-test-tiny'].url).toBe('https://github.com/cypress-io/cypress-test-tiny');

      for (const [name, repo] of Object.entries(repos)) {
        expect(repo.artifacts.length).toBeGreaterThanOrEqual(1);
        for (const art of repo.artifacts) {
          expect(art.sha256).toMatch(/^[0-9a-f]{64}$/);
          expect(art.verifiedSymbols.length).toBeGreaterThan(0);
          expect(art.coreInnovation.length).toBeGreaterThan(20);
        }
      }

      expect(FRONTIER_TEST_REA_EVIDENCE_LEDGER.cleanRoomAdaptation).toBe(true);
      expect(FRONTIER_TEST_REA_EVIDENCE_LEDGER.corePhilosophy).toContain('Do not reinvent the wheel');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Repository Topology Scanner & Tool Readiness Assessor
  // --------------------------------------------------------------------------
  describe('2. Repository Topology Scanner (scanner.ts)', () => {
    it('scans current workspace and detects languages, package manager, and recommendations', () => {
      const result = scanRepository(process.cwd());
      expect(result.packageManager).toBe('bun');
      expect(result.detectedLanguages).toContain('typescript');
      expect(result.recommendedTools.length).toBeGreaterThanOrEqual(3);

      const topRec = result.recommendedTools[0];
      expect(topRec.score).toBeGreaterThanOrEqual(80);
      expect(topRec.reason.length).toBeGreaterThan(10);
    });

    it('recommends Keploy for backend APIs and Distributed-E2E for compose projects in synthetic workspace', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'fable-scan-test-'));
      try {
        writeFileSync(join(tmp, 'package.json'), JSON.stringify({
          name: 'api-service',
          dependencies: { express: '^4.19.0', pg: '^8.11.0' }
        }));
        writeFileSync(join(tmp, 'docker-compose.yml'), 'version: "3.8"\nservices: {}\n');

        const result = scanRepository(tmp);
        expect(result.projectType).toBe('microservices');
        expect(result.hasCompose).toBe(true);
        expect(result.detectedFrameworks).toContain('express');

        const keployRec = result.recommendedTools.find((r) => r.toolId === 'keploy');
        expect(keployRec).toBeDefined();
        expect(keployRec?.score).toBe(96);

        const distRec = result.recommendedTools.find((r) => r.toolId === 'distributed-e2e');
        expect(distRec).toBeDefined();
        expect(distRec?.score).toBe(92);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 3. Midscene Adapter (web-infra-dev/midscene)
  // --------------------------------------------------------------------------
  describe('3. Midscene Adapter', () => {
    it('scaffolds midscene.config.ts, playwright agent spec, and declarative YAML runner', async () => {
      const tmp = mkdtempSync(join(tmpdir(), 'fable-midscene-test-'));
      try {
        const adapter = new MidsceneAdapter();
        const res = await adapter.scaffold(tmp, {
          toolId: 'midscene',
          targetUrl: 'http://localhost:8080',
          scenarioName: 'Cart Checkout Flow'
        });

        expect(res.success).toBe(true);
        expect(existsSync(join(tmp, 'midscene.config.ts'))).toBe(true);
        expect(existsSync(join(tmp, 'tests', 'midscene', 'visual-flow.spec.ts'))).toBe(true);
        expect(existsSync(join(tmp, 'tests', 'midscene', 'flow.yaml'))).toBe(true);

        const yamlContent = readFileSync(join(tmp, 'tests', 'midscene', 'flow.yaml'), 'utf-8');
        expect(yamlContent).toContain('aiAct:');
        expect(yamlContent).toContain('aiAssert:');

        // Dry-run execution
        const runRes = await adapter.run(tmp, { toolId: 'midscene', mode: 'dry-run' });
        expect(runRes.passed).toBe(true);
        expect(runRes.totalTests).toBe(1);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 4. Keploy Adapter (keploy/keploy)
  // --------------------------------------------------------------------------
  describe('4. Keploy Adapter', () => {
    it('scaffolds keploy.yml and starter mock test-set', async () => {
      const tmp = mkdtempSync(join(tmpdir(), 'fable-keploy-test-'));
      try {
        const adapter = new KeployAdapter();
        const res = await adapter.scaffold(tmp, {
          toolId: 'keploy',
          apiPort: 4000,
          scenarioName: 'bun run start:server'
        });

        expect(res.success).toBe(true);
        expect(existsSync(join(tmp, 'keploy.yml'))).toBe(true);
        expect(existsSync(join(tmp, 'keploy', 'test-set-0', 'tests', 'test-1.yaml'))).toBe(true);

        const ymlContent = readFileSync(join(tmp, 'keploy.yml'), 'utf-8');
        expect(ymlContent).toContain('port: 4000');
        expect(ymlContent).toContain('command: "bun run start:server"');

        // Dry-run execution
        const runRes = await adapter.run(tmp, { toolId: 'keploy', mode: 'dry-run' });
        expect(runRes.passed).toBe(true);
        expect(runRes.totalTests).toBe(1);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 5. Distributed E2E Adapter (efficientgo/e2e)
  // --------------------------------------------------------------------------
  describe('5. Distributed E2E Adapter', () => {
    it('scaffolds fable.distributed-e2e.json with readiness probes and metric assertions', async () => {
      const tmp = mkdtempSync(join(tmpdir(), 'fable-dist-test-'));
      try {
        const adapter = new DistributedE2EAdapter();
        const res = await adapter.scaffold(tmp, {
          toolId: 'distributed-e2e',
          scenarioName: 'Ingress to Storage Mesh',
          dockerImage: 'node:20-alpine'
        });

        expect(res.success).toBe(true);
        expect(existsSync(join(tmp, 'fable.distributed-e2e.json'))).toBe(true);
        expect(existsSync(join(tmp, 'docker-compose.test.yml'))).toBe(true);

        const config = JSON.parse(readFileSync(join(tmp, 'fable.distributed-e2e.json'), 'utf-8'));
        expect(config.services.length).toBe(2);
        expect(config.services[0].readiness.type).toBe('http');
        expect(config.metricAssertions[0].metricName).toBe('http_requests_total');

        // Dry-run execution
        const runRes = await adapter.run(tmp, { toolId: 'distributed-e2e', mode: 'dry-run' });
        expect(runRes.passed).toBe(true);
        expect(runRes.totalTests).toBe(1);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 6. Tester-Army E2E Adapter (tester-army/e2e)
  // --------------------------------------------------------------------------
  describe('6. Tester-Army E2E Adapter', () => {
    it('scaffolds e2e.config.ts and natural language test spec with action cache', async () => {
      const tmp = mkdtempSync(join(tmpdir(), 'fable-army-test-'));
      try {
        const adapter = new TesterArmyAdapter();
        const res = await adapter.scaffold(tmp, {
          toolId: 'tester-army',
          targetUrl: 'http://localhost:5173',
          scenarioName: 'User Onboarding'
        });

        expect(res.success).toBe(true);
        expect(existsSync(join(tmp, 'e2e.config.ts'))).toBe(true);
        expect(existsSync(join(tmp, 'tests', 'e2e', 'journey.e2e.ts'))).toBe(true);
        expect(existsSync(join(tmp, '.e2e', 'cache'))).toBe(true);

        const specContent = readFileSync(join(tmp, 'tests', 'e2e', 'journey.e2e.ts'), 'utf-8');
        expect(specContent).toContain('agent.act');
        expect(specContent).toContain('agent.assert');

        // Dry-run execution
        const runRes = await adapter.run(tmp, { toolId: 'tester-army', mode: 'dry-run' });
        expect(runRes.passed).toBe(true);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 7. Minimal Repro Adapter (cypress-io/cypress-test-tiny)
  // --------------------------------------------------------------------------
  describe('7. Minimal Repro Adapter', () => {
    it('scaffolds minimal cypress.config.js and spec.cy.js for defect isolation', async () => {
      const tmp = mkdtempSync(join(tmpdir(), 'fable-repro-test-'));
      try {
        const adapter = new MinimalReproAdapter();
        const res = await adapter.scaffold(tmp, {
          toolId: 'minimal-repro',
          scenarioName: 'Reproduce Cart State Loss'
        });

        expect(res.success).toBe(true);
        expect(existsSync(join(tmp, 'cypress.config.js'))).toBe(true);
        expect(existsSync(join(tmp, 'cypress', 'e2e', 'spec.cy.js'))).toBe(true);

        // Dry-run execution
        const runRes = await adapter.run(tmp, { toolId: 'minimal-repro', mode: 'dry-run' });
        expect(runRes.passed).toBe(true);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 8. Super-Agentic Frontier Test Orchestrator
  // --------------------------------------------------------------------------
  describe('8. Frontier Test Orchestrator (orchestrator.ts)', () => {
    it('lists all 14 registered capabilities and generates multi-layer verification plan', () => {
      const orchestrator = new FrontierTestOrchestrator();
      const capabilities = orchestrator.listCapabilities(process.cwd());
      expect(capabilities.length).toBe(14);

      // Verify that all 6 new open-agent skills are registered
      const skillIds = [
        'playwright-cli',
        'webapp-testing',
        'playwright-best-practices',
        'browser-testing-with-devtools',
        'e2e-testing-patterns',
        'vitest-midscene-e2e'
      ];
      for (const id of skillIds) {
        expect(capabilities.find((c) => c.id === id)).toBeDefined();
      }

      const plan = orchestrator.plan(process.cwd(), 'Verify full system stability');
      expect(plan.selectedTools.length).toBeGreaterThan(0);
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.executionOrder.length).toBe(plan.selectedTools.length);
    });

    it('scaffolds and runs newly integrated skill adapters in dry-run mode', async () => {
      const tmp = mkdtempSync(join(tmpdir(), 'fable-skills-adapter-test-'));
      try {
        const orchestrator = new FrontierTestOrchestrator();
        const res1 = await orchestrator.provision(tmp, 'playwright-best-practices');
        expect(res1.success).toBe(true);

        const res2 = await orchestrator.provision(tmp, 'browser-testing-with-devtools');
        expect(res2.success).toBe(true);

        const runDevtools = await orchestrator.run(tmp, 'browser-testing-with-devtools');
        expect(runDevtools.passed).toBe(true);

        const runBestPractices = await orchestrator.run(tmp, 'playwright-best-practices');
        expect(runBestPractices.passed).toBe(true);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('executes a plan in dry-run mode and aggregates multi-tool results', async () => {
      const tmp = mkdtempSync(join(tmpdir(), 'fable-orch-test-'));
      try {
        const orchestrator = new FrontierTestOrchestrator();
        const plan = orchestrator.plan(tmp, 'Integration test run');

        const execution = await orchestrator.runPlan(tmp, plan, true);
        expect(execution.allPassed).toBe(true);
        expect(execution.results.length).toBe(plan.executionOrder.length);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 9. Evidence Bridge & Test-Value Integration
  // --------------------------------------------------------------------------
  describe('9. Evidence Bridge (evidence-bridge.ts)', () => {
    it('synthesizes passing Fable evidence with digest and attributes', () => {
      const sampleRun: ToolRunResult = {
        toolId: 'midscene',
        command: 'bunx midscene-test tests/midscene/flow.yaml',
        exitCode: 0,
        passed: true,
        totalTests: 4,
        passedTests: 4,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 1420,
        stdout: '4 passed in 1.42s',
        stderr: '',
        artifactPaths: ['.midscene/reports/index.html']
      };

      const synthesis = synthesizeFrontierEvidence(sampleRun, 5);
      expect(synthesis.pass).toBe(true);
      expect(synthesis.kind).toBe('test');
      expect(synthesis.evidenceRecord.generation).toBe(5);
      expect(synthesis.evidenceRecord.source).toBe('frontier-test:midscene');
      expect(synthesis.evidenceRecord.detail).toContain('Digest: sha256:');
    });

    it('fails closed when 0 tests run even if exitCode is 0 (Test-Value Spearhead zero-selection guard)', () => {
      const zeroRun: ToolRunResult = {
        toolId: 'bun-test',
        command: 'bun test --filter non-existent',
        exitCode: 0,
        passed: true,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 45,
        stdout: '0 pass, 0 fail',
        stderr: '',
        artifactPaths: []
      };

      const synthesis = synthesizeFrontierEvidence(zeroRun, 2);
      expect(synthesis.pass).toBe(false);
      expect(synthesis.summary).toContain('Zero tests executed');
    });
  });

  // --------------------------------------------------------------------------
  // 10. CLI Command Integration (`get-fable test-engine`)
  // --------------------------------------------------------------------------
  describe('10. CLI Command Integration (test-engine)', () => {
    it('executes status, scan, plan, provenance, repro with --json-v1 envelopes', async () => {
      expect(await runFrontierTestCommand(['status', '--json-v1'])).toBe(0);
      expect(await runFrontierTestCommand(['scan', '--json-v1'])).toBe(0);
      expect(await runFrontierTestCommand(['plan', 'e2e verify', '--json-v1'])).toBe(0);
      expect(await runFrontierTestCommand(['provenance', '--json-v1'])).toBe(0);
    });

    it('executes install and run in dry-run mode via CLI', async () => {
      const tmp = mkdtempSync(join(tmpdir(), 'fable-cli-run-'));
      const origCwd = process.cwd();
      try {
        process.chdir(tmp);
        expect(await runFrontierTestCommand(['install', 'midscene'])).toBe(0);
        expect(await runFrontierTestCommand(['run', 'midscene', '--dry-run'])).toBe(0);
        expect(await runFrontierTestCommand(['repro', 'Cart bug'])).toBe(0);
      } finally {
        process.chdir(origCwd);
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 11. Zero-Decision Autonomous Auto-Pilot Engine (autoExecute & CLI default)
  // --------------------------------------------------------------------------
  describe('11. Zero-Decision Autonomous Auto-Pilot Engine', () => {
    it('autonomously analyzes topology, provisions adapters, executes tests, and stamps evidence without user input', async () => {
      const tmp = mkdtempSync(join(tmpdir(), 'fable-auto-pilot-test-'));
      try {
        // Setup synthetic project
        writeFileSync(join(tmp, 'package.json'), JSON.stringify({
          name: 'auto-service',
          dependencies: { express: '^4.19.0' }
        }));
        const fableDir = join(tmp, '.fable');
        mkdirSync(fableDir, { recursive: true });
        writeFileSync(join(fableDir, 'state.json'), JSON.stringify({
          schemaVersion: 3,
          phase: 'executing',
          mutationGeneration: 10,
          verifiedGeneration: 9,
          evidence: []
        }));

        const orchestrator = new FrontierTestOrchestrator();
        const autoResult = await orchestrator.autoExecute(tmp, {
          mode: 'dry-run',
          maxTools: 2,
          recordEvidence: true,
          autoProvision: true
        });

        expect(autoResult.overallPassed).toBe(true);
        expect(autoResult.scan.detectedFrameworks).toContain('express');
        expect(autoResult.executedTools.length).toBe(2);
        expect(autoResult.provisionedTools.length).toBeGreaterThan(0);
        expect(autoResult.results.length).toBe(2);
        expect(autoResult.autonomousActions.length).toBeGreaterThanOrEqual(4);
        expect(autoResult.evidenceStamped).toBe(true);

        // Verify evidence was stamped into .fable/state.json
        const updatedState = JSON.parse(readFileSync(join(fableDir, 'state.json'), 'utf-8'));
        expect(updatedState.evidence.length).toBe(2);
        expect(updatedState.verifiedGeneration).toBe(10);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('defaults CLI command to auto mode without user action selection', async () => {
      const tmp = mkdtempSync(join(tmpdir(), 'fable-cli-auto-'));
      const origCwd = process.cwd();
      try {
        process.chdir(tmp);
        writeFileSync(join(tmp, 'package.json'), JSON.stringify({ name: 'cli-test', type: 'module' }));

        // Calling with empty args defaults to auto
        const code1 = await runFrontierTestCommand(['--dry-run', '--json-v1']);
        expect(code1).toBe(0);

        // Explicit auto command
        const code2 = await runFrontierTestCommand(['auto', '--dry-run', '--json-v1']);
        expect(code2).toBe(0);
      } finally {
        process.chdir(origCwd);
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 12. Doctor Check Integration
  // --------------------------------------------------------------------------
  describe('12. Doctor Check Integration', () => {
    it('verifies that doctor report includes passing frontier-test-engine check', () => {
      const report = runDoctor();
      const frontierCheck = report.checks.find((c) => c.id === 'frontier-test-engine');
      expect(frontierCheck).toBeDefined();
      expect(frontierCheck?.status).toBe('PASS');
      expect(frontierCheck?.message).toContain('Frontier Testing Engine active');
    }, 30000);
  });
});

