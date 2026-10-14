/**
 * Fable Frontier Testing Engine — Base Adapter Contract
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  FrontierToolId,
  FrontierToolCategory,
  ToolCapability,
  ScaffoldOptions,
  ScaffoldResult,
  ToolRunOptions,
  ToolRunResult
} from '../types.js';

export abstract class BaseFrontierAdapter {
  abstract readonly id: FrontierToolId;
  abstract readonly name: string;
  abstract readonly category: FrontierToolCategory;
  abstract readonly description: string;
  abstract readonly upstreamRepo: string;
  abstract readonly configFiles: string[];
  abstract readonly supportedTargets: ('web-ui' | 'api' | 'microservice' | 'mobile' | 'unit-integration')[];

  getCapability(projectRoot: string): ToolCapability {
    const installed = this.isInstalled(projectRoot);
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      description: this.description,
      upstreamRepo: this.upstreamRepo,
      installed,
      configFiles: this.configFiles,
      supportedTargets: this.supportedTargets
    };
  }

  isInstalled(projectRoot: string): boolean {
    for (const configFile of this.configFiles) {
      if (existsSync(join(projectRoot, configFile))) {
        return true;
      }
    }
    return false;
  }

  abstract scaffold(projectRoot: string, options: ScaffoldOptions): Promise<ScaffoldResult>;

  abstract run(projectRoot: string, options: ToolRunOptions): Promise<ToolRunResult>;

  /**
   * Helper to execute a command with timeout and return stdout, stderr, exitCode, duration
   */
  protected async executeCommand(
    command: string,
    args: string[],
    cwd: string,
    timeoutMs = 60000,
    envOverrides?: Record<string, string>
  ): Promise<{ exitCode: number; stdout: string; stderr: string; durationMs: number }> {
    const startTime = Date.now();
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let finished = false;

      const proc = spawn(command, args, {
        cwd,
        env: { ...process.env, ...envOverrides },
        shell: true
      });

      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          proc.kill('SIGKILL');
          resolve({
            exitCode: 124, // standard timeout exit code
            stdout,
            stderr: stderr + `\n[Command timed out after ${timeoutMs}ms]`,
            durationMs: Date.now() - startTime
          });
        }
      }, timeoutMs);

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve({
            exitCode: code ?? 0,
            stdout,
            stderr,
            durationMs: Date.now() - startTime
          });
        }
      });

      proc.on('error', (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve({
            exitCode: 1,
            stdout,
            stderr: stderr + `\n[Process spawn error: ${err.message}]`,
            durationMs: Date.now() - startTime
          });
        }
      });
    });
  }
}
