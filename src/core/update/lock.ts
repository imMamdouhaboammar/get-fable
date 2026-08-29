import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { InstallationMethod } from './types.js';

export type ProcessLiveness = 'alive' | 'dead' | 'unknown';

export interface UpdateLockRecord {
  schemaVersion: 1;
  token: string;
  pid: number;
  acquiredAt: string;
  targetVersion: string;
  installationMethod: InstallationMethod;
}

export interface LockDeps {
  now: () => Date;
  pid: number;
  token: () => string;
  isProcessAlive: (pid: number) => ProcessLiveness;
}

export interface LockHandle {
  path: string;
  token: string;
  record: UpdateLockRecord;
}

const INSTALLATION_METHODS: InstallationMethod[] = [
  'bun-global',
  'npm-global',
  'homebrew',
  'git-checkout',
  'unknown',
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseLockRecord(value: unknown): UpdateLockRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Update lock record is malformed');
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== 1) throw new Error('Update lock schema is unsupported');
  if (!isNonEmptyString(candidate.token)) throw new Error('Update lock token is invalid');
  if (!Number.isInteger(candidate.pid) || Number(candidate.pid) <= 0) {
    throw new Error('Update lock pid is invalid');
  }
  if (!isNonEmptyString(candidate.acquiredAt) || !Number.isFinite(Date.parse(candidate.acquiredAt))) {
    throw new Error('Update lock acquiredAt is invalid');
  }
  if (!isNonEmptyString(candidate.targetVersion)) throw new Error('Update lock targetVersion is invalid');
  if (
    typeof candidate.installationMethod !== 'string' ||
    !INSTALLATION_METHODS.includes(candidate.installationMethod as InstallationMethod)
  ) {
    throw new Error('Update lock installationMethod is invalid');
  }

  return candidate as unknown as UpdateLockRecord;
}

function readLockRecord(filePath: string): UpdateLockRecord {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parseLockRecord(JSON.parse(raw) as unknown);
}

function writeExclusive(filePath: string, record: UpdateLockRecord): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const fd = fs.openSync(filePath, 'wx', 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(record), 'utf-8');
  } finally {
    fs.closeSync(fd);
  }
}

export function defaultProcessLiveness(pid: number): ProcessLiveness {
  try {
    process.kill(pid, 0);
    return 'alive';
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') return 'dead';
    return 'unknown';
  }
}

export function defaultLockDeps(): LockDeps {
  return {
    now: () => new Date(),
    pid: process.pid,
    token: () => randomUUID(),
    isProcessAlive: defaultProcessLiveness,
  };
}

function createOwnedLock(
  filePath: string,
  targetVersion: string,
  installationMethod: InstallationMethod,
  deps: LockDeps
): LockHandle {
  const token = deps.token();
  if (!isNonEmptyString(token)) throw new Error('Update lock token generator returned an invalid token');

  const record: UpdateLockRecord = {
    schemaVersion: 1,
    token,
    pid: deps.pid,
    acquiredAt: deps.now().toISOString(),
    targetVersion,
    installationMethod,
  };

  writeExclusive(filePath, record);
  return { path: filePath, token, record };
}

export function acquireUpdateLock(
  filePath: string,
  targetVersion: string,
  installationMethod: InstallationMethod,
  deps: LockDeps = defaultLockDeps()
): LockHandle {
  try {
    return createOwnedLock(filePath, targetVersion, installationMethod, deps);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }

  const existing = readLockRecord(filePath);
  const liveness = deps.isProcessAlive(existing.pid);

  if (liveness === 'alive') {
    throw new Error(`Update lock is owned by live process ${existing.pid}`);
  }
  if (liveness === 'unknown') {
    throw new Error(`Update lock owner liveness is unknown for process ${existing.pid}`);
  }

  const current = readLockRecord(filePath);
  if (current.token !== existing.token || current.pid !== existing.pid) {
    throw new Error('Update lock changed while dead-owner reclaim was being evaluated');
  }

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  try {
    return createOwnedLock(filePath, targetVersion, installationMethod, deps);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error('Update lock was acquired by another owner during reclaim');
    }
    throw error;
  }
}

export function releaseUpdateLock(handle: LockHandle): void {
  let current: UpdateLockRecord;
  try {
    current = readLockRecord(handle.path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    return;
  }

  if (current.token !== handle.token) return;

  try {
    fs.unlinkSync(handle.path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
