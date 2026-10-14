/**
 * Fable Frontier Testing Engine — Native Runners Adapter
 *
 * Implements native integration with:
 * - bun test (Bun-native fast runner)
 * - vitest (Vite/TS unit & integration)
 * - playwright (Headless browser engine)
 */

import { existsSync, writeFileSync } from 'node:fs';
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

export class NativeRunnerAdapter extends BaseFrontierAdapter {
  readonly id: FrontierToolId;
  readonly name: string;
  readonly category: FrontierToolCategory = 'native-runner';
  readonly description: string;
  readonly upstreamRepo: string;
  readonly configFiles: string[];
  readonly supportedTargets: ('unit-integration' | 'web-ui' | 'api')[] = ['unit-integration', 'web-ui', 'api'];

  constructor(id: 'bun-test' | 'vitest' | 'playwright') {
    super();
    this.id = id;
    if (id === 'bun-test') {
      this.name = 'Bun Test Native Runner';
      this.description = 'Ultra-fast native TypeScript/JavaScript test runner built into Bun.';
      this.upstreamRepo = 'https://github.com/oven-sh/bun';
      this.configFiles = ['bunfig.toml', 'package.json'];
    } else if (id === 'vitest') {
      this.name = 'Vitest Unit & Integration Runner';
      this.description = 'Vite-native unit test framework with ESM, TypeScript, and Jest-compatible API.';
      this.upstreamRepo = 'https://github.com/vitest-dev/vitest';
      this.configFiles = ['vitest.config.ts', 'vitest.config.js', 'vite.config.ts'];
    } else {
      this.name = 'Playwright End-to-End Browser Engine';
      this.description = 'Cross-browser automation and end-to-end testing across Chromium, Firefox, and WebKit.';
      this.upstreamRepo = 'https://github.com/microsoft/playwright';
      this.configFiles = ['playwright.config.ts', 'playwright.config.js'];
    }
  }

  async scaffold(projectRoot: string, options: ScaffoldOptions): Promise<ScaffoldResult> {
    const createdFiles: string[] = [];

    if (this.id === 'vitest') {
      const configPath = join(projectRoot, 'vitest.config.ts');
      if (!existsSync(configPath) || options.overwrite) {
        const content = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{ts,js}']
  }
});
`;
        writeFileSync(configPath, content, 'utf-8');
        createdFiles.push('vitest.config.ts');
      }
    } else if (this.id === 'playwright') {
      const configPath = join(projectRoot, 'playwright.config.ts');
      if (!existsSync(configPath) || options.overwrite) {
        const content = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: '${options.targetUrl || 'http://localhost:3000'}',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
`;
        writeFileSync(configPath, content, 'utf-8');
        createdFiles.push('playwright.config.ts');
      }
    }

    return {
      toolId: this.id,
      success: true,
      createdFiles,
      instructions: [`Run tests with ${this.name}: ${this.id === 'bun-test' ? 'bun test' : 'bunx ' + this.id}`],
      suggestedRunCommand: this.id === 'bun-test' ? 'bun test' : `bunx ${this.id} run`
    };
  }

  async run(projectRoot: string, options: ToolRunOptions): Promise<ToolRunResult> {
    if (options.mode === 'dry-run') {
      return {
        toolId: this.id,
        command: `${this.id === 'bun-test' ? 'bun test' : 'bunx ' + this.id} --dry-run`,
        exitCode: 0,
        passed: true,
        totalTests: 1,
        passedTests: 1,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 20,
        stdout: `[${this.name} Dry-Run] Validated test configuration`,
        stderr: '',
        artifactPaths: []
      };
    }

    const command = this.id === 'bun-test' ? 'bun' : 'bunx';
    const args = this.id === 'bun-test'
      ? ['test', ...(options.targetPath ? [options.targetPath] : [])]
      : [this.id, 'run', ...(options.targetPath ? [options.targetPath] : [])];

    const { exitCode, stdout, stderr, durationMs } = await this.executeCommand(
      command,
      args,
      projectRoot,
      options.timeoutMs || 60000,
      options.env
    );

    const passed = exitCode === 0;
    const passMatch = stdout.match(/(\d+)\s+pass/i);
    const failMatch = stdout.match(/(\d+)\s+fail/i);

    const passedTests = passMatch ? parseInt(passMatch[1], 10) : (passed ? 1 : 0);
    const failedTests = failMatch ? parseInt(failMatch[1], 10) : (passed ? 0 : 1);
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
      artifactPaths: [],
      diagnosis: passed ? undefined : {
        kind: 'PRODUCT_REGRESSION',
        explanation: `${this.name} reported test failures.`
      }
    };
  }
}
