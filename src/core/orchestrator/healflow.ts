/**
 * HealFlow Causal Recovery Engine for Fable Orchestrator.
 *
 * Grounded in HealFlow (agentic-systems-lab):
 * - Causal failure diagnosis across error traces, ASTs, and git diffs
 * - Prescribes smallest viable repair: in_lane_patch vs compensating_rollback vs re_route
 * - Persistent repair memory reusing validated recovery patterns
 */

import fs from 'node:fs';
import path from 'node:path';
import type { HealDiagnosis } from './types.js';

export interface RepairMemoryEntry {
  action: string;
  successRate: number;
  lastUpdated: string;
}

export interface HealFlowOptions {
  inMemoryOnly?: boolean;
  storagePath?: string;
}

export class HealFlowEngine {
  private repairMemory: Map<string, RepairMemoryEntry> = new Map();
  private inMemoryOnly: boolean;
  private storagePath: string;

  constructor(options: HealFlowOptions = {}) {
    this.inMemoryOnly = options.inMemoryOnly ?? false;
    this.storagePath =
      options.storagePath ||
      path.join(process.cwd(), '.fable', 'repair-memory.json');

    if (!this.inMemoryOnly && fs.existsSync(this.storagePath)) {
      this.load();
    }
  }

  public diagnose(
    taskId: string,
    errorTrace: string,
    mutatedFiles: string[],
    options: { severeCascade?: boolean; activeLane?: string } = {}
  ): HealDiagnosis {
    const diagnosisId = `diag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const lower = errorTrace.toLowerCase();

    // Check for severe cascading or database corruptions
    if (options.severeCascade || lower.includes('fatal:') || lower.includes('unrecoverable')) {
      return {
        diagnosisId,
        taskId,
        rootCause: 'Severe cascading corruption or lock deadlock',
        affectedComponents: [...mutatedFiles],
        smallestViableRepair: {
          strategy: 'compensating_rollback',
          remedialInstructions: 'Revert uncommitted mutations to last verified checkpoint commit.',
        },
        rollbackCheckpoint: 'HEAD',
        confidence: 0.95,
      };
    }

    // Check for Type/Compilation mismatch
    if (lower.includes('error ts') || lower.includes('syntaxerror') || lower.includes('cannot find name')) {
      return {
        diagnosisId,
        taskId,
        rootCause: 'Type/Compilation mismatch in mutated sources',
        affectedComponents: [...mutatedFiles],
        smallestViableRepair: {
          strategy: 'in_lane_patch',
          targetWorker: options.activeLane,
          remedialInstructions: 'Repair syntax or exported interface signatures directly in lane.',
        },
        confidence: 0.88,
      };
    }

    // Check for Assertion failures
    if (lower.includes('assertionerror') || lower.includes('expected') || lower.includes('fail')) {
      return {
        diagnosisId,
        taskId,
        rootCause: 'Assertion failure in test suite contract',
        affectedComponents: [...mutatedFiles],
        smallestViableRepair: {
          strategy: 'in_lane_patch',
          targetWorker: options.activeLane,
          remedialInstructions: 'Refine implementation logic to satisfy asserted contract behavior.',
        },
        confidence: 0.85,
      };
    }

    // Default fallback: re-route to recovery specialist
    return {
      diagnosisId,
      taskId,
      rootCause: 'Unclassified runtime anomaly',
      affectedComponents: [...mutatedFiles],
      smallestViableRepair: {
        strategy: 're_route',
        remedialInstructions: 'Re-route to fable-recover for harness diagnostic protocol.',
      },
      confidence: 0.7,
    };
  }

  public recordRepairMemory(
    pattern: string,
    entry: Omit<RepairMemoryEntry, 'lastUpdated'>
  ): void {
    this.repairMemory.set(pattern, {
      ...entry,
      lastUpdated: new Date().toISOString(),
    });

    if (!this.inMemoryOnly) {
      this.save();
    }
  }

  public queryRepairMemory(pattern: string): RepairMemoryEntry | undefined {
    // Direct match
    if (this.repairMemory.has(pattern)) {
      return this.repairMemory.get(pattern);
    }

    // Substring match
    for (const [key, val] of this.repairMemory.entries()) {
      if (pattern.includes(key) || key.includes(pattern)) {
        return val;
      }
    }

    return undefined;
  }

  public load(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const obj = JSON.parse(raw);
        this.repairMemory.clear();
        for (const [k, v] of Object.entries(obj)) {
          this.repairMemory.set(k, v as RepairMemoryEntry);
        }
      }
    } catch {
      this.repairMemory.clear();
    }
  }

  public save(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const obj = Object.fromEntries(this.repairMemory.entries());
      fs.writeFileSync(this.storagePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.warn(`[HealFlow] Failed to persist repair memory: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
