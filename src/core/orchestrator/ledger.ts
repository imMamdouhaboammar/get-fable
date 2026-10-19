/**
 * Sentinel Tamper-Evident Hash-Chained Audit Ledger for Fable Orchestrator.
 *
 * Grounded in Sentinel (agentic-systems-lab) auditability:
 * - Every orchestration decision and tool invocation is sealed with SHA-256
 * - Chained to previous hash creating a tamper-evident blockchain-style ledger
 * - Tool cassettes recorded for deterministic replay and divergence localization
 * - Streamable via gRPC StreamEvents or CLI audit
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { DecisionAuditRecord } from './types.js';

export interface LedgerOptions {
  inMemoryOnly?: boolean;
  storagePath?: string;
}

export interface VerificationResult {
  valid: boolean;
  recordCount: number;
  brokenIndex?: number;
  error?: string;
}

export class SentinelLedger {
  private records: DecisionAuditRecord[] = [];
  private inMemoryOnly: boolean;
  private storagePath: string;

  constructor(options: LedgerOptions = {}) {
    this.inMemoryOnly = options.inMemoryOnly ?? false;
    this.storagePath =
      options.storagePath ||
      path.join(process.cwd(), '.fable', 'audit-ledger.jsonl');

    if (!this.inMemoryOnly && fs.existsSync(this.storagePath)) {
      this.load();
    }
  }

  public computeHash(
    recordId: string,
    parentHash: string,
    timestamp: string,
    eventType: string,
    actorId: string,
    payload: Record<string, unknown>
  ): string {
    const payloadStr = JSON.stringify(payload, Object.keys(payload).sort());
    const raw = `${recordId}:${parentHash}:${timestamp}:${eventType}:${actorId}:${payloadStr}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  public append(
    eventType: DecisionAuditRecord['eventType'],
    actorId: string,
    payload: Record<string, unknown>
  ): DecisionAuditRecord {
    const recordId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date().toISOString();
    const parentHash =
      this.records.length > 0
        ? this.records[this.records.length - 1].recordHash
        : '0'.repeat(64);

    const recordHash = this.computeHash(
      recordId,
      parentHash,
      timestamp,
      eventType,
      actorId,
      payload
    );

    const record: DecisionAuditRecord = {
      recordId,
      parentHash,
      timestamp,
      eventType,
      actorId,
      payload,
      recordHash,
    };

    this.records.push(record);

    if (!this.inMemoryOnly) {
      this.persistRecord(record);
    }

    return record;
  }

  public captureCassette(
    turnId: string,
    toolCalls: Array<{ name: string; args: Record<string, unknown>; resultHash?: string }>
  ): DecisionAuditRecord {
    return this.append('worker_dispatched', 'cassette-recorder', {
      turnId,
      cassette: toolCalls,
      recordedAt: new Date().toISOString(),
    });
  }

  public verifyChain(): VerificationResult {
    if (this.records.length === 0) {
      return { valid: true, recordCount: 0 };
    }

    let expectedParent = '0'.repeat(64);

    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i];

      // Check link
      if (record.parentHash !== expectedParent) {
        return {
          valid: false,
          recordCount: this.records.length,
          brokenIndex: i,
          error: `Broken hash chain link at record #${i}: expected parent ${expectedParent}, got ${record.parentHash}`,
        };
      }

      // Check hash
      const recalculated = this.computeHash(
        record.recordId,
        record.parentHash,
        record.timestamp,
        record.eventType,
        record.actorId,
        record.payload
      );

      if (recalculated !== record.recordHash) {
        return {
          valid: false,
          recordCount: this.records.length,
          brokenIndex: i,
          error: `Hash mismatch at record #${i}: stored ${record.recordHash}, recalculated ${recalculated}`,
        };
      }

      expectedParent = record.recordHash;
    }

    return { valid: true, recordCount: this.records.length };
  }

  public getRecords(limit?: number): DecisionAuditRecord[] {
    if (!limit || limit >= this.records.length) {
      return [...this.records];
    }
    return this.records.slice(-limit);
  }

  public getRawRecords(): DecisionAuditRecord[] {
    return this.records;
  }

  public getLatestHash(): string {
    return this.records.length > 0
      ? this.records[this.records.length - 1].recordHash
      : '0'.repeat(64);
  }

  private persistRecord(record: DecisionAuditRecord): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(this.storagePath, JSON.stringify(record) + '\n', 'utf8');
    } catch (err) {
      console.warn(`[Ledger] Failed to append record: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  public load(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const lines = fs.readFileSync(this.storagePath, 'utf8').split('\n');
        this.records = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            this.records.push(JSON.parse(trimmed));
          }
        }
      }
    } catch (err) {
      console.warn(`[Ledger] Failed to load records: ${err instanceof Error ? err.message : String(err)}`);
      this.records = [];
    }
  }

  public clear(): void {
    this.records = [];
    if (!this.inMemoryOnly && fs.existsSync(this.storagePath)) {
      try {
        fs.unlinkSync(this.storagePath);
      } catch (err) {
        console.warn(`[Ledger] Failed to unlink storage: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}
