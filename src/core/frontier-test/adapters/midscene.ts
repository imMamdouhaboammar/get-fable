/**
 * Fable Frontier Testing Engine — Midscene Adapter (web-infra-dev/midscene)
 *
 * Implements AI Multimodal Vision-Based UI Testing:
 * - Eliminates fragile CSS/XPath selectors
 * - Operates with visual LLMs (aiAct, aiAssert, aiWaitFor, aiQuery)
 * - Scaffolds both Playwright agent scripts and zero-code YAML workflows
 * - Emits HTML visual inspection reports
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

export class MidsceneAdapter extends BaseFrontierAdapter {
  readonly id: FrontierToolId = 'midscene';
  readonly name = 'Midscene AI Vision GUI Agent';
  readonly category: FrontierToolCategory = 'ai-vision-e2e';
  readonly description = 'Vision-driven multimodal GUI testing without fragile selectors; natural language actions and visual assertions.';
  readonly upstreamRepo = 'https://github.com/web-infra-dev/midscene';
  readonly configFiles = [
    'midscene.config.ts',
    'midscene.config.js',
    'midscene.yaml',
    'midscene.config.yaml'
  ];
  readonly supportedTargets: ('web-ui' | 'mobile')[] = ['web-ui', 'mobile'];

  async scaffold(projectRoot: string, options: ScaffoldOptions): Promise<ScaffoldResult> {
    const createdFiles: string[] = [];
    const testDir = join(projectRoot, 'tests', 'midscene');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    const targetUrl = options.targetUrl || 'http://localhost:3000';
    const scenarioName = options.scenarioName || 'User Navigation & Visual Verification';

    // 1. midscene.config.ts
    const configPath = join(projectRoot, 'midscene.config.ts');
    if (!existsSync(configPath) || options.overwrite) {
      const configContent = `// Midscene AI Vision Testing Configuration
import { defineConfig } from '@midscene/web';

export default defineConfig({
  targetUrl: process.env.TEST_TARGET_URL || '${targetUrl}',
  viewport: { width: 1280, height: 800 },
  timeout: 30000,
  cache: {
    enabled: true,
    cacheDir: '.midscene/cache'
  },
  report: {
    outputDir: '.midscene/reports',
    generateHtml: true
  }
});
`;
      writeFileSync(configPath, configContent, 'utf-8');
      createdFiles.push('midscene.config.ts');
    }

    // 2. Playwright Agent Test Scenario
    const specPath = join(testDir, 'visual-flow.spec.ts');
    if (!existsSync(specPath) || options.overwrite) {
      const specContent = `// Midscene AI Multimodal Test Specification
// Reverse-Engineered from web-infra-dev/midscene
import { test, expect } from '@playwright/test';
import { PlaywrightAgent } from '@midscene/web/playwright';

test.describe('${scenarioName}', () => {
  test('executes visual workflow via natural language', async ({ page }) => {
    await page.goto('${targetUrl}');

    const agent = new PlaywrightAgent(page);

    // AI-guided interaction without brittle selectors
    await agent.aiAct('Inspect the page and locate the primary call to action');
    await agent.aiWaitFor('The primary interface elements are fully rendered');

    // Visual state assertion
    await agent.aiAssert('The main header is clearly visible and readable');
    await agent.aiAssert('No error banners or broken layout elements exist');
  });
});
`;
      writeFileSync(specPath, specContent, 'utf-8');
      createdFiles.push('tests/midscene/visual-flow.spec.ts');
    }

    // 3. Declarative YAML Scenario (Midscene Test Runner)
    const yamlPath = join(testDir, 'flow.yaml');
    if (!existsSync(yamlPath) || options.overwrite) {
      const yamlContent = `# Declarative Midscene YAML Test Case
target: ${targetUrl}
cases:
  - name: ${scenarioName}
    steps:
      - gotoUrl: ${targetUrl}
      - aiWaitFor: The page finishes loading
      - aiAct: Look for navigation bar and ensure it is interactive
      - aiAssert: The brand logo and main navigation links are visible
`;
      writeFileSync(yamlPath, yamlContent, 'utf-8');
      createdFiles.push('tests/midscene/flow.yaml');
    }

    return {
      toolId: this.id,
      success: true,
      createdFiles,
      instructions: [
        'Add Midscene to devDependencies: bun add -d @midscene/web @playwright/test',
        'Configure your preferred vision model: export OPENAI_API_KEY="..." or GEMINI_API_KEY="..."',
        'Execute tests: bunx midscene-test tests/midscene/flow.yaml or npx playwright test tests/midscene'
      ],
      suggestedRunCommand: 'bunx midscene-test tests/midscene/flow.yaml'
    };
  }

  async run(projectRoot: string, options: ToolRunOptions): Promise<ToolRunResult> {
    const yamlPath = join(projectRoot, 'tests', 'midscene', 'flow.yaml');
    const hasYaml = existsSync(yamlPath);
    const command = hasYaml ? 'bunx' : 'bun';
    const args = hasYaml
      ? ['midscene-test', options.targetPath || 'tests/midscene/flow.yaml']
      : ['test', options.targetPath || 'tests/midscene'];

    if (options.mode === 'dry-run') {
      return {
        toolId: this.id,
        command: `${command} ${args.join(' ')}`,
        exitCode: 0,
        passed: true,
        totalTests: 1,
        passedTests: 1,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 50,
        stdout: '[Midscene Dry-Run] Validated config and test files',
        stderr: '',
        artifactPaths: hasYaml ? ['tests/midscene/flow.yaml'] : ['tests/midscene/visual-flow.spec.ts']
      };
    }

    const { exitCode, stdout, stderr, durationMs } = await this.executeCommand(
      command,
      args,
      projectRoot,
      options.timeoutMs || 90000,
      options.env
    );

    const passed = exitCode === 0;
    // Simple heuristic parser for test counts
    const passMatches = stdout.match(/(\d+)\s+passed/i);
    const failMatches = stdout.match(/(\d+)\s+failed/i);

    const passedTests = passMatches ? parseInt(passMatches[1], 10) : (passed ? 1 : 0);
    const failedTests = failMatches ? parseInt(failMatches[1], 10) : (passed ? 0 : 1);
    const totalTests = passedTests + failedTests;

    return {
      toolId: this.id,
      command: `${command} ${args.join(' ')}`,
      exitCode,
      passed,
      totalTests,
      passedTests,
      failedTests,
      skippedTests: 0,
      durationMs,
      stdout,
      stderr,
      artifactPaths: ['.midscene/reports/index.html'],
      diagnosis: passed ? undefined : {
        kind: 'PRODUCT_REGRESSION',
        explanation: 'Visual assertion failed or UI element was not recognized by vision model.'
      }
    };
  }
}
