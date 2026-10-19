/**
 * Sentinel Watchdog Supervisor for Fable Orchestrator.
 *
 * Grounded in PortOS (agentSentinelWatcher.js & agentWorktreeCleanup.js):
 * - Supervises active worker processes and execution lanes
 * - Heartbeat tracking, timeout detection, and zombie process termination
 * - Worktree cleanup and resource reclamation
 */

import fs from 'node:fs';
import path from 'node:path';
import type { WorkerHeartbeat } from './types.js';

export interface RegisterWorkerOptions {
  workerId: string;
  taskId: string;
  pid?: number;
  worktreePath?: string;
  timeoutMs?: number;
}

export interface WatchdogOptions {
  heartbeatTimeoutMs?: number;
  checkIntervalMs?: number;
}

export interface SweepResult {
  stalledWorkerIds: string[];
  terminatedWorkerIds: string[];
  activeCount: number;
}

export class SentinelWatchdog {
  private workers: Map<string, WorkerHeartbeat & { timeoutMs: number }> = new Map();
  private defaultTimeoutMs: number;

  constructor(options: WatchdogOptions = {}) {
    this.defaultTimeoutMs = options.heartbeatTimeoutMs || 30000;
  }

  public registerWorker(options: RegisterWorkerOptions): void {
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    this.workers.set(options.workerId, {
      workerId: options.workerId,
      taskId: options.taskId,
      lastHeartbeat: Date.now(),
      pid: options.pid,
      worktreePath: options.worktreePath,
      status: 'running',
      timeoutMs,
    });
  }

  public ping(workerId: string): boolean {
    const worker = this.workers.get(workerId);
    if (!worker || worker.status === 'terminated') return false;

    worker.lastHeartbeat = Date.now();
    if (worker.status === 'stalled') {
      worker.status = 'running';
    }
    return true;
  }

  public getWorkerStatus(workerId: string): WorkerHeartbeat | undefined {
    return this.workers.get(workerId);
  }

  public listActiveWorkers(taskId?: string): WorkerHeartbeat[] {
    const results: WorkerHeartbeat[] = [];
    for (const w of this.workers.values()) {
      if (w.status === 'running' || w.status === 'stalled') {
        if (!taskId || w.taskId === taskId) {
          results.push({
            workerId: w.workerId,
            taskId: w.taskId,
            lastHeartbeat: w.lastHeartbeat,
            pid: w.pid,
            worktreePath: w.worktreePath,
            status: w.status,
          });
        }
      }
    }
    return results;
  }

  public sweep(): SweepResult {
    const now = Date.now();
    const stalled: string[] = [];
    const terminated: string[] = [];
    let active = 0;

    for (const [id, worker] of this.workers.entries()) {
      if (worker.status === 'terminated') continue;

      const elapsed = now - worker.lastHeartbeat;
      if (elapsed > worker.timeoutMs) {
        if (worker.status !== 'stalled') {
          worker.status = 'stalled';
          stalled.push(id);
        } else if (elapsed > worker.timeoutMs * 2) {
          // Force terminate after 2x timeout
          this.terminateWorker(id, 'timeout_exceeded');
          terminated.push(id);
        }
      } else {
        active++;
      }
    }

    return {
      stalledWorkerIds: stalled,
      terminatedWorkerIds: terminated,
      activeCount: active,
    };
  }

  public terminateWorker(workerId: string, reason: string): boolean {
    const worker = this.workers.get(workerId);
    if (!worker) return false;

    worker.status = 'terminated';

    // Kill process if PID exists and is running
    if (worker.pid) {
      try {
        process.kill(worker.pid, 'SIGTERM');
      } catch (err) {
        console.warn(`[SentinelWatchdog] Failed to kill PID ${worker.pid}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Clean up temporary worktree if exists and marked
    if (worker.worktreePath && fs.existsSync(worker.worktreePath)) {
      try {
        // Only clean up if inside a safe tmp or .fable directory
        if (
          worker.worktreePath.includes('/tmp/') ||
          worker.worktreePath.includes('.fable/worktrees')
        ) {
          fs.rmSync(worker.worktreePath, { recursive: true, force: true });
        }
      } catch (err) {
        console.warn(`[SentinelWatchdog] Failed to clean up worktree ${worker.worktreePath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return true;
  }

  public clear(): void {
    this.workers.clear();
  }
}
