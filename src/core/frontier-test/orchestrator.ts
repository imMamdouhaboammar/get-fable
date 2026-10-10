/**
 * Fable Frontier Testing Engine — Super-Agentic Orchestrator & Tool Registry
 *
 * Coordinates best-of-breed testing tools without reinventing the wheel:
 * - Discovers project needs
 * - Selects and provisions the right tools
 * - Executes tests across multiple layers (Unit -> API Mock -> Vision E2E -> Distributed Mesh)
 * - Emits unified test diagnostics and failure classifications
 */

import { BaseFrontierAdapter } from './adapters/base.js';
import { MidsceneAdapter } from './adapters/midscene.js';
import { KeployAdapter } from './adapters/keploy.js';
import { DistributedE2EAdapter } from './adapters/distributed-e2e.js';
import { TesterArmyAdapter } from './adapters/tester-army.js';
import { MinimalReproAdapter } from './adapters/minimal-repro.js';
import { NativeRunnerAdapter } from './adapters/native-runner.js';
import {
  PlaywrightCliSkillAdapter,
  WebappTestingSkillAdapter,
  PlaywrightBestPracticesSkillAdapter,
  BrowserDevtoolsSkillAdapter,
  E2eTestingPatternsSkillAdapter,
  VitestMidsceneSkillAdapter
} from './adapters/skill-adapters.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanRepository } from './scanner.js';
import { synthesizeFrontierEvidence } from './evidence-bridge.js';
import type {
  FrontierToolId,
  ToolCapability,
  ProjectScanResult,
  FrontierOrchestratorPlan,
  ScaffoldOptions,
  ScaffoldResult,
  ToolRunOptions,
  ToolRunResult,
  AutoExecuteOptions,
  AutoExecuteResult
} from './types.js';

export class FrontierTestOrchestrator {
  private readonly adapters = new Map<FrontierToolId, BaseFrontierAdapter>();

  constructor() {
    this.registerAdapter(new MidsceneAdapter());
    this.registerAdapter(new KeployAdapter());
    this.registerAdapter(new DistributedE2EAdapter());
    this.registerAdapter(new TesterArmyAdapter());
    this.registerAdapter(new MinimalReproAdapter());
    this.registerAdapter(new NativeRunnerAdapter('bun-test'));
    this.registerAdapter(new NativeRunnerAdapter('vitest'));
    this.registerAdapter(new NativeRunnerAdapter('playwright'));

    // Open-Agent Testing Skills (from skills.sh)
    this.registerAdapter(new PlaywrightCliSkillAdapter());
    this.registerAdapter(new WebappTestingSkillAdapter());
    this.registerAdapter(new PlaywrightBestPracticesSkillAdapter());
    this.registerAdapter(new BrowserDevtoolsSkillAdapter());
    this.registerAdapter(new E2eTestingPatternsSkillAdapter());
    this.registerAdapter(new VitestMidsceneSkillAdapter());
  }

  registerAdapter(adapter: BaseFrontierAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  getAdapter(toolId: FrontierToolId): BaseFrontierAdapter {
    const adapter = this.adapters.get(toolId);
    if (!adapter) {
      throw new Error(`Frontier test tool adapter '${toolId}' is not registered`);
    }
    return adapter;
  }

  listCapabilities(projectRoot: string): ToolCapability[] {
    return Array.from(this.adapters.values()).map((adapter) => adapter.getCapability(projectRoot));
  }

  scan(projectRoot: string): ProjectScanResult {
    return scanRepository(projectRoot);
  }

  plan(projectRoot: string, goal?: string): FrontierOrchestratorPlan {
    const scanResult = this.scan(projectRoot);
    const selectedTools: FrontierToolId[] = [];

    // Choose top 2 recommended tools
    for (const rec of scanResult.recommendedTools.slice(0, 3)) {
      selectedTools.push(rec.toolId);
    }

    // Always ensure at least one fast native runner and one high-tier verification tool
    if (!selectedTools.includes('bun-test') && scanResult.packageManager === 'bun') {
      selectedTools.unshift('bun-test');
    }

    const executionOrder = [...selectedTools];
    const steps: FrontierOrchestratorPlan['steps'] = [];

    for (const toolId of executionOrder) {
      const adapter = this.getAdapter(toolId);
      const isInstalled = adapter.isInstalled(projectRoot);

      if (!isInstalled) {
        steps.push({
          toolId,
          action: 'scaffold',
          description: `Provision configuration and starter files for ${adapter.name}`,
          command: `get-fable test-engine install ${toolId}`
        });
      }

      steps.push({
        toolId,
        action: 'execute',
        description: `Execute tests via ${adapter.name}`,
        command: `get-fable test-engine run ${toolId}`
      });
    }

    return {
      id: `plan-${Date.now()}`,
      title: `Frontier Verification Plan for ${scanResult.projectType}`,
      goal: goal || `Comprehensive multi-layer testing for ${scanResult.projectType}`,
      scannedProject: scanResult,
      selectedTools,
      executionOrder,
      steps
    };
  }

  async provision(projectRoot: string, toolId: FrontierToolId, options: Partial<ScaffoldOptions> = {}): Promise<ScaffoldResult> {
    const adapter = this.getAdapter(toolId);
    return adapter.scaffold(projectRoot, {
      toolId,
      ...options
    });
  }

  async run(projectRoot: string, toolId: FrontierToolId, options: Partial<ToolRunOptions> = {}): Promise<ToolRunResult> {
    const adapter = this.getAdapter(toolId);
    return adapter.run(projectRoot, {
      toolId,
      ...options
    });
  }

  async runPlan(
    projectRoot: string,
    plan: FrontierOrchestratorPlan,
    dryRun = false
  ): Promise<{ planId: string; results: ToolRunResult[]; allPassed: boolean }> {
    const results: ToolRunResult[] = [];

    for (const toolId of plan.executionOrder) {
      const adapter = this.getAdapter(toolId);
      // Auto-scaffold if missing
      if (!adapter.isInstalled(projectRoot)) {
        await this.provision(projectRoot, toolId, { targetDir: projectRoot });
      }

      const res = await this.run(projectRoot, toolId, {
        mode: dryRun ? 'dry-run' : 'run'
      });
      results.push(res);
    }

    const allPassed = results.every((r) => r.passed);
    return {
      planId: plan.id,
      results,
      allPassed
    };
  }

  async autoExecute(
    projectRoot?: string,
    options: AutoExecuteOptions = {}
  ): Promise<AutoExecuteResult> {
    const root = projectRoot || options.targetDir || process.cwd();
    const isDryRun = options.mode === 'dry-run';
    const autoProvision = options.autoProvision !== false;
    const autoRemediate = options.autoRemediate !== false;
    const maxTools = options.maxTools || 3;
    const autonomousActions: string[] = [];
    const provisionedTools: FrontierToolId[] = [];
    const diagnoses: { toolId: FrontierToolId; kind: string; explanation: string }[] = [];

    // 1. Autonomous Discovery: scan repository topology
    const scanResult = this.scan(root);
    autonomousActions.push(
      `Scanned repository topology: detected ${scanResult.projectType} (${scanResult.detectedLanguages.join(', ') || 'no language detected'}), package manager: ${scanResult.packageManager}`
    );

    // 2. Autonomous Toolchain Decision: select optimal testing wave
    const plan = this.plan(root);
    const selectedOrder = plan.executionOrder.slice(0, maxTools);
    autonomousActions.push(
      `Autonomously synthesized optimal multi-layer test pipeline: ${selectedOrder.join(' -> ')}`
    );

    // 3. Autonomous Provisioning (Zero Manual Config)
    if (autoProvision) {
      for (const toolId of selectedOrder) {
        const adapter = this.getAdapter(toolId);
        if (!adapter.isInstalled(root)) {
          await this.provision(root, toolId, { targetDir: root });
          provisionedTools.push(toolId);
          autonomousActions.push(`Auto-provisioned configuration and starter tests for '${toolId}' without requiring user intervention`);
        }
      }
    }

    // 4. Autonomous Execution Wave
    const results: ToolRunResult[] = [];
    let totalPassedTests = 0;
    let totalFailedTests = 0;
    let totalTests = 0;
    let totalDurationMs = 0;

    for (const toolId of selectedOrder) {
      const runResult = await this.run(root, toolId, {
        mode: isDryRun ? 'dry-run' : 'run',
        timeoutMs: options.timeoutMs
      });

      // Test-Value Spearhead Zero-Selection Guard:
      // If exitCode is 0 but 0 tests were executed, diagnose and fail closed
      if (runResult.exitCode === 0 && runResult.totalTests === 0) {
        runResult.passed = false;
        runResult.diagnosis = {
          kind: 'ENVIRONMENT_DEPENDENCY_FAILURE',
          explanation: `Zero tests executed for ${toolId}. Failing closed under Test-Value Spearhead zero-selection guard.`
        };
      }

      results.push(runResult);
      totalPassedTests += runResult.passedTests;
      totalFailedTests += runResult.failedTests;
      totalTests += runResult.totalTests;
      totalDurationMs += runResult.durationMs;

      // 5. Autonomous Triage & Diagnostics
      if (!runResult.passed && runResult.diagnosis) {
        diagnoses.push({
          toolId,
          kind: runResult.diagnosis.kind,
          explanation: runResult.diagnosis.explanation
        });
        autonomousActions.push(
          `Diagnosed failure in '${toolId}': [${runResult.diagnosis.kind}] ${runResult.diagnosis.explanation}`
        );

        // Auto-remediation: Scaffold minimal repro harness to isolate defect
        if (autoRemediate && !provisionedTools.includes('minimal-repro')) {
          try {
            await this.provision(root, 'minimal-repro', {
              targetDir: root,
              scenarioName: `Auto-Isolated Defect in ${toolId}`
            });
            provisionedTools.push('minimal-repro');
            autonomousActions.push(`Autonomously generated minimal reproducible defect harness for '${toolId}' (Cypress-Tiny pattern)`);
          } catch {
            // ignore if unable
          }
        }
      }
    }

    const overallPassed = results.length > 0 && results.every((r) => r.passed);

    // 6. Autonomous Evidence Stamping into .fable/state.json
    let evidenceStamped = false;
    const stateFile = join(root, '.fable', 'state.json');
    if (options.recordEvidence !== false && existsSync(stateFile)) {
      try {
        const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
        if (!state.evidence) state.evidence = [];
        const currentGen = state.mutationGeneration || 1;

        for (const res of results) {
          const synthesis = synthesizeFrontierEvidence(res, currentGen);
          state.evidence.push(synthesis.evidenceRecord);
        }

        if (overallPassed) {
          state.verifiedGeneration = currentGen;
        }
        state.updatedAt = new Date().toISOString();
        writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
        evidenceStamped = true;
        autonomousActions.push(
          `Stamped ${results.length} verified evidence records into .fable/state.json (verifiedGeneration: ${state.verifiedGeneration})`
        );
      } catch (err) {
        autonomousActions.push(`Failed to stamp evidence: ${err}`);
      }
    }

    return {
      projectRoot: root,
      scan: scanResult,
      plan,
      provisionedTools,
      executedTools: selectedOrder,
      results,
      overallPassed,
      totalPassedTests,
      totalFailedTests,
      totalTests,
      durationMs: totalDurationMs,
      evidenceStamped,
      autonomousActions,
      diagnoses
    };
  }
}

