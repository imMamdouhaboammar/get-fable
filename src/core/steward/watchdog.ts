import fs from 'node:fs';
import path from 'node:path';

export interface WatchdogConfig {
  cycleTimeoutMs?: number;
  maxConsecutiveFailures?: number;
  heartbeatPath?: string;
  cwd?: string;
  onTimeout?: (cycleIndex: number, elapsedMs: number) => void;
  onCircuitBreakerTripped?: (failures: number, reason: string) => void;
}

export interface WatchdogHeartbeat {
  timestamp: string;
  cycleIndex: number;
  lastTarget?: string;
  lastCategory?: string;
  status: 'healthy' | 'warning' | 'tripped' | 'timed-out';
  consecutiveFailures: number;
  memoryUsageMb: number;
  uptimeSeconds: number;
}

export class StewardWatchdog {
  private cycleTimeoutMs: number;
  private maxConsecutiveFailures: number;
  private heartbeatPath: string;
  private consecutiveFailures = 0;
  private activeCycleIndex = 0;
  private cycleStartTime = 0;
  private loopStartTime = Date.now();
  private timer: NodeJS.Timeout | null = null;
  private tripped = false;
  private onTimeout?: (cycleIndex: number, elapsedMs: number) => void;
  private onCircuitBreakerTripped?: (failures: number, reason: string) => void;

  constructor(config: WatchdogConfig = {}) {
    this.cycleTimeoutMs = config.cycleTimeoutMs || 60_000;
    this.maxConsecutiveFailures = config.maxConsecutiveFailures || 2;
    const cwd = config.cwd || process.cwd();
    this.heartbeatPath =
      config.heartbeatPath || path.join(cwd, '.fable', 'watchdog-heartbeat.json');
    this.onTimeout = config.onTimeout;
    this.onCircuitBreakerTripped = config.onCircuitBreakerTripped;
  }

  public startCycle(cycleIndex: number, target?: string, category?: string): void {
    if (this.tripped) {
      throw new Error(
        `[WATCHDOG CIRCUIT BREAKER] Cannot start cycle ${cycleIndex}: Watchdog has tripped due to repeated failures.`
      );
    }

    this.activeCycleIndex = cycleIndex;
    this.cycleStartTime = Date.now();
    this.armTimeout();
    this.persistHeartbeat('healthy', target, category);
  }

  public recordSuccess(cycleIndex: number, target?: string, category?: string): void {
    this.disarmTimeout();
    this.consecutiveFailures = 0;
    this.persistHeartbeat('healthy', target, category);
  }

  public recordFailure(
    cycleIndex: number,
    error: string,
    target?: string,
    category?: string
  ): void {
    this.disarmTimeout();
    this.consecutiveFailures += 1;

    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.tripped = true;
      const reason = `Consecutive failure threshold exceeded (${this.consecutiveFailures}/${this.maxConsecutiveFailures}). Last error: ${error}`;
      this.persistHeartbeat('tripped', target, category);
      if (this.onCircuitBreakerTripped) {
        this.onCircuitBreakerTripped(this.consecutiveFailures, reason);
      }
      throw new Error(`[WATCHDOG CIRCUIT BREAKER TRIPPED] ${reason}`);
    }

    this.persistHeartbeat('warning', target, category);
  }

  public isTripped(): boolean {
    return this.tripped;
  }

  public getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  public stop(): void {
    this.disarmTimeout();
  }

  private armTimeout(): void {
    this.disarmTimeout();
    this.timer = setTimeout(() => {
      const elapsed = Date.now() - this.cycleStartTime;
      this.tripped = true;
      this.persistHeartbeat('timed-out');
      if (this.onTimeout) {
        this.onTimeout(this.activeCycleIndex, elapsed);
      }
    }, this.cycleTimeoutMs);

    // Allow process to exit cleanly if timer is running
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  private disarmTimeout(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private persistHeartbeat(
    status: WatchdogHeartbeat['status'],
    target?: string,
    category?: string
  ): void {
    try {
      const dir = path.dirname(this.heartbeatPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const mem = process.memoryUsage();
      const heartbeat: WatchdogHeartbeat = {
        timestamp: new Date().toISOString(),
        cycleIndex: this.activeCycleIndex,
        lastTarget: target,
        lastCategory: category,
        status,
        consecutiveFailures: this.consecutiveFailures,
        memoryUsageMb: Math.round((mem.heapUsed / (1024 * 1024)) * 10) / 10,
        uptimeSeconds: Math.round((Date.now() - this.loopStartTime) / 1000),
      };

      fs.writeFileSync(this.heartbeatPath, JSON.stringify(heartbeat, null, 2), 'utf-8');
    } catch {
      // Do not crash on heartbeat write failure
    }
  }
}
