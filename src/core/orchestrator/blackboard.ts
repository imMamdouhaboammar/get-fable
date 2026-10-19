/**
 * Meridian Horizontal Blackboard for Fable Orchestrator.
 *
 * Grounded in Meridian (agentic-systems-lab) peer-coordination:
 * - Direct peer artifact exchange via propose / request / commit
 * - Prevents vertical escalation bottlenecks to the master orchestrator
 * - TTL-based expiration and task isolation
 */

import fs from 'node:fs';
import path from 'node:path';
import type { BlackboardArtifact } from './types.js';

export interface ProposeOptions<T = unknown> {
  taskId: string;
  workerId: string;
  artifactType: string;
  payload: T;
  ttlSeconds?: number;
}

export interface BlackboardOptions {
  inMemoryOnly?: boolean;
  storagePath?: string;
}

export class HorizontalBlackboard {
  private artifacts: Map<string, BlackboardArtifact> = new Map();
  private inMemoryOnly: boolean;
  private storagePath: string;

  constructor(options: BlackboardOptions = {}) {
    this.inMemoryOnly = options.inMemoryOnly ?? false;
    this.storagePath =
      options.storagePath ||
      path.join(process.cwd(), '.fable', 'blackboard.json');

    if (!this.inMemoryOnly && fs.existsSync(this.storagePath)) {
      this.load();
    }
  }

  public propose<T = unknown>(options: ProposeOptions<T>): BlackboardArtifact<T> {
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const artifactId = `art-${Date.now()}-${randomSuffix}`;
    const ttlSeconds = options.ttlSeconds !== undefined ? options.ttlSeconds : 300;

    const artifact: BlackboardArtifact<T> = {
      artifactId,
      taskId: options.taskId,
      workerId: options.workerId,
      artifactType: options.artifactType,
      payload: options.payload,
      timestamp: new Date().toISOString(),
      ttlSeconds,
      status: 'proposed',
    };

    this.artifacts.set(artifactId, artifact as unknown as BlackboardArtifact);

    if (!this.inMemoryOnly) {
      this.save();
    }

    return artifact;
  }

  public query(taskId: string, artifactType?: string): BlackboardArtifact[] {
    this.pruneExpired();

    const matches: BlackboardArtifact[] = [];
    for (const art of this.artifacts.values()) {
      if (art.taskId === taskId) {
        if (!artifactType || art.artifactType === artifactType) {
          if (art.status !== 'rejected' && art.status !== 'expired') {
            matches.push(art);
          }
        }
      }
    }

    return matches.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public get(artifactId: string): BlackboardArtifact | undefined {
    return this.artifacts.get(artifactId);
  }

  public commit(taskId: string, artifactId: string, actorId: string): BlackboardArtifact {
    const art = this.artifacts.get(artifactId);
    if (!art || art.taskId !== taskId) {
      throw new Error(`Artifact ${artifactId} not found in task ${taskId}`);
    }

    art.status = 'committed';
    if (!this.inMemoryOnly) {
      this.save();
    }
    return art;
  }

  public reject(taskId: string, artifactId: string, reason: string): BlackboardArtifact {
    const art = this.artifacts.get(artifactId);
    if (!art || art.taskId !== taskId) {
      throw new Error(`Artifact ${artifactId} not found in task ${taskId}`);
    }

    art.status = 'rejected';
    (art as unknown as { rejectionReason?: string }).rejectionReason = reason;

    if (!this.inMemoryOnly) {
      this.save();
    }
    return art;
  }

  public pruneExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [id, art] of this.artifacts.entries()) {
      const createdTime = new Date(art.timestamp).getTime();
      const expiresAt = createdTime + art.ttlSeconds * 1000;
      if (now > expiresAt) {
        art.status = 'expired';
        count++;
      }
    }

    return count;
  }

  public count(taskId?: string): number {
    if (!taskId) return this.artifacts.size;
    let c = 0;
    for (const art of this.artifacts.values()) {
      if (art.taskId === taskId && art.status !== 'expired' && art.status !== 'rejected') {
        c++;
      }
    }
    return c;
  }

  public clear(taskId?: string): void {
    if (!taskId) {
      this.artifacts.clear();
    } else {
      for (const [id, art] of this.artifacts.entries()) {
        if (art.taskId === taskId) {
          this.artifacts.delete(id);
        }
      }
    }
    if (!this.inMemoryOnly) {
      this.save();
    }
  }

  public load(): void {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const list: BlackboardArtifact[] = JSON.parse(raw);
        this.artifacts.clear();
        for (const item of list) {
          this.artifacts.set(item.artifactId, item);
        }
      }
    } catch {
      this.artifacts.clear();
    }
  }

  public save(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const list = Array.from(this.artifacts.values());
      fs.writeFileSync(this.storagePath, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.warn(`[Blackboard] Failed to persist artifacts: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
