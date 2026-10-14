import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { FableSkillId } from '../types.js';
import type { ReflexMode, ReflexProviderId } from './types.js';

export interface ReflexEventV1 {
  schemaVersion: 1;
  timestamp: string;
  taskHash: string;
  taskLength: number;
  mode: ReflexMode;
  provider: ReflexProviderId;
  model: string;
  deterministicSkill: FableSkillId;
  reflexSkill: FableSkillId | null;
  fusedSkill: FableSkillId;
  confidence: number | null;
  margin: number | null;
  latencyMs: number;
  usage?: { inputTokens?: number; outputTokens?: number };
  fallbackReason?: string;
}

export const MAX_REFLEX_LEDGER_LINES = 5000;

export function hashTaskText(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Returns the reflex directory path, ensuring real filesystem boundaries.
 */
export function getReflexDir(repoRoot: string = process.cwd()): string {
  const fableDir = path.join(repoRoot, '.fable');
  if (fs.existsSync(fableDir)) {
    const stat = fs.lstatSync(fableDir);
    if (stat.isSymbolicLink()) {
      throw new Error('Reflex security violation: .fable directory must not be a symlink');
    }
  }

  const reflexDir = path.join(fableDir, 'reflex');
  if (fs.existsSync(reflexDir)) {
    const stat = fs.lstatSync(reflexDir);
    if (stat.isSymbolicLink()) {
      throw new Error('Reflex security violation: .fable/reflex directory must not be a symlink');
    }
  }

  return reflexDir;
}

/**
 * Appends a reflex event to .fable/reflex/events.jsonl fail-softly.
 */
export function appendReflexEvent(event: ReflexEventV1, repoRoot: string = process.cwd()): void {
  try {
    const reflexDir = getReflexDir(repoRoot);
    if (!fs.existsSync(reflexDir)) {
      fs.mkdirSync(reflexDir, { recursive: true });
    }

    const eventsFile = path.join(reflexDir, 'events.jsonl');
    if (fs.existsSync(eventsFile)) {
      const stat = fs.lstatSync(eventsFile);
      if (stat.isSymbolicLink() || !stat.isFile()) {
        return; // Refuse to write to unsafe file targets
      }
    }

    const line = JSON.stringify(event) + '\n';
    fs.appendFileSync(eventsFile, line, 'utf8');

    // Bounded rotation check
    rotateLedgerIfNecessary(eventsFile);
  } catch {
    // Ledger write failures must never crash or block routing
  }
}

/**
 * Reads the most recent reflex events from .fable/reflex/events.jsonl.
 */
export function readReflexEvents(
  options?: { limit?: number; repoRoot?: string }
): ReflexEventV1[] {
  const limit = options?.limit ?? 100;
  const repoRoot = options?.repoRoot || process.cwd();

  try {
    const reflexDir = getReflexDir(repoRoot);
    const eventsFile = path.join(reflexDir, 'events.jsonl');

    if (!fs.existsSync(eventsFile)) {
      return [];
    }

    const stat = fs.lstatSync(eventsFile);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      return [];
    }

    const content = fs.readFileSync(eventsFile, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    const events: ReflexEventV1[] = [];

    for (let i = lines.length - 1; i >= 0 && events.length < limit; i--) {
      try {
        const parsed = JSON.parse(lines[i]);
        if (parsed.schemaVersion === 1) {
          events.push(parsed as ReflexEventV1);
        }
      } catch {
        // Skip malformed lines gracefully
      }
    }

    return events;
  } catch {
    return [];
  }
}

function rotateLedgerIfNecessary(eventsFile: string): void {
  try {
    const stat = fs.statSync(eventsFile);
    // Rotate if larger than 5MB
    if (stat.size > 5 * 1024 * 1024) {
      const content = fs.readFileSync(eventsFile, 'utf8');
      const lines = content.trim().split('\n');
      if (lines.length > MAX_REFLEX_LEDGER_LINES) {
        const truncated = lines.slice(-Math.floor(MAX_REFLEX_LEDGER_LINES / 2)).join('\n') + '\n';
        fs.writeFileSync(eventsFile, truncated, 'utf8');
      }
    }
  } catch {
    // Rotation failure is non-blocking
  }
}
