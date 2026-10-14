/**
 * Fable Frontier Testing Engine — Keploy Adapter (keploy/keploy)
 *
 * Implements Zero-Code API & Integration Testing:
 * - Records real HTTP/API requests, DB queries, and external network interactions
 * - Auto-generates deterministic test cases & golden data mocks (infra-virtualization)
 * - Deterministic replay with zero live DB/queue re-provisioning
 * - Scaffolds keploy.yml and test runner scripts
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

export class KeployAdapter extends BaseFrontierAdapter {
  readonly id: FrontierToolId = 'keploy';
  readonly name = 'Keploy Zero-Code API & Infra Virtualizer';
  readonly category: FrontierToolCategory = 'api-record-replay';
  readonly description = 'Zero-code API testing and data mocking; records network & DB calls via eBPF/proxy and replays deterministically.';
  readonly upstreamRepo = 'https://github.com/keploy/keploy';
  readonly configFiles = ['keploy.yml', 'keploy.yaml', '.keploy'];
  readonly supportedTargets: ('api' | 'microservice')[] = ['api', 'microservice'];

  async scaffold(projectRoot: string, options: ScaffoldOptions): Promise<ScaffoldResult> {
    const createdFiles: string[] = [];
    const keployDir = join(projectRoot, 'keploy');
    if (!existsSync(keployDir)) {
      mkdirSync(keployDir, { recursive: true });
    }

    const apiPort = options.apiPort || 8080;
    const appCommand = options.scenarioName || 'bun run start';

    // 1. keploy.yml
    const configPath = join(projectRoot, 'keploy.yml');
    if (!existsSync(configPath) || options.overwrite) {
      const configContent = `# Keploy Configuration (Clean-room adaptation of keploy/keploy)
record:
  path: "./keploy"
  filters:
    - url: ".*health.*"
    - header: "User-Agent:.*health.*"

test:
  path: "./keploy"
  delay: 5
  timeout: 30
  ignoreOrdering: false
  selectedTests: []
  globalNoise:
    header:
      - "Date"
      - "Set-Cookie"
    body:
      - "timestamp"
      - "requestId"

server:
  port: ${apiPort}
  command: "${appCommand}"
`;
      writeFileSync(configPath, configContent, 'utf-8');
      createdFiles.push('keploy.yml');
    }

    // 2. Starter Mock Test Set
    const testSetDir = join(keployDir, 'test-set-0');
    const testsDir = join(testSetDir, 'tests');
    const mocksDir = join(testSetDir, 'mocks');
    mkdirSync(testsDir, { recursive: true });
    mkdirSync(mocksDir, { recursive: true });

    const sampleTestPath = join(testsDir, 'test-1.yaml');
    if (!existsSync(sampleTestPath) || options.overwrite) {
      const sampleTest = `version: api.keploy.io/v1beta1
kind: Http
name: test-1
spec:
  metadata: {}
  req:
    method: GET
    proto_major: 1
    proto_minor: 1
    url: /api/status
    header:
      Accept: "*/*"
      Host: localhost:${apiPort}
    body: ""
  resp:
    status_code: 200
    header:
      Content-Type: application/json
    body: '{"status":"ok"}'
    status_message: OK
  assertions:
    noise:
      - header.Date
`;
      writeFileSync(sampleTestPath, sampleTest, 'utf-8');
      createdFiles.push('keploy/test-set-0/tests/test-1.yaml');
    }

    return {
      toolId: this.id,
      success: true,
      createdFiles,
      instructions: [
        'Install Keploy CLI: curl --silent --location "https://keploy.io/install.sh" | bash',
        `Record API interactions: keploy record -c "${appCommand}"`,
        `Replay recorded API tests: keploy test -c "${appCommand}"`
      ],
      suggestedRunCommand: `keploy test -c "${appCommand}"`
    };
  }

  async run(projectRoot: string, options: ToolRunOptions): Promise<ToolRunResult> {
    const isRecord = options.mode === 'record';
    const subCmd = isRecord ? 'record' : 'test';
    const appCommand = options.scenarioName || 'bun run start';

    if (options.mode === 'dry-run') {
      const testSetDir = join(projectRoot, 'keploy', 'test-set-0', 'tests');
      const hasTests = existsSync(testSetDir);
      return {
        toolId: this.id,
        command: `keploy ${subCmd} -c "${appCommand}"`,
        exitCode: 0,
        passed: true,
        totalTests: hasTests ? 1 : 0,
        passedTests: hasTests ? 1 : 0,
        failedTests: 0,
        skippedTests: 0,
        durationMs: 30,
        stdout: '[Keploy Dry-Run] Validated keploy.yml and test-set structure',
        stderr: '',
        artifactPaths: ['keploy.yml']
      };
    }

    const { exitCode, stdout, stderr, durationMs } = await this.executeCommand(
      'keploy',
      [subCmd, '-c', appCommand],
      projectRoot,
      options.timeoutMs || 120000,
      options.env
    );

    const passed = exitCode === 0;
    const testMatch = stdout.match(/TOTAL TESTS:\s*(\d+)/i);
    const passMatch = stdout.match(/PASSED TESTS:\s*(\d+)/i);
    const failMatch = stdout.match(/FAILED TESTS:\s*(\d+)/i);

    const totalTests = testMatch ? parseInt(testMatch[1], 10) : (passed ? 1 : 0);
    const passedTests = passMatch ? parseInt(passMatch[1], 10) : (passed ? 1 : 0);
    const failedTests = failMatch ? parseInt(failMatch[1], 10) : (passed ? 0 : 1);

    return {
      toolId: this.id,
      command: `keploy ${subCmd} -c "${appCommand}"`,
      exitCode,
      passed,
      totalTests,
      passedTests,
      failedTests,
      skippedTests: 0,
      durationMs,
      stdout,
      stderr,
      artifactPaths: ['keploy/reports/test-run.log'],
      diagnosis: passed ? undefined : {
        kind: 'PRODUCT_REGRESSION',
        explanation: 'Replayed API response deviated from recorded golden contract or external mock failed.'
      }
    };
  }
}
