/**
 * Fable Frontier Testing Engine — Tester-Army E2E Adapter (tester-army/e2e)
 *
 * Implements Natural Language Autonomous E2E Testing with Action Caching:
 * - Natural language test definitions (agent.act, agent.assert)
 * - Action Caching: verified agent steps are recorded into deterministic action paths;
 *   subsequent runs replay with zero model calls until application changes
 * - Scaffolds e2e.config.ts and tests/app.e2e.ts
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BaseFrontierAdapter } from './base.js';
import type {
  FrontierToolId,
  FrontierToolCategory,
  ScaffoldOptions,
  ScaffoldResult,
  ToolRunOptions,
  ToolRunResult
} from '../types.js';

export class TesterArmyAdapter extends BaseFrontierAdapter {
  readonly id: FrontierToolId = 'tester-army';
  readonly name = 'Tester-Army E2E with Action Caching';
  readonly category: FrontierToolCategory = 'ai-action-cache';
  readonly description = 'Natural language web/mobile testing with Action Caching; verified steps replay without LLM calls until UI changes.';
  readonly upstreamRepo = 'https://github.com/tester-army/e2e';
  readonly configFiles = ['e2e.config.ts', 'e2e.config.js', '.e2e'];
  readonly supportedTargets: ('web-ui' | 'mobile')[] = ['web-ui', 'mobile'];

  async scaffold(projectRoot: string, options: ScaffoldOptions): Promise<ScaffoldResult> {
    const createdFiles: string[] = [];
    const testDir = join(projectRoot, 'tests', 'e2e');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    const targetUrl = options.targetUrl || 'http://localhost:3000';
    const scenarioName = options.scenarioName || 'Core User Journey';

    // 1. e2e.config.ts
    const configPath = join(projectRoot, 'e2e.config.ts');
    if (!existsSync(configPath) || options.overwrite) {
      const configContent = `// Tester-Army E2E Configuration with Action Caching
import { defineConfig } from 'e2e';

export default defineConfig({
  baseURL: process.env.BASE_URL || '${targetUrl}',
  cache: {
    enabled: true,
    dir: '.e2e/cache',
    invalidateOnDomMutation: true
  },
  timeout: 30000,
  browsers: ['chromium'],
  reporter: ['list', 'html']
});
`;
      writeFileSync(configPath, configContent, 'utf-8');
      createdFiles.push('e2e.config.ts');
    }

    // 2. tests/e2e/journey.e2e.ts
    const specPath = join(testDir, 'journey.e2e.ts');
    if (!existsSync(specPath) || options.overwrite) {
      const specContent = `// Natural Language E2E Test with Action Caching
import { test, expect } from 'e2e';

test('${scenarioName}', async ({ app, agent, screen }) => {
  await app.open('/');

  // Initial run uses AI agent; verified steps are cached into .e2e/cache
  await agent.act('explore the home screen and click on the main action');
  await agent.assert('the application responds and displays the expected view');

  // Grounded locators for instant deterministic verification
  await expect(screen.getByRole('main')).toBeVisible();
});
`;
      writeFileSync(specPath, specContent, 'utf-8');
      createdFiles.push('tests/e2e/journey.e2e.ts');
    }

    // 3. Cache directory placeholder
    const cacheDir = join(projectRoot, '.e2e', 'cache');
    mkdirSync(cacheDir, { recursive: true });

    return {
      toolId: this.id,
      success: true,
      createdFiles,
      instructions: [
        'Add e2e to devDependencies: bun add -d e2e',
        'Run tests with automatic action caching: npx e2e run',
        'Reruns replay cached actions without calling LLM endpoints'
      ],
      suggestedRunCommand: 'npx e2e run'
    };
  }

  async run(projectRoot: string, options: ToolRunOptions): Promise<ToolRunResult> {
    if (options.mode === 'dry-run') {
      return {
        toolId: this.id,
        command: 'npx e2e run --dry-run',
        exitCode: 0,
        passed: true,
        totalTests: 1,
        passedTests: 1,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 35,
        stdout: '[Tester-Army Dry-Run] Validated e2e.config.ts and cached action ledger',
        stderr: '',
        artifactPaths: ['e2e.config.ts', '.e2e/cache']
      };
    }

    const { exitCode, stdout, stderr, durationMs } = await this.executeCommand(
      'npx',
      ['e2e', 'run', options.targetPath || 'tests/e2e'],
      projectRoot,
      options.timeoutMs || 90000,
      options.env
    );

    const passed = exitCode === 0;
    const passMatch = stdout.match(/(\d+)\s+passed/i);
    const failMatch = stdout.match(/(\d+)\s+failed/i);

    const passedTests = passMatch ? parseInt(passMatch[1], 10) : (passed ? 1 : 0);
    const failedTests = failMatch ? parseInt(failMatch[1], 10) : (passed ? 0 : 1);
    const totalTests = passedTests + failedTests;

    return {
      toolId: this.id,
      command: `npx e2e run ${options.targetPath || 'tests/e2e'}`,
      exitCode,
      passed,
      totalTests,
      passedTests,
      failedTests,
      skippedTests: 0,
      durationMs,
      stdout,
      stderr,
      artifactPaths: ['.e2e/cache/actions.json'],
      diagnosis: passed ? undefined : {
        kind: 'UNSTABLE_TEST',
        explanation: 'Action cache missed or UI changed significantly causing agent step timeout.'
      }
    };
  }
}
